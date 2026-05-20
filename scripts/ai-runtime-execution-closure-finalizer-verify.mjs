#!/usr/bin/env node
import fs from 'node:fs';

const paths = [
  'apps/api/src/modules/retrieval-runtime/retrieval-runtime.service.ts',
  'apps/api/src/modules/ai-trust/ai-trust.service.ts',
  'apps/api/src/modules/evals-runtime/evals-runtime.service.ts',
  'apps/web/app/dashboards/ai-quality/page.tsx',
];
const missing = paths.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('Missing files:', missing.join(', '));
  process.exit(1);
}
console.log('AI runtime execution closure finalizer files present.');
