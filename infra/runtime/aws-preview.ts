import { DescribeNetworkInterfacesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeregisterTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListTaskDefinitionsCommand,
  ListTasksCommand,
  ListTagsForResourceCommand,
  RegisterTaskDefinitionCommand,
  RunTaskCommand,
  StopTaskCommand,
  waitUntilTasksRunning,
  waitUntilTasksStopped,
  type ContainerDefinition,
} from '@aws-sdk/client-ecs';
import { ChangeResourceRecordSetsCommand, Route53Client } from '@aws-sdk/client-route-53';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

import type { LifecycleStateStore, PreviewEffectProvider } from './controller.js';
import type { PreviewCompose } from './compose.js';
import {
  lifecycleStateSchema,
  type LifecycleEffect,
  type LifecycleState,
  type PreviewOwnership,
} from './protocol.js';

const receiptSchema = z
  .object({
    recordType: z.literal('generation'),
    repositoryId: z.string().min(1),
    pullRequestNumber: z.number().int().positive(),
    generation: z.string().min(1),
    taskArn: z.string(),
    taskDefinitionArn: z.string(),
    recordName: z.string().min(1),
    publicIp: z.string(),
    status: z.enum(['launching', 'healthy', 'cleaned']),
    expiresAt: z.number().int().positive(),
  })
  .strict();

type GenerationReceipt = z.infer<typeof receiptSchema>;

export interface AwsPreviewConfig {
  readonly region: string;
  readonly clusterArn: string;
  readonly subnetIds: readonly string[];
  readonly securityGroupId: string;
  readonly taskExecutionRoleArn: string;
  readonly taskRoleArn: string;
  readonly logGroupName: string;
  readonly stateTableName: string;
  readonly previewZoneId: string;
  readonly previewZoneName: string;
  readonly compose?: PreviewCompose;
  readonly routerImage?: string;
  readonly backendImage?: string;
  readonly frontendImage?: string;
}

interface AwsPreviewClients {
  readonly database: DynamoDBDocumentClient;
  readonly ecs: ECSClient;
  readonly ec2: EC2Client;
  readonly route53: Route53Client;
}

function stateKey(repositoryId: string, pullRequestNumber: number): string {
  return `state#${repositoryId}#${String(pullRequestNumber)}`;
}

function receiptKey(ownership: PreviewOwnership): string {
  return `generation#${ownership.repositoryId}#${String(ownership.pullRequestNumber)}#${ownership.generation}`;
}

function empty(value: string | undefined, name: string): string {
  if (value === undefined || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function taskDefinitionFamily(ownership: PreviewOwnership): string {
  return `preview-pr-${String(ownership.pullRequestNumber)}-${ownership.generation}`
    .replaceAll(/[^A-Za-z0-9_-]/g, '-')
    .slice(0, 255);
}

export function assertReceiptOwnership(
  receipt: GenerationReceipt,
  ownership: PreviewOwnership,
): void {
  if (
    receipt.repositoryId !== ownership.repositoryId ||
    receipt.pullRequestNumber !== ownership.pullRequestNumber ||
    receipt.generation !== ownership.generation
  ) {
    throw new Error('preview resource ownership does not match the requested generation');
  }
}

export function isObsoleteDnsDelete(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'InvalidChangeBatch' &&
    'message' in error &&
    typeof error.message === 'string' &&
    (error.message.includes('not found') ||
      error.message.includes('values provided do not match the current values'))
  );
}

export class DynamoLifecycleStateStore implements LifecycleStateStore {
  public constructor(
    private readonly database: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  public async load(
    repositoryId: string,
    pullRequestNumber: number,
  ): Promise<LifecycleState | null> {
    const response = await this.database.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { previewKey: stateKey(repositoryId, pullRequestNumber) },
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    return lifecycleStateSchema.parse(JSON.parse(String(response.Item.stateJson)));
  }

  public async compareAndSwap(
    next: LifecycleState,
    expectedStateRevision: number | null,
  ): Promise<'stored' | 'conflict'> {
    const item: Record<string, unknown> = {
      previewKey: stateKey(next.identity.repositoryId, next.identity.pullRequestNumber),
      recordType: 'state',
      repositoryId: next.identity.repositoryId,
      pullRequestNumber: next.identity.pullRequestNumber,
      stateRevision: next.stateRevision,
      stateJson: JSON.stringify(next),
    };
    if (next.closed && next.active === null && next.retiring === null) {
      item.expiresAt = Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60;
    }
    try {
      await this.database.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression:
            expectedStateRevision === null
              ? 'attribute_not_exists(previewKey)'
              : 'stateRevision = :expected',
          ...(expectedStateRevision === null
            ? {}
            : { ExpressionAttributeValues: { ':expected': expectedStateRevision } }),
        }),
      );
      return 'stored';
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        return 'conflict';
      }
      throw error;
    }
  }

  public async *list(): AsyncIterable<LifecycleState> {
    let startKey: Record<string, unknown> | undefined;
    do {
      const response = await this.database.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'recordType = :state',
          ExpressionAttributeValues: { ':state': 'state' },
          ...(startKey === undefined ? {} : { ExclusiveStartKey: startKey }),
        }),
      );
      for (const item of response.Items ?? []) {
        yield lifecycleStateSchema.parse(JSON.parse(String(item.stateJson)));
      }
      startKey = response.LastEvaluatedKey;
    } while (startKey !== undefined);
  }
}

