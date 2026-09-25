import assert from 'node:assert/strict';
import test from 'node:test';
import { compileNormalizedCompose } from './compose.js';

const valid = {
  name: 'example-local',
  'x-preview': {
    version: 1,
    router: 'caddy',
    frontend: 'frontend',
    backend: 'backend',
    task: { cpu: 1024, memoryMiB: 2048 },
    localOnlyMounts: { caddy: ['/etc/caddy/Caddyfile'] },
  },
  networks: { default: { name: 'example-local_default', ipam: {} } },
  services: {
    caddy: {
      image: 'caddy:2.10-alpine',
      ports: [{ mode: 'ingress', target: 8088, published: '8088', protocol: 'tcp' }],
      volumes: [
        {
          type: 'bind',
          source: '/source/Caddyfile',
          target: '/etc/caddy/Caddyfile',
          read_only: true,
          bind: {},
        },
      ],
      networks: { default: { aliases: ['app.localhost'] } },
      depends_on: {
        backend: { condition: 'service_started', required: true },
        frontend: { condition: 'service_started', required: true },
      },
      environment: {
        SITE_ADDRESS: 'http://app.localhost:8088',
        BACKEND_UPSTREAM: 'backend:3000',
        FRONTEND_UPSTREAM: 'frontend:4173',
      },
    },
    frontend: {
      build: { context: '/source', dockerfile: 'frontend/Dockerfile' },
      networks: { default: null },
    },
    backend: {
      build: { context: '/source', dockerfile: 'backend/Dockerfile' },
      environment: { HOST: '0.0.0.0', PORT: '3000' },
      networks: { default: null },
    },
  },
};

test('compose compiler emits a bounded role-aware task model', () => {
  const result = compileNormalizedCompose(valid);
  assert.equal(result.services.find((service) => service.name === 'backend')?.role, 'backend');
  assert.deepEqual(result.services.find((service) => service.name === 'backend')?.environment, {
    HOST: '0.0.0.0',
    PORT: '3000',
  });
});

test('factory.compose-unsupported-field rejects dangerous service capabilities', () => {
  for (const field of ['privileged', 'network_mode', 'devices']) {
    assert.throws(
      () =>
        compileNormalizedCompose({
          ...valid,
          services: { ...valid.services, backend: { ...valid.services.backend, [field]: true } },
        }),
      new RegExp(field),
    );
  }
});

test('compose compiler prevents dependencies from becoming public', () => {
  assert.throws(
    () =>
      compileNormalizedCompose({
        ...valid,
        services: {
          ...valid.services,
          backend: { ...valid.services.backend, ports: [{ target: 3000 }] },
        },
      }),
    /only the router may publish ports/,
  );
});

test('factory.compose-semantic-rejection rejects build, dependency, port and router image drift', () => {
  for (const source of [
    {
      ...valid,
      services: {
        ...valid.services,
        backend: {
          ...valid.services.backend,
          build: { context: '/source', dockerfile: 'other/Dockerfile' },
        },
      },
    },
    {
      ...valid,
      services: {
        ...valid.services,
        backend: {
          ...valid.services.backend,
          depends_on: { frontend: { condition: 'service_started', required: true } },
        },
      },
    },
    {
      ...valid,
      services: {
        ...valid.services,
        caddy: {
          ...valid.services.caddy,
          ports: [{ mode: 'ingress', target: 9999, published: '9999', protocol: 'tcp' }],
        },
      },
    },
    {
      ...valid,
      services: { ...valid.services, caddy: { ...valid.services.caddy, image: 'nginx:latest' } },
    },
  ])
    assert.throws(() => compileNormalizedCompose(source));
});
