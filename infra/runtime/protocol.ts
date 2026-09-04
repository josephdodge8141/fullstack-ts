export const LIFECYCLE_PROTOCOL_VERSION = 1 as const;
export const STARTUP_DURATION_MS = 30 * 60 * 1_000;
export const EXPIRY_DURATION_MS = 4 * 60 * 60 * 1_000;
const RECONCILE_INTERVAL_MS = 60 * 1_000;

export interface PreviewIdentity {
  repositoryId: string;
  pullRequestNumber: number;
  pullRequestNodeId: string;
}

export interface AdmissionClaim {
  source: 'github-rest-pull-request-etag';
  pullRequestVersion: string;
}

export interface GithubPullRequestAuthority {
  source: 'github-rest-pull-request-etag';
  fetchedAt: string;
  identity: PreviewIdentity;
  pullRequestVersion: string;
  state: 'open' | 'closed';
  headSha: string;
}

interface CommandBase {
  protocolVersion: typeof LIFECYCLE_PROTOCOL_VERSION;
  commandId: string;
  identity: PreviewIdentity;
  expectedStateRevision: number | null;
}

export interface BeginCommand extends CommandBase {
  type: 'begin';
  admission: AdmissionClaim;
  candidateSha: string;
  controlSha: string;
}

export interface ReopenCommand extends CommandBase {
  type: 'reopen';
  admission: AdmissionClaim;
  candidateSha: string;
  controlSha: string;
  expectedStateRevision: number;
}

export interface CompleteCommand extends CommandBase {
  type: 'complete';
  generation: string;
}

export type RuntimeObservation =
  | { kind: 'absent' }
  | {
      kind: 'owned';
      runtime: 'creating' | 'running' | 'stopping';
      taskId: string | null;
      publicIpv4: string | null;
      routing: 'missing' | 'matches' | 'stale';
    }
  | { kind: 'ownership-mismatch'; actualOwner: string };

export interface ReconcileCommand extends CommandBase {
  type: 'reconcile';
  generation: string;
  observation: RuntimeObservation;
}

export type DestroyReason =
  | 'pull-request-closed'
  | 'pull-request-merged'
  | 'runner-cancelled'
  | 'startup-timeout'
  | 'expired'
  | 'owner-requested';

export interface DestroyCommand extends CommandBase {
  type: 'destroy';
  generation: string;
  reason: DestroyReason;
  admission: AdmissionClaim | null;
}

export interface StatusCommand extends CommandBase {
  type: 'status';
}

export type LifecycleCommand =
  | BeginCommand
  | ReopenCommand
  | CompleteCommand
  | ReconcileCommand
  | DestroyCommand
  | StatusCommand;

export type LifecyclePhase =
  'idle' | 'retiring' | 'launching' | 'routing' | 'healthy' | 'cleaning' | 'closed';

export interface PreviewGeneration {
  id: string;
  ordinal: number;
  candidateSha: string;
  controlSha: string;
  admittedAt: string;
  startupDeadline: string;
  healthyAt: string | null;
  expiresAt: string | null;
  createToken: string;
  serviceName: string;
  observedTaskId: string | null;
  observedPublicIpv4: string | null;
}

export interface AcceptedPullRequestState {
  pullRequestVersion: string;
  state: 'open' | 'closed';
  headSha: string;
}

export interface LifecycleState {
  protocolVersion: typeof LIFECYCLE_PROTOCOL_VERSION;
  identity: PreviewIdentity;
  stateRevision: number;
  generationCounter: number;
  pullRequest: AcceptedPullRequestState;
  phase: LifecyclePhase;
  generation: PreviewGeneration;
  retiringGeneration: PreviewGeneration | null;
  cleanupDisposition: 'idle' | 'closed' | null;
  cleanupConfirmedGenerations: string[];
  lastCommandId: string;
}

export interface ExpectedOwnership {
  identity: PreviewIdentity;
  generation: string;
}

export type LifecycleEffect =
  | {
      type: 'ensure-generation';
      generation: PreviewGeneration;
      expectedOwnership: ExpectedOwnership;
    }
  | {
      type: 'inspect-generation';
      generation: string;
      expectedOwnership: ExpectedOwnership;
    }
  | {
      type: 'cleanup-owned-generation';
      generation: string;
      expectedOwnership: ExpectedOwnership;
    }
  | {
      type: 'sync-owned-routing';
      generation: string;
      taskId: string;
      publicIpv4: string;
      expectedOwnership: ExpectedOwnership;
    }
  | {
      type: 'report-ownership-conflict';
      generation: string;
      actualOwner: string;
      expectedOwnership: ExpectedOwnership;
    }
  | {
      type: 'schedule-reconcile';
      generation: string;
      notBefore: string;
    };

export type TransitionDecision = 'accepted' | 'duplicate' | 'rejected';

export interface LifecycleTransition {
  decision: TransitionDecision;
  reason: string;
  state: LifecycleState | null;
  effects: LifecycleEffect[];
}

export interface LifecycleTransitionInput {
  state: LifecycleState | null;
  command: LifecycleCommand;
  now: string;
  currentAuthority: GithubPullRequestAuthority | null;
}

