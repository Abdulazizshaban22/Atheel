#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['route inventory', ['node', 'scripts/audit/route-inventory.mjs']],
  ['domain wiring audit', ['node', 'scripts/domain-wiring-audit.mjs']],
  ['typescript parse audit', ['node', 'scripts/audit/ts-parse-audit.mjs']],
];

for (const [label, command] of steps) {
  console.log(`\n=== ${label} ===`);
  const [cmd, ...args] = command;
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if ((result.status ?? 1) !== 0) {
    console.error(`Baseline stabilization failed at step: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('Baseline stabilization verification completed successfully.');
