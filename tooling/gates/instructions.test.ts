import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkInstructions } from './instructions.js';

test('rejects a missing governed instruction pair', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'instructions-'));
  await mkdir(path.join(root, 'backend'), { recursive: true });
  await writeFile(path.join(root, 'backend', 'CLAUDE.md'), 'rules\n');
  const result = await checkInstructions(root, ['backend']);
  assert.deepEqual(result, ['backend/AGENTS.md is missing']);
});

test('rejects instruction contents that differ', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'instructions-'));
  await mkdir(path.join(root, 'frontend'), { recursive: true });
  await writeFile(path.join(root, 'frontend', 'CLAUDE.md'), 'one\n');
  await writeFile(path.join(root, 'frontend', 'AGENTS.md'), 'two\n');
  const result = await checkInstructions(root, ['frontend']);
  assert.deepEqual(result, ['frontend/CLAUDE.md and frontend/AGENTS.md differ']);
});

test('rejects missing and changed skill mirrors including supporting resources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'instructions-'));
  await mkdir(path.join(root, '.claude/skills/one/scripts'), { recursive: true });
  await mkdir(path.join(root, '.agents/skills/one/scripts'), { recursive: true });
  await mkdir(path.join(root, '.agents/skills/extra'), { recursive: true });
  await writeFile(path.join(root, '.claude/skills/one/SKILL.md'), 'canonical\n');
  await writeFile(path.join(root, '.agents/skills/one/SKILL.md'), 'changed\n');
  await writeFile(path.join(root, '.claude/skills/one/scripts/inventory.sh'), 'canonical script\n');
  await writeFile(path.join(root, '.agents/skills/one/scripts/inventory.sh'), 'changed script\n');
  await writeFile(path.join(root, '.agents/skills/one/scripts/extra.sh'), 'extra script\n');
  await writeFile(path.join(root, '.agents/skills/extra/SKILL.md'), 'extra\n');
  const result = await checkInstructions(root, []);
  assert.deepEqual(result, [
    '.agents/skills/extra/SKILL.md has no canonical source',
    '.agents/skills/one/scripts/extra.sh has no canonical source',
    '.claude/skills/one/SKILL.md and .agents/skills/one/SKILL.md differ',
    '.claude/skills/one/scripts/inventory.sh and .agents/skills/one/scripts/inventory.sh differ',
  ]);
});