export class AwsPreviewEffectProvider implements PreviewEffectProvider {
  public constructor(
    private readonly clients: AwsPreviewClients,
    private readonly config: AwsPreviewConfig,
  ) {}

  public async ensurePreview(
    effect: Extract<LifecycleEffect, { type: 'ensure-preview' }>,
  ): Promise<void> {
    const existing = await this.receipt(effect.ownership);
    if (existing !== null) {
      assertReceiptOwnership(existing, effect.ownership);
      if (existing.status === 'cleaned') {
        throw new Error('cannot ensure a cleaned generation');
      }
      if (
        existing.publicIp === '' ||
        existing.taskArn === '' ||
        existing.taskDefinitionArn === ''
      ) {
        throw new Error('incomplete launch receipt awaits deadline cleanup');
      }
      await this.waitForHealth(existing.recordName);
      if (existing.status === 'launching') await this.markHealthy(effect.ownership, existing);
      return;
    }
    const backendImage = empty(this.config.backendImage, 'backendImage');
    const frontendImage = empty(this.config.frontendImage, 'frontendImage');
    const routerImage = empty(this.config.routerImage, 'routerImage');
    const compose = this.config.compose;
    if (compose === undefined)
      throw new Error('compiled Compose contract is required for admission');
    const containers = this.containers(
      backendImage,
      frontendImage,
      routerImage,
      compose,
      effect.ownership,
    );
    const family = taskDefinitionFamily(effect.ownership);
    const recordName = `pr-${String(effect.ownership.pullRequestNumber)}.${this.config.previewZoneName}`;
    const receipt: GenerationReceipt = {
      recordType: 'generation',
      ...effect.ownership,
      taskArn: '',
      taskDefinitionArn: '',
      recordName,
      publicIp: '',
      status: 'launching',
      expiresAt: Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60,
    };
    await this.clients.database.send(
      new PutCommand({
        TableName: this.config.stateTableName,
        Item: { previewKey: receiptKey(effect.ownership), ...receipt },
        ConditionExpression: 'attribute_not_exists(previewKey)',
      }),
    );
    const definition = await this.clients.ecs.send(
      new RegisterTaskDefinitionCommand({
        family,
        networkMode: 'awsvpc',
        requiresCompatibilities: ['FARGATE'],
        cpu: String(compose.cpu),
        memory: String(compose.memoryMiB),
        executionRoleArn: this.config.taskExecutionRoleArn,
        taskRoleArn: this.config.taskRoleArn,
        containerDefinitions: containers,
        tags: [
          { key: 'fullstack:repository-id', value: effect.ownership.repositoryId },
          { key: 'fullstack:pull-request', value: String(effect.ownership.pullRequestNumber) },
          { key: 'fullstack:generation', value: effect.ownership.generation },
        ],
      }),
    );
    const taskDefinitionArn = empty(
      definition.taskDefinition?.taskDefinitionArn,
      'registered task definition ARN',
    );
    await this.updateReceiptResource(effect.ownership, 'taskDefinitionArn', taskDefinitionArn);
    const run = await this.clients.ecs.send(
      new RunTaskCommand({
        cluster: this.config.clusterArn,
        taskDefinition: taskDefinitionArn,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            assignPublicIp: 'ENABLED',
            subnets: [...this.config.subnetIds],
            securityGroups: [this.config.securityGroupId],
          },
        },
        tags: [
          { key: 'fullstack:repository-id', value: effect.ownership.repositoryId },
          { key: 'fullstack:pull-request', value: String(effect.ownership.pullRequestNumber) },
          { key: 'fullstack:generation', value: effect.ownership.generation },
        ],
      }),
    );
    const taskArn = empty(run.tasks?.[0]?.taskArn, 'started task ARN');
    await this.updateReceiptResource(effect.ownership, 'taskArn', taskArn);
    await waitUntilTasksRunning(
      { client: this.clients.ecs, maxWaitTime: 600 },
      { cluster: this.config.clusterArn, tasks: [taskArn] },
    );
    const task = await this.clients.ecs.send(
      new DescribeTasksCommand({ cluster: this.config.clusterArn, tasks: [taskArn] }),
    );
    const networkInterfaceId = task.tasks?.[0]?.attachments
      ?.flatMap((attachment) => attachment.details ?? [])
      .find((detail) => detail.name === 'networkInterfaceId')?.value;
    const eni = await this.clients.ec2.send(
      new DescribeNetworkInterfacesCommand({
        NetworkInterfaceIds: [empty(networkInterfaceId, 'task network interface')],
      }),
    );
    const publicIp = empty(
      eni.NetworkInterfaces?.[0]?.Association?.PublicIp,
      'task public IP address',
    );
    await this.updateReceiptResource(effect.ownership, 'publicIp', publicIp);
    await this.changeDns('UPSERT', { ...receipt, taskArn, taskDefinitionArn, publicIp });
    await this.waitForHealth(recordName);
    await this.markHealthy(effect.ownership, { ...receipt, taskArn, taskDefinitionArn, publicIp });
  }

  public async cleanupPreview(
    effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }>,
  ): Promise<void> {
    const receipt = await this.receipt(effect.ownership);
    if (receipt === null) return;
    assertReceiptOwnership(receipt, effect.ownership);
    if (receipt.status === 'cleaned') return;
    const taskArns =
      receipt.taskArn === '' ? await this.discoverTasks(effect.ownership) : [receipt.taskArn];
    for (const taskArn of taskArns) {
      const described = await this.clients.ecs.send(
        new DescribeTasksCommand({
          cluster: this.config.clusterArn,
          tasks: [taskArn],
        }),
      );
      const task = described.tasks?.[0];
      if (task === undefined) continue;
      await this.assertResourceTags(taskArn, effect.ownership);
    }
    if (receipt.publicIp !== '') await this.changeDns('DELETE', receipt);
    for (const taskArn of taskArns) {
      const described = await this.clients.ecs.send(
        new DescribeTasksCommand({
          cluster: this.config.clusterArn,
          tasks: [taskArn],
        }),
      );
      const task = described.tasks?.[0];
      if (task !== undefined && task.lastStatus !== 'STOPPED') {
        await this.clients.ecs.send(
          new StopTaskCommand({
            cluster: this.config.clusterArn,
            task: taskArn,
            reason: effect.reason,
          }),
        );
        await waitUntilTasksStopped(
          { client: this.clients.ecs, maxWaitTime: 600 },
          { cluster: this.config.clusterArn, tasks: [taskArn] },
        );
      }
    }
    const definitionArns =
      receipt.taskDefinitionArn === ''
        ? await this.discoverTaskDefinitions(effect.ownership)
        : [receipt.taskDefinitionArn];
    for (const taskDefinitionArn of definitionArns) {
      if (
        !taskDefinitionArn.includes(`:task-definition/${taskDefinitionFamily(effect.ownership)}:`)
      ) {
        throw new Error('task definition family does not match cleanup generation');
      }
      if (receipt.taskDefinitionArn === '')
        await this.assertResourceTags(taskDefinitionArn, effect.ownership);
      await this.deregisterTaskDefinition(taskDefinitionArn);
    }
    await this.clients.database.send(
      new UpdateCommand({
        TableName: this.config.stateTableName,
        Key: { previewKey: receiptKey(effect.ownership) },
        UpdateExpression: 'SET #status = :cleaned, expiresAt = :expiresAt',
        ConditionExpression:
          'recordType = :recordType AND repositoryId = :repositoryId AND pullRequestNumber = :pullRequestNumber AND generation = :generation',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':recordType': 'generation',
          ':repositoryId': effect.ownership.repositoryId,
          ':pullRequestNumber': effect.ownership.pullRequestNumber,
          ':generation': effect.ownership.generation,
          ':cleaned': 'cleaned',
          ':expiresAt': Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60,
        },
      }),
    );
  }

  public async getPreviewUrl(ownership: PreviewOwnership): Promise<string | null> {
    const receipt = await this.receipt(ownership);
    if (receipt === null) return null;
    assertReceiptOwnership(receipt, ownership);
    if (receipt.status === 'cleaned') return null;
    return `https://${receipt.recordName}`;
  }

  private async deregisterTaskDefinition(taskDefinitionArn: string): Promise<void> {
    try {
      await this.clients.ecs.send(
        new DeregisterTaskDefinitionCommand({ taskDefinition: taskDefinitionArn }),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'ClientException' &&
        'message' in error &&
        typeof error.message === 'string' &&
        /already inactive|does not exist|not found/i.test(error.message)
      ) {
        return;
      }
      throw error;
    }
  }

  private async discoverTasks(ownership: PreviewOwnership): Promise<string[]> {
    const family = taskDefinitionFamily(ownership);
    const results = await Promise.all(
      (['RUNNING', 'PENDING'] as const).map(async (desiredStatus) =>
        this.clients.ecs.send(
          new ListTasksCommand({
            cluster: this.config.clusterArn,
            family,
            desiredStatus,
            maxResults: 100,
          }),
        ),
      ),
    );
    return [...new Set(results.flatMap((result) => result.taskArns ?? []))];
  }

  private async discoverTaskDefinitions(ownership: PreviewOwnership): Promise<string[]> {
    const family = taskDefinitionFamily(ownership);
    const response = await this.clients.ecs.send(
      new ListTaskDefinitionsCommand({
        familyPrefix: family,
        status: 'ACTIVE',
        maxResults: 100,
      }),
    );
    return (response.taskDefinitionArns ?? []).filter((arn) =>
      arn.includes(`:task-definition/${family}:`),
    );
  }

  private async assertResourceTags(
    resourceArn: string,
    ownership: PreviewOwnership,
  ): Promise<void> {
    const tags = await this.clients.ecs.send(new ListTagsForResourceCommand({ resourceArn }));
    const generation = tags.tags?.find((tag) => tag.key === 'fullstack:generation')?.value;
    const repositoryId = tags.tags?.find((tag) => tag.key === 'fullstack:repository-id')?.value;
    const pullRequest = tags.tags?.find((tag) => tag.key === 'fullstack:pull-request')?.value;
    if (
      generation !== ownership.generation ||
      repositoryId !== ownership.repositoryId ||
      pullRequest !== String(ownership.pullRequestNumber)
    )
      throw new Error('ECS resource ownership tags do not match cleanup generation');
  }

  private async markHealthy(
    ownership: PreviewOwnership,
    receipt: GenerationReceipt,
  ): Promise<void> {
    await this.clients.database.send(
      new PutCommand({
        TableName: this.config.stateTableName,
        Item: { previewKey: receiptKey(ownership), ...receipt, status: 'healthy' },
        ConditionExpression:
          'generation = :generation AND #status = :launching AND taskArn = :taskArn',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':generation': ownership.generation,
          ':launching': 'launching',
          ':taskArn': receipt.taskArn,
        },
      }),
    );
  }

  private async updateReceiptResource(
    ownership: PreviewOwnership,
    field: 'taskArn' | 'taskDefinitionArn' | 'publicIp',
    value: string,
  ): Promise<void> {
    await this.clients.database.send(
      new UpdateCommand({
        TableName: this.config.stateTableName,
        Key: { previewKey: receiptKey(ownership) },
        UpdateExpression: 'SET #field = :value',
        ConditionExpression:
          'generation = :generation AND #status = :launching AND #field = :empty',
        ExpressionAttributeNames: { '#field': field, '#status': 'status' },
        ExpressionAttributeValues: {
          ':generation': ownership.generation,
          ':launching': 'launching',
          ':empty': '',
          ':value': value,
        },
      }),
    );
  }

  private async receipt(ownership: PreviewOwnership): Promise<GenerationReceipt | null> {
    const response = await this.clients.database.send(
      new GetCommand({
        TableName: this.config.stateTableName,
        Key: { previewKey: receiptKey(ownership) },
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    const receipt = { ...response.Item };
    delete receipt.previewKey;
    return receiptSchema.parse(receipt);
  }

  private async changeDns(action: 'UPSERT' | 'DELETE', receipt: GenerationReceipt): Promise<void> {
    try {
      await this.clients.route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: this.config.previewZoneId,
          ChangeBatch: {
            Comment: `generation-owned preview ${receipt.generation}`,
            Changes: [
              {
                Action: action,
                ResourceRecordSet: {
                  Name: receipt.recordName,
                  Type: 'A',
                  TTL: 60,
                  ResourceRecords: [{ Value: receipt.publicIp }],
                },
              },
            ],
          },
        }),
      );
    } catch (error) {
      if (action !== 'DELETE' || !isObsoleteDnsDelete(error)) throw error;
    }
  }

  private async waitForHealth(recordName: string): Promise<void> {
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      try {
        const response = await fetch(`https://${recordName}/api/v1/health`);
        if (response.ok) {
          const body: unknown = await response.json();
          if (
            typeof body === 'object' &&
            body !== null &&
            'status' in body &&
            body.status === 'ok'
          ) {
            return;
          }
        }
      } catch {
        // The task and certificate may still be starting.
      }
      if (attempt < 40) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    throw new Error(`preview health did not become ready at ${recordName}`);
  }

  private containers(
    backendImage: string,
    frontendImage: string,
    routerImage: string,
    compose: PreviewCompose,
    ownership: PreviewOwnership,
  ): ContainerDefinition[] {
    const host = `pr-${String(ownership.pullRequestNumber)}.${this.config.previewZoneName}`;
    const service = (role: 'router' | 'backend' | 'frontend') => {
      const found = compose.services.find((item) => item.role === role);
      if (found === undefined) throw new Error(`Compose ${role} service is missing`);
      return found;
    };
    const backend = service('backend');
    const frontend = service('frontend');
    const router = service('router');
    const logConfiguration = {
      logDriver: 'awslogs' as const,
      options: {
        'awslogs-group': this.config.logGroupName,
        'awslogs-region': this.config.region,
        'awslogs-stream-prefix': 'preview',
      },
    };
    const environment = (values: Readonly<Record<string, string>>) =>
      Object.entries(values).map(([name, value]) => ({ name, value }));
    return [
      {
        name: backend.name,
        image: backendImage,
        essential: true,
        environment: environment(backend.environment),
        logConfiguration,
      },
      {
        name: frontend.name,
        image: frontendImage,
        essential: true,
        environment: environment(frontend.environment),
        logConfiguration,
      },
      {
        name: router.name,
        image: routerImage,
        essential: true,
        portMappings: [
          { containerPort: 80, protocol: 'tcp' },
          { containerPort: 443, protocol: 'tcp' },
        ],
        environment: environment({
          ...router.environment,
          SITE_ADDRESS: host,
          BACKEND_UPSTREAM: '127.0.0.1:3000',
          FRONTEND_UPSTREAM: '127.0.0.1:4173',
        }),
        dependsOn: router.dependsOn.map((containerName) => ({ containerName, condition: 'START' })),
        logConfiguration,
      },
    ];
  }
}

export function createAwsPreviewClients(region: string): AwsPreviewClients {
  return {
    database: DynamoDBDocumentClient.from(new DynamoDBClient({ region })),
    ecs: new ECSClient({ region }),
    ec2: new EC2Client({ region }),
    route53: new Route53Client({ region }),
  };
}
