#!/usr/bin/env node
import { existsSync } from 'fs';

const checks = [
  'apps/api/src/modules/retrieval-runtime/retrieval-runtime.service.ts',
  'apps/api/src/modules/ai-trust/ai-trust.service.ts',
  'apps/api/src/modules/evals-runtime/evals-runtime.service.ts',
  'apps/api/src/modules/agent-runtime/agent-runtime.service.ts',
  'apps/api/src/modules/memory-runtime/memory-runtime.service.ts',
  'apps/web/app/dashboards/ai-quality/page.tsx',
  'apps/web/app/ai/runtime/page.tsx',
  'apps/web/app/ai/memory/page.tsx',
];

const missing = checks.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('Missing expected files:', missing);
  process.exit(1);
}
console.log('AI runtime E2E closure expansion patch looks present.');
