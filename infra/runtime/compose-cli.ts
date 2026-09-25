import { readFileSync } from 'node:fs';
import { compileNormalizedCompose } from './compose.js';

const file = process.argv[2];
if (file === undefined) throw new Error('usage: compose-cli.ts normalized-compose.json');
const compiled = compileNormalizedCompose(JSON.parse(readFileSync(file, 'utf8')));
process.stdout.write(
  `${JSON.stringify({ serviceCount: compiled.services.length, cpu: compiled.cpu, memoryMiB: compiled.memoryMiB })}\n`,
);
