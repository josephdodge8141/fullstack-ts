import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import type { Envelope } from '@cucumber/messages';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';

export async function runCucumberMessages(
  features: Readonly<Record<string, string>>,
  options: Readonly<{
    retry?: number;
    supportBody?: string;
  }> = {},
): Promise<readonly Envelope[]> {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'behavior-runtime-'));
  try {
    const featurePaths = await Promise.all(
      Object.entries(features).map(async ([relativePath, source]) => {
        const featurePath = path.join(temporaryRoot, relativePath);
        await mkdir(path.dirname(featurePath), { recursive: true });
        await writeFile(featurePath, source, 'utf8');
        return featurePath;
      }),
    );
    const supportPath = path.join(temporaryRoot, 'support.cjs');
    const cucumberEntry = createRequire(import.meta.url).resolve('@cucumber/cucumber');
    await writeFile(
      supportPath,
      `const { After, Before, Given } = require(${JSON.stringify(cucumberEntry)});
${
  options.supportBody ??
  `Before(function () {});
After(function () {});
Given(/^.*$/, function () {});`
}
`,
      'utf8',
    );

    const { runConfiguration } = await loadConfiguration(
      {
        file: false,
        provided: {
          format: [],
          paths: featurePaths,
          publish: false,
          require: [supportPath],
          retry: options.retry ?? 0,
        },
      },
      { cwd: process.cwd() },
    );
    const envelopes: Envelope[] = [];
    const output = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    await runCucumber(
      runConfiguration,
      { cwd: process.cwd(), stdout: output, stderr: output },
      (envelope) => envelopes.push(envelope),
    );
    return envelopes;
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}
