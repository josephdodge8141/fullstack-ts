import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const governedFolders = [
  '.',
  '.claude',
  '.github',
  '.github/workflows',
  'backend',
  'backend/config',
  'backend/controllers',
  'backend/middleware',
  'backend/models',
  'backend/routes',
  'backend/routes/v1',
  'backend/services',
  'backend/utils',
  'docs',
  'frontend',
  'frontend/assets',
  'frontend/components',
  'frontend/context',
  'frontend/hooks',
  'frontend/pages',
  'frontend/services',
  'frontend/utils',
  'infra',
  'packages',
  'packages/cucumber',
  'packages/zod',
  'tooling',
] as const;

async function optionalText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function skillNames(root: string, base: '.claude' | '.agents'): Promise<string[]> {
  try {
    const entries = await readdir(path.join(root, base, 'skills'), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function checkInstructions(
  root: string,
  folders: readonly string[] = governedFolders,
): Promise<string[]> {
  const errors: string[] = [];
  for (const folder of folders) {
    const prefix = folder === '.' ? '' : `${folder}/`;
    const claudePath = `${prefix}CLAUDE.md`;
    const agentsPath = `${prefix}AGENTS.md`;
    const [claude, agents] = await Promise.all([
      optionalText(path.join(root, claudePath)),
      optionalText(path.join(root, agentsPath)),
    ]);
    if (claude === undefined) errors.push(`${claudePath} is missing`);
    if (agents === undefined) errors.push(`${agentsPath} is missing`);
    if (claude !== undefined && agents !== undefined && claude !== agents) {
      errors.push(`${claudePath} and ${agentsPath} differ`);
    }
  }

  const [canonicalNames, mirrorNames] = await Promise.all([
    skillNames(root, '.claude'),
    skillNames(root, '.agents'),
  ]);
  const canonicalSet = new Set(canonicalNames);
  const mirrorSet = new Set(mirrorNames);
  for (const name of mirrorNames.sort()) {
    if (!canonicalSet.has(name)) errors.push(`.agents/skills/${name}/SKILL.md has no canonical source`);
  }
  for (const name of canonicalNames.sort()) {
    const canonicalPath = `.claude/skills/${name}/SKILL.md`;
    const mirrorPath = `.agents/skills/${name}/SKILL.md`;
    const [canonical, mirror] = await Promise.all([
      optionalText(path.join(root, canonicalPath)),
      optionalText(path.join(root, mirrorPath)),
    ]);
    if (!mirrorSet.has(name) || mirror === undefined) {
      errors.push(`${mirrorPath} is missing`);
    } else if (canonical !== mirror) {
      errors.push(`${canonicalPath} and ${mirrorPath} differ`);
    }
  }
  return errors.sort();
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const errors = await checkInstructions(root);
  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Instruction and skill copies are identical.\n');
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