export interface RuntimeSchema<T> {
  parse(value: unknown): T;
}

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'expected an object');
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const unknownKey = Object.keys(record).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    fail(`${path}.${unknownKey}`, 'unknown field');
  }
  for (const key of allowed) {
    if (!(key in record)) {
      fail(`${path}.${key}`, 'missing field');
    }
  }
}

function stringField(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    return fail(`${path}.${key}`, 'expected a string');
  }
  return value;
}

function integerField(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(`${path}.${key}`, 'expected a safe integer');
  }
  return value;
}

function nullableIntegerField(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  return integerField(record, key, path);
}

function requireNonempty(value: string, path: string): void {
  if (value.length === 0 || value.length > 256) {
    fail(path, 'expected 1 to 256 characters');
  }
}

function requireSha(value: string, path: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) {
    fail(path, 'expected a lowercase 40 character Git SHA');
  }
}

function requireCommandId(value: string, path: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    fail(path, 'expected a stable command identifier');
  }
}

function requireIsoDateTime(value: string, path: string): void {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    fail(path, 'expected a canonical ISO date-time');
  }
}

function parseIdentity(value: unknown, path: string): PreviewIdentity {
  const record = asRecord(value, path);
  exactKeys(record, ['repositoryId', 'pullRequestNumber', 'pullRequestNodeId'], path);
  const repositoryId = stringField(record, 'repositoryId', path);
  if (!/^[1-9][0-9]*$/.test(repositoryId)) {
    fail(`${path}.repositoryId`, 'expected the immutable numeric GitHub repository ID');
  }
  const pullRequestNumber = integerField(record, 'pullRequestNumber', path);
  if (pullRequestNumber <= 0) {
    fail(`${path}.pullRequestNumber`, 'expected a positive pull request number');
  }
  const pullRequestNodeId = stringField(record, 'pullRequestNodeId', path);
  requireNonempty(pullRequestNodeId, `${path}.pullRequestNodeId`);
  return { repositoryId, pullRequestNumber, pullRequestNodeId };
}

function parseAdmissionClaim(value: unknown, path: string): AdmissionClaim {
  const record = asRecord(value, path);
  exactKeys(record, ['source', 'pullRequestVersion'], path);
  if (record.source !== 'github-rest-pull-request-etag') {
    fail(`${path}.source`, 'unsupported admission authority');
  }
  const pullRequestVersion = stringField(record, 'pullRequestVersion', path);
  requireNonempty(pullRequestVersion, `${path}.pullRequestVersion`);
  return { source: 'github-rest-pull-request-etag', pullRequestVersion };
}

function parseCommandBase(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): {
  commandId: string;
  identity: PreviewIdentity;
  expectedStateRevision: number | null;
} {
  exactKeys(record, allowed, path);
  if (record.protocolVersion !== LIFECYCLE_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, `expected ${LIFECYCLE_PROTOCOL_VERSION}`);
  }
  const commandId = stringField(record, 'commandId', path);
  requireCommandId(commandId, `${path}.commandId`);
  const identity = parseIdentity(record.identity, `${path}.identity`);
  const expectedStateRevision = nullableIntegerField(record, 'expectedStateRevision', path);
  if (expectedStateRevision !== null && expectedStateRevision < 0) {
    fail(`${path}.expectedStateRevision`, 'expected a non-negative revision or null');
  }
  return { commandId, identity, expectedStateRevision };
}

function parseBeginCommand(record: Record<string, unknown>, path: string): BeginCommand {
  const base = parseCommandBase(
    record,
    [
      'protocolVersion',
      'type',
      'commandId',
      'identity',
      'expectedStateRevision',
      'admission',
      'candidateSha',
      'controlSha',
    ],
    path,
  );
  const admission = parseAdmissionClaim(record.admission, `${path}.admission`);
  const candidateSha = stringField(record, 'candidateSha', path);
  const controlSha = stringField(record, 'controlSha', path);
  requireSha(candidateSha, `${path}.candidateSha`);
  requireSha(controlSha, `${path}.controlSha`);
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'begin',
    ...base,
    admission,
    candidateSha,
    controlSha,
  };
}

function parseReopenCommand(record: Record<string, unknown>, path: string): ReopenCommand {
  const beginCommand = parseBeginCommand({ ...record, type: 'begin' }, path);
  if (beginCommand.expectedStateRevision === null) {
    fail(`${path}.expectedStateRevision`, 'reopen requires an existing state revision');
  }
  return {
    ...beginCommand,
    type: 'reopen',
    expectedStateRevision: beginCommand.expectedStateRevision,
  };
}

function parseGenerationCommandBase(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): ReturnType<typeof parseCommandBase> & { generation: string } {
  const base = parseCommandBase(record, allowed, path);
  const generation = stringField(record, 'generation', path);
  requireNonempty(generation, `${path}.generation`);
  return { ...base, generation };
}

function parseCompleteCommand(record: Record<string, unknown>, path: string): CompleteCommand {
  const base = parseGenerationCommandBase(
    record,
    ['protocolVersion', 'type', 'commandId', 'identity', 'expectedStateRevision', 'generation'],
    path,
  );
  return { protocolVersion: LIFECYCLE_PROTOCOL_VERSION, type: 'complete', ...base };
}

