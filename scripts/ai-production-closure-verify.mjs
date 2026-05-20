#!/usr/bin/env node
import { existsSync } from 'node:fs';
const required = [
  'apps/api/src/modules/retrieval-runtime/retrieval-runtime.service.ts',
  'apps/api/src/modules/ai-trust/ai-trust.service.ts',
  'apps/api/src/modules/evals-runtime/evals-runtime.service.ts',
  'apps/web/app/dashboards/ai-quality/page.tsx',
];
const missing = required.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('Missing files:', missing.join(', '));
  process.exit(1);
}
console.log('AI production closure scaffold verified.');
