#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/audit/ts-parse-audit.mjs']],
  ['node', ['scripts/audit/ts-type-risk-audit.mjs']],
  ['node', ['scripts/domain-wiring-audit.mjs']],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Type-risk closure verification passed.');
