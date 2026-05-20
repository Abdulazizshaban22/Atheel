#!/usr/bin/env node
const checks = [
  'db:generate',
  'typecheck',
  'build',
  'api:smoke',
  'runtime:wiring:audit'
];
console.log('Final Closure verification plan');
for (const c of checks) console.log('- ' + c);
console.log('Use Prisma migrate deploy in CI/CD for non-development environments.');
console.log('Use pnpm runtime:closure:run to execute the closure pipeline locally or in CI.');
