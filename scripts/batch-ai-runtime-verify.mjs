
import fs from 'fs';
const required = [
  'apps/api/src/modules/agent-runtime/agent-runtime.module.ts',
  'apps/api/src/modules/retrieval-runtime/retrieval-runtime.module.ts',
  'apps/api/src/modules/ai-trust/ai-trust.module.ts',
  'apps/api/src/modules/evals-runtime/evals-runtime.module.ts',
  'apps/api/src/modules/memory-runtime/memory-runtime.module.ts',
  'apps/web/app/ai/runtime/page.tsx',
  'apps/web/app/dashboards/ai-quality/page.tsx',
  'apps/web/app/ai/memory/page.tsx',
];
const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: required.length }, null, 2));