function parseObservation(value: unknown, path: string): RuntimeObservation {
  const record = asRecord(value, path);
  const kind = stringField(record, 'kind', path);
  if (kind === 'absent') {
    exactKeys(record, ['kind'], path);
    return { kind };
  }
  if (kind === 'ownership-mismatch') {
    exactKeys(record, ['kind', 'actualOwner'], path);
    const actualOwner = stringField(record, 'actualOwner', path);
    requireNonempty(actualOwner, `${path}.actualOwner`);
    return { kind, actualOwner };
  }
  if (kind !== 'owned') {
    return fail(`${path}.kind`, 'unsupported observation kind');
  }
  exactKeys(record, ['kind', 'runtime', 'taskId', 'publicIpv4', 'routing'], path);
  if (
    record.runtime !== 'creating' &&
    record.runtime !== 'running' &&
    record.runtime !== 'stopping'
  ) {
    fail(`${path}.runtime`, 'unsupported runtime state');
  }
  if (record.routing !== 'missing' && record.routing !== 'matches' && record.routing !== 'stale') {
    fail(`${path}.routing`, 'unsupported routing state');
  }
  if (record.taskId !== null && typeof record.taskId !== 'string') {
    fail(`${path}.taskId`, 'expected a string or null');
  }
  if (record.publicIpv4 !== null && typeof record.publicIpv4 !== 'string') {
    fail(`${path}.publicIpv4`, 'expected a string or null');
  }
  return {
    kind,
    runtime: record.runtime,
    taskId: record.taskId,
    publicIpv4: record.publicIpv4,
    routing: record.routing,
  };
}

function parseReconcileCommand(record: Record<string, unknown>, path: string): ReconcileCommand {
  const base = parseGenerationCommandBase(
    record,
    [
      'protocolVersion',
      'type',
      'commandId',
      'identity',
      'expectedStateRevision',
      'generation',
      'observation',
    ],
    path,
  );
  const observation = parseObservation(record.observation, `${path}.observation`);
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'reconcile',
    ...base,
    observation,
  };
}

function parseDestroyCommand(record: Record<string, unknown>, path: string): DestroyCommand {
  const base = parseGenerationCommandBase(
    record,
    [
      'protocolVersion',
      'type',
      'commandId',
      'identity',
      'expectedStateRevision',
      'generation',
      'reason',
      'admission',
    ],
    path,
  );
  const reason = stringField(record, 'reason', path);
  if (
    reason !== 'pull-request-closed' &&
    reason !== 'pull-request-merged' &&
    reason !== 'runner-cancelled' &&
    reason !== 'startup-timeout' &&
    reason !== 'expired' &&
    reason !== 'owner-requested'
  ) {
    fail(`${path}.reason`, 'unsupported destroy reason');
  }
  const admission =
    record.admission === null ? null : parseAdmissionClaim(record.admission, `${path}.admission`);
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    type: 'destroy',
    ...base,
    reason,
    admission,
  };
}

function parseStatusCommand(record: Record<string, unknown>, path: string): StatusCommand {
  const base = parseCommandBase(
    record,
    ['protocolVersion', 'type', 'commandId', 'identity', 'expectedStateRevision'],
    path,
  );
  return { protocolVersion: LIFECYCLE_PROTOCOL_VERSION, type: 'status', ...base };
}

function parseLifecycleCommand(value: unknown): LifecycleCommand {
  const path = 'command';
  const record = asRecord(value, path);
  const type = stringField(record, 'type', path);
  switch (type) {
    case 'begin':
      return parseBeginCommand(record, path);
    case 'reopen':
      return parseReopenCommand(record, path);
    case 'complete':
      return parseCompleteCommand(record, path);
    case 'reconcile':
      return parseReconcileCommand(record, path);
    case 'destroy':
      return parseDestroyCommand(record, path);
    case 'status':
      return parseStatusCommand(record, path);
    default:
      return fail(`${path}.type`, 'unsupported command type');
  }
}

function parseAuthority(value: unknown): GithubPullRequestAuthority {
  const path = 'authority';
  const record = asRecord(value, path);
  exactKeys(
    record,
    ['source', 'fetchedAt', 'identity', 'pullRequestVersion', 'state', 'headSha'],
    path,
  );
  if (record.source !== 'github-rest-pull-request-etag') {
    fail(`${path}.source`, 'unsupported admission authority');
  }
  const fetchedAt = stringField(record, 'fetchedAt', path);
  requireIsoDateTime(fetchedAt, `${path}.fetchedAt`);
  const identity = parseIdentity(record.identity, `${path}.identity`);
  const pullRequestVersion = stringField(record, 'pullRequestVersion', path);
  requireNonempty(pullRequestVersion, `${path}.pullRequestVersion`);
  if (record.state !== 'open' && record.state !== 'closed') {
    fail(`${path}.state`, 'expected open or closed');
  }
  const headSha = stringField(record, 'headSha', path);
  requireSha(headSha, `${path}.headSha`);
  return {
    source: 'github-rest-pull-request-etag',
    fetchedAt,
    identity,
    pullRequestVersion,
    state: record.state,
    headSha,
  };
}

