#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  return res.status ?? 1;
}

function detect(cmd) {
  return spawnSync('bash', ['-lc', `command -v ${cmd} >/dev/null 2>&1`]).status === 0;
}

const hasCorepack = detect('corepack');
const hasPnpm = detect('pnpm');

if (!hasPnpm) {
  if (!hasCorepack) {
    console.error('pnpm is not available and corepack is missing.');
    process.exit(1);
  }
  console.log('pnpm not found. Activating pnpm via corepack...');
  let code = run('corepack', ['enable']);
  if (code !== 0) process.exit(code);
  code = run('corepack', ['prepare', 'pnpm@9.15.0', '--activate']);
  if (code !== 0) process.exit(code);
}

if (!existsSync('node_modules')) {
  console.log('node_modules not found. Installing workspace dependencies...');
  const code = run('pnpm', ['install', '--no-frozen-lockfile']);
  if (code !== 0) process.exit(code);
} else {
  console.log('node_modules already present. Skipping install.');
}

console.log('Toolchain bootstrap finished.');
