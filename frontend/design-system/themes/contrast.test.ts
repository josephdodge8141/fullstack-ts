import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/*
 * WCAG 2.2 contrast gate for every preset file in both modes. Text pairs need 4.5:1 and
 * non-text UI (focus ring, chart series) needs 3:1. Translucent colors are composited over
 * the surface they sit on. Set PRESET=ds-05 to audit a single preset while authoring.
 *
 * Known, documented exception: `--input` and `--border` are decorative hairlines in the shadcn
 * convention and are not gated; inputs remain identifiable by their label and focus ring.
 */

type Rgb = readonly [number, number, number];

interface Color {
  readonly rgb: Rgb;
  readonly alpha: number;
}

const presetRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'presets');

const textPairs: readonly (readonly [string, string])[] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['primary', 'background'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['destructive', 'background'],
  ['success-foreground', 'success'],
  ['warning-foreground', 'warning'],
  ['info-foreground', 'info'],
  ['link', 'background'],
  ['selection-foreground', 'selection'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
];

const nonTextPairs: readonly (readonly [string, string])[] = [
  ['ring', 'background'],
  ['chart-1', 'card'],
  ['chart-2', 'card'],
  ['chart-3', 'card'],
  ['chart-4', 'card'],
  ['chart-5', 'card'],
];

function parseOklch(value: string): Color | undefined {
  const match = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/.exec(
    value.trim(),
  );
  if (match === null) return undefined;
  const lightness = Number(match[1]) / (match[2] === '%' ? 100 : 1);
  const chroma = Number(match[3]);
  const hue = (Number(match[4]) * Math.PI) / 180;
  const alphaRaw = match[5] === undefined ? 1 : Number(match[5]);
  const alpha = match[6] === '%' ? alphaRaw / 100 : alphaRaw;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear: Rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return {
    rgb: [encode(clamp(linear[0])), encode(clamp(linear[1])), encode(clamp(linear[2]))],
    alpha,
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function encode(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function decode(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function composite(top: Color, bottom: Rgb): Rgb {
  const mix = (front: number, back: number): number => front * top.alpha + back * (1 - top.alpha);
  return [mix(top.rgb[0], bottom[0]), mix(top.rgb[1], bottom[1]), mix(top.rgb[2], bottom[2])];
}

function luminance(rgb: Rgb): number {
  return 0.2126 * decode(rgb[0]) + 0.7152 * decode(rgb[1]) + 0.0722 * decode(rgb[2]);
}

export function contrastRatio(first: Rgb, second: Rgb): number {
  const one = luminance(first);
  const two = luminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  const values = new Map<string, string>();
  if (start === -1) return values;
  const body = css.slice(start, css.indexOf('\n}', start));
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) values.set(name, value.replace(/\s+/g, ' '));
  }
  return values;
}

function resolve(tokens: Map<string, string>, name: string, onto: Rgb | undefined): Rgb | string {
  const raw = tokens.get(name);
  if (raw === undefined) return `--${name} is missing`;
  const color = parseOklch(raw);
  if (color === undefined) return `--${name} is not an oklch() color: ${raw}`;
  if (color.alpha >= 1) return color.rgb;
  if (onto === undefined) return `--${name} is translucent but has no opaque base`;
  return composite(color, onto);
}

export function auditPreset(css: string, id: string): string[] {
  const light = declarations(css, `:root[data-theme='${id}']`);
  const dark = new Map([...light, ...declarations(css, `:root[data-theme='${id}'].dark`)]);
  const failures: string[] = [];
  for (const [mode, tokens] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    const canvas = resolve(tokens, 'background', undefined);
    if (typeof canvas === 'string') {
      failures.push(`${id} ${mode}: ${canvas}`);
      continue;
    }
    for (const [pairs, minimum] of [
      [textPairs, 4.5],
      [nonTextPairs, 3],
    ] as const) {
      for (const [front, back] of pairs) {
        const backColor = resolve(tokens, back, canvas);
        if (typeof backColor === 'string') {
          failures.push(`${id} ${mode}: ${backColor}`);
          continue;
        }
        const frontColor = resolve(tokens, front, backColor);
        if (typeof frontColor === 'string') {
          failures.push(`${id} ${mode}: ${frontColor}`);
          continue;
        }
        const ratio = contrastRatio(frontColor, backColor);
        if (ratio < minimum) {
          failures.push(
            `${id} ${mode}: --${front} on --${back} is ${ratio.toFixed(2)}:1, needs ${String(minimum)}:1`,
          );
        }
      }
    }
  }
  return failures;
}

test('contrast math matches known WCAG ratios', () => {
  assert.equal(contrastRatio([1, 1, 1], [0, 0, 0]).toFixed(1), '21.0');
  const gray = parseOklch('oklch(0.6 0 0)');
  assert.ok(gray !== undefined);
  // A neutral OKLCH gray has relative luminance L^3: 0.6^3 = 0.216, which is 3.95:1 on white.
  assert.ok(Math.abs(contrastRatio(gray.rgb, [1, 1, 1]) - 3.95) < 0.02);
});

test('the audit rejects a low-contrast pair', () => {
  const css = `:root[data-theme='ds-99'] {\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.9 0 0);\n}`;
  assert.ok(auditPreset(css, 'ds-99').some((failure) => failure.includes('--foreground')));
});

test('every preset meets WCAG contrast in light and dark mode', async () => {
  const filter = process.env.PRESET;
  const files = (await readdir(presetRoot)).filter(
    (file) =>
      /^ds-\d{2}-[a-z-]+\.css$/.test(file) &&
      !file.endsWith('.fonts.css') &&
      (filter === undefined || file.startsWith(filter)),
  );
  assert.ok(files.length > 0);
  const failures: string[] = [];
  for (const file of files) {
    failures.push(
      ...auditPreset(await readFile(path.join(presetRoot, file), 'utf8'), file.slice(0, 5)),
    );
  }
  assert.deepEqual(failures, []);
});