function parseGeneration(value: unknown, path: string): PreviewGeneration {
  const record = asRecord(value, path);
  exactKeys(
    record,
    [
      'id',
      'ordinal',
      'candidateSha',
      'controlSha',
      'admittedAt',
      'startupDeadline',
      'healthyAt',
      'expiresAt',
      'createToken',
      'serviceName',
      'observedTaskId',
      'observedPublicIpv4',
    ],
    path,
  );
  const id = stringField(record, 'id', path);
  const ordinal = integerField(record, 'ordinal', path);
  const candidateSha = stringField(record, 'candidateSha', path);
  const controlSha = stringField(record, 'controlSha', path);
  const admittedAt = stringField(record, 'admittedAt', path);
  const startupDeadline = stringField(record, 'startupDeadline', path);
  const createToken = stringField(record, 'createToken', path);
  const serviceName = stringField(record, 'serviceName', path);
  if (ordinal <= 0) {
    fail(`${path}.ordinal`, 'expected a positive generation ordinal');
  }
  requireNonempty(id, `${path}.id`);
  requireSha(candidateSha, `${path}.candidateSha`);
  requireSha(controlSha, `${path}.controlSha`);
  requireIsoDateTime(admittedAt, `${path}.admittedAt`);
  requireIsoDateTime(startupDeadline, `${path}.startupDeadline`);
  requireNonempty(createToken, `${path}.createToken`);
  requireNonempty(serviceName, `${path}.serviceName`);
  const healthyAt = nullableDateField(record, 'healthyAt', path);
  const expiresAt = nullableDateField(record, 'expiresAt', path);
  const observedTaskId = nullableStringField(record, 'observedTaskId', path);
  const observedPublicIpv4 = nullableStringField(record, 'observedPublicIpv4', path);
  return {
    id,
    ordinal,
    candidateSha,
    controlSha,
    admittedAt,
    startupDeadline,
    healthyAt,
    expiresAt,
    createToken,
    serviceName,
    observedTaskId,
    observedPublicIpv4,
  };
}

function nullableDateField(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  const date = stringField(record, key, path);
  requireIsoDateTime(date, `${path}.${key}`);
  return date;
}

function nullableStringField(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  const text = stringField(record, key, path);
  requireNonempty(text, `${path}.${key}`);
  return text;
}

function parsePullRequestState(value: unknown, path: string): AcceptedPullRequestState {
  const record = asRecord(value, path);
  exactKeys(record, ['pullRequestVersion', 'state', 'headSha'], path);
  const pullRequestVersion = stringField(record, 'pullRequestVersion', path);
  requireNonempty(pullRequestVersion, `${path}.pullRequestVersion`);
  if (record.state !== 'open' && record.state !== 'closed') {
    fail(`${path}.state`, 'expected open or closed');
  }
  const headSha = stringField(record, 'headSha', path);
  requireSha(headSha, `${path}.headSha`);
  return { pullRequestVersion, state: record.state, headSha };
}

function parseLifecycleState(value: unknown): LifecycleState {
  const path = 'state';
  const record = asRecord(value, path);
  exactKeys(
    record,
    [
      'protocolVersion',
      'identity',
      'stateRevision',
      'generationCounter',
      'pullRequest',
      'phase',
      'generation',
      'retiringGeneration',
      'cleanupDisposition',
      'cleanupConfirmedGenerations',
      'lastCommandId',
    ],
    path,
  );
  if (record.protocolVersion !== LIFECYCLE_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, `expected ${LIFECYCLE_PROTOCOL_VERSION}`);
  }
  const identity = parseIdentity(record.identity, `${path}.identity`);
  const stateRevision = integerField(record, 'stateRevision', path);
  const generationCounter = integerField(record, 'generationCounter', path);
  if (stateRevision <= 0 || generationCounter <= 0) {
    fail(path, 'state and generation revisions must be positive');
  }
  const pullRequest = parsePullRequestState(record.pullRequest, `${path}.pullRequest`);
  const phase = stringField(record, 'phase', path);
  if (
    phase !== 'idle' &&
    phase !== 'retiring' &&
    phase !== 'launching' &&
    phase !== 'routing' &&
    phase !== 'healthy' &&
    phase !== 'cleaning' &&
    phase !== 'closed'
  ) {
    fail(`${path}.phase`, 'unsupported lifecycle phase');
  }
  const generation = parseGeneration(record.generation, `${path}.generation`);
  const retiringGeneration =
    record.retiringGeneration === null
      ? null
      : parseGeneration(record.retiringGeneration, `${path}.retiringGeneration`);
  if (
    record.cleanupDisposition !== null &&
    record.cleanupDisposition !== 'idle' &&
    record.cleanupDisposition !== 'closed'
  ) {
    fail(`${path}.cleanupDisposition`, 'expected idle, closed, or null');
  }
  if (!Array.isArray(record.cleanupConfirmedGenerations)) {
    fail(`${path}.cleanupConfirmedGenerations`, 'expected an array');
  }
  const cleanupConfirmedGenerations = record.cleanupConfirmedGenerations.map((entry, index) => {
    if (typeof entry !== 'string') {
      return fail(`${path}.cleanupConfirmedGenerations[${index}]`, 'expected a string');
    }
    requireNonempty(entry, `${path}.cleanupConfirmedGenerations[${index}]`);
    return entry;
  });
  const lastCommandId = stringField(record, 'lastCommandId', path);
  requireCommandId(lastCommandId, `${path}.lastCommandId`);
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    identity,
    stateRevision,
    generationCounter,
    pullRequest,
    phase,
    generation,
    retiringGeneration,
    cleanupDisposition: record.cleanupDisposition,
    cleanupConfirmedGenerations,
    lastCommandId,
  };
}

