import path from 'node:path';

const SERVICE_FIELDS = new Set([
  'build',
  'command',
  'depends_on',
  'entrypoint',
  'environment',
  'healthcheck',
  'image',
  'networks',
  'ports',
  'restart',
  'user',
  'volumes',
  'working_dir',
]);

export interface PreviewService {
  readonly name: string;
  readonly role: 'router' | 'frontend' | 'backend';
  readonly environment: Readonly<Record<string, string>>;
  readonly dependsOn: readonly string[];
}

export interface PreviewCompose {
  readonly cpu: number;
  readonly memoryMiB: number;
  readonly services: readonly PreviewService[];
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: ReadonlySet<string>, path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${path}.${key}: unsupported preview field`);
  }
}

function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new TypeError(`${path}: expected string array`);
  }
  return value;
}

export function compileNormalizedCompose(value: unknown): PreviewCompose {
  const document = record(value, 'compose');
  keys(document, new Set(['name', 'networks', 'services', 'x-preview']), 'compose');
  const extension = record(document['x-preview'], 'compose.x-preview');
  keys(
    extension,
    new Set(['version', 'router', 'frontend', 'backend', 'task', 'localOnlyMounts']),
    'compose.x-preview',
  );
  if (extension.version !== 1) throw new TypeError('compose.x-preview.version: expected 1');
  const task = record(extension.task, 'compose.x-preview.task');
  keys(task, new Set(['cpu', 'memoryMiB']), 'compose.x-preview.task');
  const cpu = task.cpu;
  const memoryMiB = task.memoryMiB;
  const validMemory: Record<number, readonly number[]> = {
    256: [512, 1024, 2048],
    512: [1024, 2048, 3072, 4096],
    1024: [2048, 3072, 4096, 5120, 6144, 7168, 8192],
    2048: [4096, 8192, 12288, 16384],
    4096: [8192, 16384, 24576, 30720],
  };
  if (typeof cpu !== 'number' || !(cpu in validMemory)) {
    throw new TypeError('compose.x-preview.task.cpu: unsupported Fargate CPU');
  }
  if (typeof memoryMiB !== 'number' || !validMemory[cpu]?.includes(memoryMiB)) {
    throw new TypeError('compose.x-preview.task.memoryMiB: unsupported CPU/memory pair');
  }
  const services = record(document.services, 'compose.services');
  const roles = ['router', 'frontend', 'backend'] as const;
  const names = roles.map((role) => extension[role]);
  if (names.some((name) => typeof name !== 'string' || !(name in services))) {
    throw new TypeError('compose.x-preview: each role must name a service');
  }
  if (new Set(names).size !== 3 || Object.keys(services).length !== 3) {
    throw new TypeError('compose.services: preview supports exactly router, frontend, and backend');
  }
  if (names[0] !== 'caddy' || names[1] !== 'frontend' || names[2] !== 'backend') {
    throw new TypeError(
      'compose.x-preview: this adapter requires caddy, frontend, and backend service names',
    );
  }
  const localOnlyMounts = record(
    extension.localOnlyMounts ?? {},
    'compose.x-preview.localOnlyMounts',
  );
  keys(localOnlyMounts, new Set([String(extension.router)]), 'compose.x-preview.localOnlyMounts');
  const normalizedNetworks = record(document.networks ?? {}, 'compose.networks');
  keys(normalizedNetworks, new Set(['default']), 'compose.networks');
  const defaultNetwork = record(normalizedNetworks.default, 'compose.networks.default');
  keys(defaultNetwork, new Set(['name', 'ipam']), 'compose.networks.default');
  if (typeof defaultNetwork.name !== 'string') {
    throw new TypeError('compose.networks.default.name: expected a string');
  }
  const ipam = record(defaultNetwork.ipam, 'compose.networks.default.ipam');
  keys(ipam, new Set(), 'compose.networks.default.ipam');
  const routerSource = record(
    services[String(extension.router)],
    `compose.services.${String(extension.router)}`,
  );
  const routerMounts = routerSource.volumes;
  if (!Array.isArray(routerMounts) || routerMounts.length !== 1) {
    throw new TypeError('compose.services.router.volumes: expected one local Caddyfile bind mount');
  }
  const routerMount = record(routerMounts[0], 'compose.services.router.volumes');
  if (
    typeof routerMount.source !== 'string' ||
    path.basename(routerMount.source) !== 'Caddyfile' ||
    !path.isAbsolute(routerMount.source)
  ) {
    throw new TypeError('compose.services.router.volumes.source: expected absolute Caddyfile path');
  }
  const sourceRoot = path.dirname(routerMount.source);

  const compiled = roles.map((role): PreviewService => {
    const name = extension[role] as string;
    const service = record(services[name], `compose.services.${name}`);
    keys(service, SERVICE_FIELDS, `compose.services.${name}`);
    if (role === 'router') {
      if (service.image !== 'caddy:2.10-alpine' || service.build !== undefined) {
        throw new TypeError(`compose.services.${name}.image: expected pinned Caddy router`);
      }
    } else {
      if (service.image !== undefined) {
        throw new TypeError(`compose.services.${name}.image: preview requires the Compose build`);
      }
      const build = record(service.build, `compose.services.${name}.build`);
      keys(build, new Set(['context', 'dockerfile']), `compose.services.${name}.build`);
      if (build.context !== sourceRoot || build.dockerfile !== `${role}/Dockerfile`) {
        throw new TypeError(`compose.services.${name}.build: unexpected context or Dockerfile`);
      }
    }
    if (
      service.command != null ||
      service.entrypoint != null ||
      service.healthcheck != null ||
      service.restart != null ||
      service.user != null ||
      service.working_dir != null
    ) {
      throw new TypeError(`compose.services.${name}: unsupported command or runtime override`);
    }
    if (role !== 'router' && service.ports !== undefined) {
      throw new TypeError(`compose.services.${name}.ports: only the router may publish ports`);
    }
    if (role === 'router' && !Array.isArray(service.ports)) {
      throw new TypeError(`compose.services.${name}.ports: router must publish a local port`);
    }
    if (role === 'router') {
      const ports = service.ports as unknown[];
      if (ports.length !== 1)
        throw new TypeError(`compose.services.${name}.ports: expected one local port`);
      const port = record(ports[0], `compose.services.${name}.ports.0`);
      keys(
        port,
        new Set(['mode', 'target', 'published', 'protocol']),
        `compose.services.${name}.ports.0`,
      );
      if (
        port.mode !== 'ingress' ||
        port.target !== 8088 ||
        port.published !== '8088' ||
        port.protocol !== 'tcp'
      ) {
        throw new TypeError(`compose.services.${name}.ports: unsupported router port mapping`);
      }
    }
    const networks = record(service.networks ?? {}, `compose.services.${name}.networks`);
    keys(networks, new Set(['default']), `compose.services.${name}.networks`);
    const network = networks.default;
    if (role === 'router') {
      const settings = record(network, `compose.services.${name}.networks.default`);
      keys(settings, new Set(['aliases']), `compose.services.${name}.networks.default`);
      if (JSON.stringify(settings.aliases) !== JSON.stringify(['app.localhost'])) {
        throw new TypeError(
          `compose.services.${name}.networks.default.aliases: unsupported aliases`,
        );
      }
    } else if (network !== null) {
      throw new TypeError(`compose.services.${name}.networks.default: unsupported settings`);
    }
    const allowedMounts = strings(
      localOnlyMounts[name] ?? [],
      `compose.x-preview.localOnlyMounts.${name}`,
    );
    const mounts = service.volumes === undefined ? [] : service.volumes;
    if (!Array.isArray(mounts))
      throw new TypeError(`compose.services.${name}.volumes: expected array`);
    for (const mount of mounts) {
      const item = record(mount, `compose.services.${name}.volumes`);
      if (
        item.type !== 'bind' ||
        typeof item.target !== 'string' ||
        !allowedMounts.includes(item.target) ||
        item.source !== routerMount.source ||
        item.read_only !== true ||
        JSON.stringify(item.bind) !== '{}'
      ) {
        throw new TypeError(`compose.services.${name}.volumes: unsupported preview mount`);
      }
    }
    if (mounts.length !== allowedMounts.length) {
      throw new TypeError(`compose.x-preview.localOnlyMounts.${name}: must match local mounts`);
    }
    const dependencies = record(service.depends_on ?? {}, `compose.services.${name}.depends_on`);
    if (role !== 'router' && Object.keys(dependencies).length > 0) {
      throw new TypeError(`compose.services.${name}.depends_on: unsupported dependency`);
    }
    if (
      role === 'router' &&
      (Object.keys(dependencies).length !== 2 ||
        !('backend' in dependencies) ||
        !('frontend' in dependencies))
    ) {
      throw new TypeError(`compose.services.${name}.depends_on: expected backend and frontend`);
    }
    for (const [dependency, value] of Object.entries(dependencies)) {
      if (!names.includes(dependency))
        throw new TypeError(`compose.services.${name}.depends_on: unknown service`);
      const condition = record(value, `compose.services.${name}.depends_on.${dependency}`);
      if (condition.condition !== 'service_started' || condition.required !== true) {
        throw new TypeError(
          `compose.services.${name}.depends_on.${dependency}: unsupported condition`,
        );
      }
    }
    const rawEnvironment = record(
      service.environment ?? {},
      `compose.services.${name}.environment`,
    );
    const environment: Record<string, string> = {};
    for (const [key, entry] of Object.entries(rawEnvironment)) {
      if (typeof entry !== 'string')
        throw new TypeError(`compose.services.${name}.environment.${key}: expected string`);
      environment[key] = entry;
    }
    if (
      role === 'router' &&
      (environment.SITE_ADDRESS !== 'http://app.localhost:8088' ||
        environment.BACKEND_UPSTREAM !== 'backend:3000' ||
        environment.FRONTEND_UPSTREAM !== 'frontend:4173')
    )
      throw new TypeError(
        `compose.services.${name}.environment: unsupported router upstream mapping`,
      );
    if (role === 'backend' && (environment.HOST !== '0.0.0.0' || environment.PORT !== '3000')) {
      throw new TypeError(
        `compose.services.${name}.environment: unsupported backend listen mapping`,
      );
    }
    return { name, role, environment, dependsOn: Object.keys(dependencies) };
  });
  return { cpu, memoryMiB, services: compiled };
}
