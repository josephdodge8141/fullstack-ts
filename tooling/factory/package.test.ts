import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  exportFactory,
  validateDesignSystem,
  validateExportManifest,
  validateUiFoundation,
} from './package.js';

test('the factory includes the pinned UI foundation', async () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const inventory: unknown = JSON.parse(
    await readFile(path.join(root, 'frontend/ui-foundation.json'), 'utf8'),
  );
  assert.ok(typeof inventory === 'object' && inventory !== null && 'files' in inventory);
  assert.ok(Array.isArray(inventory.files));
  for (const file of inventory.files) {
    assert.equal(typeof file, 'string');
    await assert.doesNotReject(access(path.join(root, file)), file);
  }
  assert.ok(inventory.files.length >= 60);
  for (const required of [
    'frontend/components.json',
    'frontend/components/ui/button.tsx',
    'frontend/components/ui/dialog.tsx',
    'frontend/components/ui/select.tsx',
    'frontend/components/ui/sidebar.tsx',
  ]) {
    assert.ok(inventory.files.includes(required));
  }
});

test('the factory includes the curated design-system extensions', async () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const inventory: unknown = JSON.parse(
    await readFile(path.join(root, 'frontend/design-system/catalog.json'), 'utf8'),
  );
  assert.ok(typeof inventory === 'object' && inventory !== null && 'files' in inventory);
  assert.ok(Array.isArray(inventory.files));
  for (const file of inventory.files) {
    assert.equal(typeof file, 'string');
    await assert.doesNotReject(access(path.join(root, file)), file);
  }
  for (const file of [
    'frontend/design-system/catalog.json',
    'frontend/design-system/data-grid.tsx',
    'frontend/design-system/date-picker.tsx',
    'frontend/design-system/layout.tsx',
    'frontend/design-system/tree-view.tsx',
    'frontend/design-system/transfer-list.tsx',
  ]) {
    assert.ok(inventory.files.includes(file));
  }
});

test('the factory rejects a missing curated design-system component', () => {
  assert.throws(
    () =>
      validateDesignSystem(
        ['frontend/design-system/catalog.json'],
        ['frontend/design-system/catalog.json', 'frontend/design-system/layout.tsx'],
      ),
    /incomplete design system: frontend\/design-system\/layout.tsx/,
  );
});

test('the factory rejects a missing pinned UI component', () => {
  assert.throws(
    () =>
      validateUiFoundation(
        ['frontend/components/ui/button.tsx'],
        ['frontend/components/ui/button.tsx', 'frontend/components/ui/dialog.tsx'],
      ),
    /incomplete UI foundation: frontend\/components\/ui\/dialog.tsx/,
  );
});

test('the factory rejects an unlisted addition to the fixed UI base', () => {
  assert.throws(
    () =>
      validateUiFoundation(
        ['frontend/components/ui/button.tsx', 'frontend/components/ui/extra.tsx'],
        ['frontend/components/ui/button.tsx'],
      ),
    /changed UI foundation: frontend\/components\/ui\/extra.tsx/,
  );
});

const execFileAsync = promisify(execFile);

test('public factory rejects non-public artifacts', () => {
  assert.throws(
    () => validateExportManifest(['README.md', '.env', 'backend/dist/index.js']),
    /non-public export artifact/,
  );
});

test('public factory exports sorted tracked source without build artifacts', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'factory-test-'));
  const source = path.join(temporaryRoot, 'source');
  const destination = path.join(temporaryRoot, 'clone');
  try {
    await mkdir(path.join(source, 'backend'), { recursive: true });
    await writeFile(path.join(source, 'README.md'), '# fixture\n');
    await writeFile(path.join(source, 'backend', 'index.ts'), 'export {};\n');
    await execFileAsync('git', ['init', '--quiet'], { cwd: source });
    await execFileAsync('git', ['add', 'README.md', 'backend/index.ts'], { cwd: source });
    await execFileAsync(
      'git',
      [
        '-c',
        'user.name=Factory Test',
        '-c',
        'user.email=factory@example.test',
        'commit',
        '--quiet',
        '-m',
        'fixture',
      ],
      { cwd: source },
    );
    const files = await exportFactory(source, destination);
    assert.deepEqual(
      files,
      [...files].sort((left, right) => left.localeCompare(right)),
    );
    assert.equal(await readFile(path.join(destination, 'README.md'), 'utf8'), '# fixture\n');
    assert.deepEqual(files, ['backend/index.ts', 'README.md']);
    assert.equal(files.includes('.env'), false);

    await writeFile(path.join(source, 'README.md'), '# changed\n');
    await assert.rejects(
      exportFactory(source, path.join(temporaryRoot, 'dirty-clone')),
      /requires a committed tracked tree/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
