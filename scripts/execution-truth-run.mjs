#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(label, cmd, args) {
  console.log(`\\n=== ${label} ===`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if ((res.status ?? 1) !== 0) {
    console.error(`Step failed: ${label}`);
    process.exit(res.status ?? 1);
  }
}

run('toolchain bootstrap', 'node', ['scripts/toolchain-bootstrap.mjs']);
run('runtime preflight', 'node', ['scripts/runtime-preflight.mjs']);
run('runtime closure run', 'node', ['scripts/runtime-closure-run.mjs']);
console.log('Execution truth run completed successfully.');