export const lifecycleCommandSchema: RuntimeSchema<LifecycleCommand> = {
  parse: parseLifecycleCommand,
};

export const githubPullRequestAuthoritySchema: RuntimeSchema<GithubPullRequestAuthority> = {
  parse: parseAuthority,
};

export const lifecycleStateSchema: RuntimeSchema<LifecycleState> = {
  parse: parseLifecycleState,
};

function identitiesEqual(left: PreviewIdentity, right: PreviewIdentity): boolean {
  return (
    left.repositoryId === right.repositoryId &&
    left.pullRequestNumber === right.pullRequestNumber &&
    left.pullRequestNodeId === right.pullRequestNodeId
  );
}

function isoAfter(value: string, milliseconds: number): string {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

function expectedOwnership(state: LifecycleState, generation: string): ExpectedOwnership {
  return { identity: state.identity, generation };
}

function scheduleEffect(generation: string, now: string): LifecycleEffect {
  return {
    type: 'schedule-reconcile',
    generation,
    notBefore: isoAfter(now, RECONCILE_INTERVAL_MS),
  };
}

function ensureEffect(state: LifecycleState): LifecycleEffect {
  return {
    type: 'ensure-generation',
    generation: state.generation,
    expectedOwnership: expectedOwnership(state, state.generation.id),
  };
}

function inspectEffect(state: LifecycleState, generation: string): LifecycleEffect {
  return {
    type: 'inspect-generation',
    generation,
    expectedOwnership: expectedOwnership(state, generation),
  };
}

function nextState(
  state: LifecycleState,
  commandId: string,
  changes: Partial<LifecycleState>,
): LifecycleState {
  return {
    ...state,
    ...changes,
    stateRevision: state.stateRevision + 1,
    lastCommandId: commandId,
  };
}

function accepted(
  state: LifecycleState,
  reason: string,
  effects: LifecycleEffect[],
): LifecycleTransition {
  return { decision: 'accepted', reason, state, effects };
}

function duplicate(state: LifecycleState, reason: string): LifecycleTransition {
  return { decision: 'duplicate', reason, state, effects: [] };
}

function rejected(state: LifecycleState | null, reason: string): LifecycleTransition {
  return { decision: 'rejected', reason, state, effects: [] };
}

function verifyAuthority(
  identity: PreviewIdentity,
  claim: AdmissionClaim,
  candidateSha: string | null,
  requiredState: 'open' | 'closed' | null,
  authority: GithubPullRequestAuthority | null,
): string | null {
  if (authority === null) {
    return 'current-github-authority-required';
  }
  if (!identitiesEqual(identity, authority.identity)) {
    return 'authority-identity-mismatch';
  }
  if (claim.pullRequestVersion !== authority.pullRequestVersion) {
    return 'admission-is-not-current';
  }
  if (requiredState !== null && authority.state !== requiredState) {
    return requiredState === 'open' ? 'pull-request-is-not-open' : 'pull-request-is-not-closed';
  }
  if (candidateSha !== null && candidateSha !== authority.headSha) {
    return 'candidate-is-not-current-head';
  }
  return null;
}

function createGeneration(
  identity: PreviewIdentity,
  ordinal: number,
  candidateSha: string,
  controlSha: string,
  now: string,
): PreviewGeneration {
  const stem = `r${identity.repositoryId}-pr${identity.pullRequestNumber}-g${ordinal}`;
  return {
    id: stem,
    ordinal,
    candidateSha,
    controlSha,
    admittedAt: now,
    startupDeadline: isoAfter(now, STARTUP_DURATION_MS),
    healthyAt: null,
    expiresAt: null,
    createToken: `create-${stem}`,
    serviceName: `preview-${stem}`,
    observedTaskId: null,
    observedPublicIpv4: null,
  };
}

function transitionBegin(
  state: LifecycleState | null,
  command: BeginCommand,
  now: string,
  authority: GithubPullRequestAuthority | null,
): LifecycleTransition {
  const authorityFailure = verifyAuthority(
    command.identity,
    command.admission,
    command.candidateSha,
    'open',
    authority,
  );
  if (authorityFailure !== null) {
    return rejected(state, authorityFailure);
  }
  if (state === null) {
    if (command.expectedStateRevision !== null) {
      return rejected(state, 'state-revision-mismatch');
    }
    const generation = createGeneration(
      command.identity,
      1,
      command.candidateSha,
      command.controlSha,
      now,
    );
    const created: LifecycleState = {
      protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
      identity: command.identity,
      stateRevision: 1,
      generationCounter: 1,
      pullRequest: {
        pullRequestVersion: command.admission.pullRequestVersion,
        state: 'open',
        headSha: command.candidateSha,
      },
      phase: 'launching',
      generation,
      retiringGeneration: null,
      cleanupDisposition: null,
      cleanupConfirmedGenerations: [],
      lastCommandId: command.commandId,
    };
    return accepted(created, 'generation-admitted', [ensureEffect(created)]);
  }
  if (state.lastCommandId === command.commandId) {
    return duplicate(state, 'command-already-applied');
  }
  if (state.phase === 'closed') {
    return rejected(state, 'reopen-required');
  }
  if (command.expectedStateRevision !== state.stateRevision) {
    return rejected(state, 'state-revision-mismatch');
  }
  if (state.phase === 'cleaning' || state.phase === 'retiring') {
    return rejected(state, 'lifecycle-transition-in-progress');
  }
  const ordinal = state.generationCounter + 1;
  const generation = createGeneration(
    command.identity,
    ordinal,
    command.candidateSha,
    command.controlSha,
    now,
  );
  const retiringGeneration = state.generation;
  const admitted = nextState(state, command.commandId, {
    generationCounter: ordinal,
    pullRequest: {
      pullRequestVersion: command.admission.pullRequestVersion,
      state: 'open',
      headSha: command.candidateSha,
    },
    phase: 'retiring',
    generation,
    retiringGeneration,
    cleanupDisposition: null,
    cleanupConfirmedGenerations: [],
  });
  return accepted(admitted, 'generation-admitted', [
    inspectEffect(admitted, retiringGeneration.id),
  ]);
}

function transitionReopen(
  state: LifecycleState | null,
  command: ReopenCommand,
  authority: GithubPullRequestAuthority | null,
): LifecycleTransition {
  const authorityFailure = verifyAuthority(
    command.identity,
    command.admission,
    command.candidateSha,
    'open',
    authority,
  );
  if (authorityFailure !== null) {
    return rejected(state, authorityFailure);
  }
  if (state === null) {
    return rejected(state, 'closed-state-required');
  }
  if (state.lastCommandId === command.commandId) {
    return duplicate(state, 'command-already-applied');
  }
  if (command.expectedStateRevision !== state.stateRevision) {
    return rejected(state, 'state-revision-mismatch');
  }
  if (state.phase !== 'closed') {
    return rejected(state, 'closed-state-required');
  }
  const reopened = nextState(state, command.commandId, {
    pullRequest: {
      pullRequestVersion: command.admission.pullRequestVersion,
      state: 'open',
      headSha: command.candidateSha,
    },
    phase: 'idle',
    cleanupDisposition: null,
    cleanupConfirmedGenerations: [],
  });
  return accepted(reopened, 'pull-request-reopened', [
    inspectEffect(reopened, reopened.generation.id),
  ]);
}

function transitionComplete(
  state: LifecycleState | null,
  command: CompleteCommand,
  now: string,
): LifecycleTransition {
  if (state === null) {
    return rejected(state, 'state-required');
  }
  if (command.generation !== state.generation.id) {
    return rejected(state, 'generation-is-not-current');
  }
  if (state.phase === 'healthy') {
    return duplicate(state, 'health-already-completed');
  }
  if (command.expectedStateRevision !== state.stateRevision) {
    return rejected(state, 'state-revision-mismatch');
  }
  if (state.phase !== 'routing') {
    return rejected(state, 'generation-is-not-routable');
  }
  if (Date.parse(now) > Date.parse(state.generation.startupDeadline)) {
    return rejected(state, 'startup-deadline-exceeded');
  }
  const generation: PreviewGeneration = {
    ...state.generation,
    healthyAt: now,
    expiresAt: isoAfter(now, EXPIRY_DURATION_MS),
  };
  const completed = nextState(state, command.commandId, { phase: 'healthy', generation });
  return accepted(completed, 'health-completed', [scheduleEffect(generation.id, now)]);
}

function generationForReconcile(
  state: LifecycleState,
  generation: string,
): PreviewGeneration | null {
  if (generation === state.generation.id) {
    return state.generation;
  }
  if (state.retiringGeneration?.id === generation) {
    return state.retiringGeneration;
  }
  return null;
}

function cleanupEffect(state: LifecycleState, generation: string): LifecycleEffect {
  return {
    type: 'cleanup-owned-generation',
    generation,
    expectedOwnership: expectedOwnership(state, generation),
  };
}

function conflictEffects(
  state: LifecycleState,
  command: ReconcileCommand,
  now: string,
): LifecycleEffect[] {
  if (command.observation.kind !== 'ownership-mismatch') {
    return [];
  }
  return [
    {
      type: 'report-ownership-conflict',
      generation: command.generation,
      actualOwner: command.observation.actualOwner,
      expectedOwnership: expectedOwnership(state, command.generation),
    },
    scheduleEffect(command.generation, now),
  ];
}

function withObservedRuntime(
  generation: PreviewGeneration,
  observation: Extract<RuntimeObservation, { kind: 'owned' }>,
): PreviewGeneration {
  return {
    ...generation,
    observedTaskId: observation.taskId,
    observedPublicIpv4: observation.publicIpv4,
  };
}

function transitionRetiringReconcile(
  state: LifecycleState,
  command: ReconcileCommand,
  now: string,
): LifecycleTransition {
  const retiring = state.retiringGeneration;
  if (retiring === null || command.generation !== retiring.id) {
    return rejected(state, 'generation-is-not-actionable');
  }
  if (command.observation.kind === 'ownership-mismatch') {
    const updated = nextState(state, command.commandId, {});
    return accepted(updated, 'ownership-conflict', conflictEffects(updated, command, now));
  }
  if (command.observation.kind === 'owned') {
    const updated = nextState(state, command.commandId, {
      retiringGeneration: withObservedRuntime(retiring, command.observation),
    });
    return accepted(updated, 'retiring-generation-present', [
      cleanupEffect(updated, retiring.id),
      scheduleEffect(retiring.id, now),
    ]);
  }
  const launching = nextState(state, command.commandId, {
    phase: 'launching',
    retiringGeneration: null,
  });
  return accepted(launching, 'retiring-generation-absent', [ensureEffect(launching)]);
}

function transitionCleaningReconcile(
  state: LifecycleState,
  command: ReconcileCommand,
  now: string,
): LifecycleTransition {
  if (command.observation.kind === 'ownership-mismatch') {
    const updated = nextState(state, command.commandId, {});
    return accepted(updated, 'ownership-conflict', conflictEffects(updated, command, now));
  }
  if (command.observation.kind === 'owned') {
    const cleanupConfirmedGenerations = state.cleanupConfirmedGenerations.filter(
      (generation) => generation !== command.generation,
    );
    const updated = nextState(state, command.commandId, { cleanupConfirmedGenerations });
    return accepted(updated, 'owned-generation-requires-cleanup', [
      cleanupEffect(updated, command.generation),
      scheduleEffect(command.generation, now),
    ]);
  }
  const cleanupConfirmedGenerations = state.cleanupConfirmedGenerations.includes(command.generation)
    ? state.cleanupConfirmedGenerations
    : [...state.cleanupConfirmedGenerations, command.generation];
  const required = [state.generation.id];
  if (state.retiringGeneration !== null) {
    required.push(state.retiringGeneration.id);
  }
  const cleanupComplete = required.every((generation) =>
    cleanupConfirmedGenerations.includes(generation),
  );
  if (!cleanupComplete) {
    const updated = nextState(state, command.commandId, { cleanupConfirmedGenerations });
    const unconfirmed = required.find(
      (generation) => !cleanupConfirmedGenerations.includes(generation),
    );
    if (unconfirmed === undefined) {
      return accepted(updated, 'cleanup-observation-recorded', []);
    }
    return accepted(updated, 'cleanup-observation-recorded', [inspectEffect(updated, unconfirmed)]);
  }
  const phase = state.cleanupDisposition === 'closed' ? 'closed' : 'idle';
  const completed = nextState(state, command.commandId, {
    phase,
    retiringGeneration: null,
    cleanupConfirmedGenerations,
  });
  return accepted(completed, 'cleanup-completed', []);
}

function transitionTerminalReconcile(
  state: LifecycleState,
  command: ReconcileCommand,
  now: string,
): LifecycleTransition {
  if (command.generation !== state.generation.id) {
    return rejected(state, 'generation-is-not-actionable');
  }
  if (command.observation.kind === 'ownership-mismatch') {
    const updated = nextState(state, command.commandId, {});
    return accepted(updated, 'ownership-conflict', conflictEffects(updated, command, now));
  }
  if (command.observation.kind === 'owned') {
    const updated = nextState(state, command.commandId, {
      cleanupConfirmedGenerations: state.cleanupConfirmedGenerations.filter(
        (generation) => generation !== command.generation,
      ),
    });
    return accepted(updated, 'orphaned-owned-generation', [
      cleanupEffect(updated, command.generation),
      scheduleEffect(command.generation, now),
    ]);
  }
  return duplicate(state, 'generation-remains-absent');
}

function transitionCurrentReconcile(
  state: LifecycleState,
  command: ReconcileCommand,
  now: string,
): LifecycleTransition {
  if (command.observation.kind === 'ownership-mismatch') {
    const updated = nextState(state, command.commandId, {});
    return accepted(updated, 'ownership-conflict', conflictEffects(updated, command, now));
  }
  if (command.observation.kind === 'absent') {
    const updated = nextState(state, command.commandId, {
      phase: state.phase === 'routing' ? 'launching' : state.phase,
      generation: {
        ...state.generation,
        observedTaskId: null,
        observedPublicIpv4: null,
      },
    });
    return accepted(updated, 'generation-absent', [
      ensureEffect(updated),
      scheduleEffect(command.generation, now),
    ]);
  }
  const generation = withObservedRuntime(state.generation, command.observation);
  if (
    command.observation.runtime !== 'running' ||
    command.observation.taskId === null ||
    command.observation.publicIpv4 === null
  ) {
    const updated = nextState(state, command.commandId, { generation });
    return accepted(updated, 'generation-not-yet-running', [
      scheduleEffect(command.generation, now),
    ]);
  }
  const nextPhase = state.phase === 'healthy' ? 'healthy' : 'routing';
  const updated = nextState(state, command.commandId, { phase: nextPhase, generation });
  if (command.observation.routing !== 'matches') {
    return accepted(updated, 'routing-requires-sync', [
      {
        type: 'sync-owned-routing',
        generation: command.generation,
        taskId: command.observation.taskId,
        publicIpv4: command.observation.publicIpv4,
        expectedOwnership: expectedOwnership(updated, command.generation),
      },
      scheduleEffect(command.generation, now),
    ]);
  }
  return accepted(updated, 'owned-routing-current', [scheduleEffect(command.generation, now)]);
}

function transitionReconcile(
  state: LifecycleState | null,
  command: ReconcileCommand,
  now: string,
): LifecycleTransition {
  if (state === null) {
    return rejected(state, 'state-required');
  }
  if (generationForReconcile(state, command.generation) === null) {
    return rejected(state, 'generation-is-not-known');
  }
  if (state.lastCommandId === command.commandId) {
    return duplicate(state, 'command-already-applied');
  }
  if (command.expectedStateRevision !== state.stateRevision) {
    return rejected(state, 'state-revision-mismatch');
  }
  if (state.phase === 'retiring') {
    return transitionRetiringReconcile(state, command, now);
  }
  if (state.phase === 'cleaning') {
    return transitionCleaningReconcile(state, command, now);
  }
  if (state.phase === 'closed' || state.phase === 'idle') {
    return transitionTerminalReconcile(state, command, now);
  }
  if (command.generation !== state.generation.id) {
    return rejected(state, 'generation-is-not-actionable');
  }
  return transitionCurrentReconcile(state, command, now);
}

function destroyRequiresAuthority(reason: DestroyReason): boolean {
  return (
    reason === 'pull-request-closed' ||
    reason === 'pull-request-merged' ||
    reason === 'runner-cancelled' ||
    reason === 'owner-requested'
  );
}

function transitionDestroy(
  state: LifecycleState | null,
  command: DestroyCommand,
  now: string,
  authority: GithubPullRequestAuthority | null,
): LifecycleTransition {
  if (state === null) {
    return rejected(state, 'state-required');
  }
  if (command.generation !== state.generation.id) {
    return rejected(state, 'generation-is-not-current');
  }
  if (command.reason === 'runner-cancelled' && state.phase === 'healthy') {
    return rejected(state, 'completed-generation');
  }
  if (state.lastCommandId === command.commandId) {
    return duplicate(state, 'command-already-applied');
  }
  if (command.expectedStateRevision !== state.stateRevision) {
    return rejected(state, 'state-revision-mismatch');
  }
  if (destroyRequiresAuthority(command.reason)) {
    if (command.admission === null) {
      return rejected(state, 'current-github-authority-required');
    }
    const requiredState =
      command.reason === 'pull-request-closed' || command.reason === 'pull-request-merged'
        ? 'closed'
        : 'open';
    const authorityFailure = verifyAuthority(
      command.identity,
      command.admission,
      null,
      requiredState,
      authority,
    );
    if (authorityFailure !== null) {
      return rejected(state, authorityFailure);
    }
  } else if (command.admission !== null) {
    return rejected(state, 'admission-not-allowed-for-clock-destroy');
  }
  if (command.reason === 'startup-timeout') {
    if (state.phase === 'healthy') {
      return rejected(state, 'generation-already-completed');
    }
    if (Date.parse(now) < Date.parse(state.generation.startupDeadline)) {
      return rejected(state, 'startup-deadline-not-reached');
    }
  }
  if (command.reason === 'expired') {
    if (
      state.phase !== 'healthy' ||
      state.generation.expiresAt === null ||
      Date.parse(now) < Date.parse(state.generation.expiresAt)
    ) {
      return rejected(state, 'expiry-not-reached');
    }
  }
  const closesPullRequest =
    command.reason === 'pull-request-closed' || command.reason === 'pull-request-merged';
  const pullRequest =
    closesPullRequest && authority !== null
      ? {
          pullRequestVersion: authority.pullRequestVersion,
          state: 'closed' as const,
          headSha: authority.headSha,
        }
      : state.pullRequest;
  const cleanup = nextState(state, command.commandId, {
    pullRequest,
    phase: 'cleaning',
    cleanupDisposition: closesPullRequest ? 'closed' : 'idle',
    cleanupConfirmedGenerations: [],
  });
  const generations = [cleanup.generation.id];
  if (cleanup.retiringGeneration !== null) {
    generations.push(cleanup.retiringGeneration.id);
  }
  return accepted(
    cleanup,
    'cleanup-requested',
    generations.map((generation) => inspectEffect(cleanup, generation)),
  );
}

function transitionStatus(
  state: LifecycleState | null,
  command: StatusCommand,
): LifecycleTransition {
  if (state !== null && !identitiesEqual(state.identity, command.identity)) {
    return rejected(state, 'state-identity-mismatch');
  }
  return { decision: 'accepted', reason: 'status-read', state, effects: [] };
}

export function transitionLifecycle(input: LifecycleTransitionInput): LifecycleTransition {
  const command = lifecycleCommandSchema.parse(input.command);
  const state = input.state === null ? null : lifecycleStateSchema.parse(input.state);
  const authority =
    input.currentAuthority === null
      ? null
      : githubPullRequestAuthoritySchema.parse(input.currentAuthority);
  requireIsoDateTime(input.now, 'now');
  if (state !== null && !identitiesEqual(state.identity, command.identity)) {
    return rejected(state, 'state-identity-mismatch');
  }
  switch (command.type) {
    case 'begin':
      return transitionBegin(state, command, input.now, authority);
    case 'reopen':
      return transitionReopen(state, command, authority);
    case 'complete':
      return transitionComplete(state, command, input.now);
    case 'reconcile':
      return transitionReconcile(state, command, input.now);
    case 'destroy':
      return transitionDestroy(state, command, input.now, authority);
    case 'status':
      return transitionStatus(state, command);
  }
}
