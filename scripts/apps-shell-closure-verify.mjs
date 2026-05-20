#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/audit/ts-parse-audit.mjs']],
  ['node', ['scripts/audit/ts-type-risk-audit.mjs']],
  ['npx', ['tsc', '-p', 'apps/api/tsconfig.json', '--noEmit', '--pretty', 'false']],
  ['node', ['scripts/audit/ts-packages-full-audit.mjs']],
  ['node', ['scripts/audit/ts-app-shell-audit.mjs']],
];

for (const [cmd, args] of steps) {
  const actualCmd = process.platform === 'win32' && cmd === 'npx' ? 'npx.cmd' : cmd;
  const run = spawnSync(actualCmd, args, { stdio: 'inherit', cwd: process.cwd(), encoding: 'utf8' });
  if (run.status !== 0) process.exit(run.status || 1);
}

console.log('App shell closure verify passed.');
