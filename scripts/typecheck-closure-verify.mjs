#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const steps = [
  ['TypeScript parse audit', ['node', 'scripts/audit/ts-parse-audit.mjs']],
  ['TypeScript type-risk audit', ['node', 'scripts/audit/ts-type-risk-audit.mjs']],
  ['TypeScript typecheck audit', ['node', 'scripts/audit/ts-typecheck-audit.mjs']],
  ['Domain wiring audit', ['node', 'scripts/domain-wiring-audit.mjs']],
];

for (const [label, command] of steps) {
  console.log(`\n== ${label} ==`);
  execFileSync(command[0], command.slice(1), { stdio: 'inherit' });
}

console.log('\nTypecheck closure verify completed.');
