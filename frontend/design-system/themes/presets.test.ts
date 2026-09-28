import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { colorTokens, designSystems, isSelectable, requiredTokens } from './registry.js';
import { designSystemPreferenceKey, readDesignSystemPreference } from './theme.js';

const themeRoot = path.dirname(fileURLToPath(import.meta.url));
const presetRoot = path.join(themeRoot, 'presets');

async function presetFiles(): Promise<string[]> {
  const entries = await readdir(presetRoot);
  return entries.filter(
    (entry) => /^ds-\d{2}-[a-z-]+\.css$/.test(entry) && !entry.endsWith('.fonts.css'),
  );
}

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  const end = css.indexOf('\n}', start);
  return end === -1 ? '' : css.slice(start, end);
}

function missingTokens(body: string, tokens: readonly string[]): string[] {
  return tokens.filter((token) => !new RegExp(`--${token}:\\s*[^;]+;`).test(body));
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('the registry keeps twenty stable slots', () => {
  assert.equal(designSystems.length, 20);
  assert.deepEqual(
    designSystems.map((brief) => brief.slot),
    Array.from({ length: 20 }, (_, index) => `DS-${String(index + 1).padStart(2, '0')}`),
  );
});

test('every selectable brief has exactly one preset file and every file has a brief', async () => {
  const files = await presetFiles();
  const fileIds = files.map((file) => file.slice(0, 5)).sort();
  const briefIds = designSystems.filter(isSelectable).map((brief) => brief.id);
  assert.deepEqual(fileIds, [...briefIds].sort());
  assert.equal(new Set(fileIds).size, fileIds.length);
});

test('main.css imports every preset file', async () => {
  const main = await readFile(path.join(themeRoot, 'main.css'), 'utf8');
  for (const file of await presetFiles()) {
    assert.match(main, new RegExp(`@import '\\./presets/${file.replace('.', '\\.')}';`));
  }
});

test('every preset defines the full token contract in light and every color in dark', async () => {
  for (const file of await presetFiles()) {
    const id = file.slice(0, 5);
    const css = await readFile(path.join(presetRoot, file), 'utf8');
    const light = block(css, `:root[data-theme='${id}']`);
    const dark = block(css, `:root[data-theme='${id}'].dark`);
    assert.notEqual(light, '', `${file} has no light block`);
    assert.notEqual(dark, '', `${file} has no dark block`);
    assert.deepEqual(missingTokens(light, requiredTokens), [], `${file} light block`);
    assert.deepEqual(missingTokens(dark, colorTokens), [], `${file} dark block`);
  }
});

test('the token check rejects a preset with a missing token', () => {
  const css = `:root[data-theme='ds-99'] {\n  --background: oklch(1 0 0);\n}`;
  assert.deepEqual(missingTokens(block(css, `:root[data-theme='ds-99']`), ['background', 'ring']), [
    'ring',
  ]);
});

test('saved preferences recover to the default when corrupt, unknown or open', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(readDesignSystemPreference(storage), { preset: 'ds-01', mode: 'light' });

  storage.setItem(designSystemPreferenceKey, '{"preset":');
  assert.deepEqual(readDesignSystemPreference(storage), { preset: 'ds-01', mode: 'light' });

  storage.setItem(designSystemPreferenceKey, JSON.stringify({ preset: 'ds-99', mode: 'dark' }));
  assert.deepEqual(readDesignSystemPreference(storage), { preset: 'ds-01', mode: 'light' });

  storage.setItem(designSystemPreferenceKey, JSON.stringify({ preset: 'ds-12', mode: 'dark' }));
  assert.deepEqual(readDesignSystemPreference(storage), { preset: 'ds-01', mode: 'dark' });

  storage.setItem(designSystemPreferenceKey, JSON.stringify({ preset: 'ds-03', mode: 'system' }));
  assert.deepEqual(readDesignSystemPreference(storage), { preset: 'ds-03', mode: 'system' });
});
