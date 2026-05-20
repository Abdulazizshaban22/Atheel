import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const items = [
  {
    key: 'truth_matrix',
    label: 'Truth Matrix',
    kind: 'implemented',
    paths: ['scripts/audit/truth-matrix.mjs', 'docs/closure/TRUTH_MATRIX.md', '.artifacts/closure/truth-matrix.json'],
    note: 'Inventory + scored readiness matrix for API modules.',
  },
  {
    key: 'datastore_usage',
    label: 'حصر كل استخدامات DataStoreService',
    kind: 'implemented',
    paths: ['scripts/audit/datastore-usage-inventory.mjs', 'docs/closure/DATASTORE_USAGE_INVENTORY.md', '.artifacts/closure/datastore-usage-inventory.json'],
    note: 'Static inventory for every remaining DataStoreService usage.',
  },
  {
    key: 'placeholder_migrations',
    label: 'حصر كل placeholder migrations',
    kind: 'implemented',
    paths: ['scripts/audit/placeholder-migrations.mjs', 'docs/closure/PLACEHOLDER_MIGRATIONS.md', '.artifacts/closure/placeholder-migrations.json'],
    note: 'Detects scaffold and placeholder migration headers.',
  },
  {
    key: 'endpoint_inventory',
    label: 'حصر كل endpoints الأساسية',
    kind: 'implemented',
    paths: ['scripts/audit/endpoint-inventory.mjs', 'docs/closure/ENDPOINT_INVENTORY.md', '.artifacts/closure/endpoint-inventory.json'],
    note: 'Inventories all routes and tags core modules.',
  },
  {
    key: 'definition_of_done',
    label: 'Definition of Done النهائي',
    kind: 'implemented',
    paths: ['docs/closure/DEFINITION_OF_DONE.md'],
    note: 'Final acceptance criteria for closure and readiness.',
  },
  {
    key: 'core_crud_prisma',
    label: 'نقل Core CRUD كامل إلى Prisma فقط',
    kind: 'implemented',
    paths: [
      'apps/api/src/modules/auth/auth.service.ts',
      'apps/api/src/modules/users/users.service.ts',
      'apps/api/src/modules/projects/projects.repository.ts',
      'apps/api/src/modules/content/content.repository.ts',
      'apps/api/src/modules/attachments/attachments.repository.ts',
      'apps/api/src/modules/approvals/approvals.repository.ts'
    ],
    note: 'Core CRUD/auth repositories now fail fast instead of falling back to in-memory storage.',
  },
  {
    key: 'close_core_modules',
    label: 'إقفال auth + approvals + attachments + projects + content',
    kind: 'implemented',
    paths: [
      'apps/api/src/modules/auth/auth.service.ts',
      'apps/api/src/modules/approvals/approvals.repository.ts',
      'apps/api/src/modules/attachments/attachments.repository.ts',
      'apps/api/src/modules/projects/projects.repository.ts',
      'apps/api/src/modules/content/content.repository.ts'
    ],
    note: 'Critical repositories and auth/session persistence hardened to Prisma-only source of truth.',
  },
  {
    key: 'disable_fallback_staging',
    label: 'منع fallback في staging',
    kind: 'implemented',
    paths: ['apps/api/src/common/db-fallback.ts', 'apps/api/src/main.ts', '.env.example'],
    note: 'Strict environments block ALLOW_IN_MEMORY_FALLBACK=true and fail fast.',
  },
  {
    key: 'seeds_cleanup',
    label: 'تنظيف seeds',
    kind: 'implemented',
    paths: ['packages/db/prisma/seed.ts', '.env.example'],
    note: 'Baseline seed is default; demo seed is explicit via SEED_PROFILE=demo.',
  },
  {
    key: 'ci_cd',
    label: 'تثبيت CI/CD',
    kind: 'implemented',
    paths: ['.github/workflows/ci-verify.yml', 'package.json'],
    note: 'CI now brings Postgres + Redis, runs migrations, build, closure audits, smoke tests, and uploads closure artifacts.',
  },
  {
    key: 'migrations_closure',
    label: 'إقفال migrations',
    kind: 'partially_implemented',
    paths: ['docs/closure/PLACEHOLDER_MIGRATIONS.md', 'docs/closure/MIGRATION_CLOSURE_READINESS.md', '.github/workflows/release-gate.yml', 'docs/database/PRISMA_BASELINE_RUNBOOK.md'],
    note: 'Inventory, release gate, and runbook are in place, but placeholder SQL still needs generated Prisma SQL before true staging promotion.',
  },
  {
    key: 'worker_contracts',
    label: 'إقفال worker contracts',
    kind: 'implemented',
    paths: ['scripts/audit/worker-contracts.mjs', 'docs/closure/WORKER_CONTRACTS.md', '.artifacts/closure/worker-contracts.json'],
    note: 'Queue names, tokens, and renderer defaults are inventoried and frozen as contract-level configuration.',
  },
  {
    key: 'smoke_health_observability',
    label: 'smoke + e2e + health + observability',
    kind: 'implemented',
    paths: ['.github/workflows/ci-verify.yml', 'apps/api/test/platform-readiness.e2e-spec.ts', 'scripts/api-smoke.mjs', 'docs/closure/STAGING_DRESS_REHEARSAL.md'],
    note: 'CI smoke path and rehearsal checklist now explicitly include health, queues, metrics, and runtime checks.',
  },
  {
    key: 'web_shell',
    label: 'إعادة بناء shell والرحلات الأساسية في الويب',
    kind: 'implemented',
    paths: ['apps/web/components/AppShell.tsx', 'apps/web/app/page.tsx'],
    note: 'Navigation simplified around closure-critical journeys instead of sprawling surface area.',
  },
  {
    key: 'design_system',
    label: 'Design system',
    kind: 'implemented',
    paths: ['apps/web/app/design-system/page.tsx'],
    note: 'Baseline UI tokens and examples centralized for closure stage.',
  },
  {
    key: 'review_center',
    label: 'Review Center',
    kind: 'implemented',
    paths: ['apps/web/app/review-center/page.tsx'],
    note: 'Aggregates approvals and attachments for review/readiness workflows.',
  },
  {
    key: 'operations_center',
    label: 'Operations Center',
    kind: 'implemented',
    paths: ['apps/web/app/operations-center/page.tsx'],
    note: 'Shows readiness, queues, and startup profile in one shell.',
  },
  {
    key: 'ai_center',
    label: 'AI Center',
    kind: 'implemented',
    paths: ['apps/web/app/ai-center/page.tsx'],
    note: 'Brings runtime health, scorecards, and quality into a single closure surface.',
  },
  {
    key: 'hardening',
    label: 'hardening',
    kind: 'implemented',
    paths: ['apps/api/src/common/db-fallback.ts', '.github/workflows/ci-verify.yml', 'docs/closure/DEFINITION_OF_DONE.md'],
    note: 'Fail-fast persistence, tighter CI policy, and explicit closure gates.',
  },
  {
    key: 'staging_dress_rehearsal',
    label: 'staging dress rehearsal',
    kind: 'implemented',
    paths: ['docs/closure/STAGING_DRESS_REHEARSAL.md'],
    note: 'Operational rehearsal script defined for pre-go-live promotion.',
  },
  {
    key: 'documentation_pack',
    label: 'documentation pack',
    kind: 'implemented',
    paths: ['docs/closure/DOCUMENTATION_PACK.md', 'docs/closure/README.md'],
    note: 'Curated pack for engineering, operations, and due diligence.',
  },
  {
    key: 'sales_demo_pack',
    label: 'sales/demo pack',
    kind: 'implemented',
    paths: ['docs/closure/SALES_DEMO_PACK.md'],
    note: 'Controlled narrative for demos without overstating readiness.',
  },
  {
    key: 'final_readiness_review',
    label: 'final readiness review',
    kind: 'implemented',
    paths: ['scripts/final-readiness-review.mjs', 'docs/closure/FINAL_READINESS_REVIEW.md'],
    note: 'Final closure/reporting summary generated from closure outputs.',
  },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = items.map((item) => ({
  ...item,
  present: item.paths.every(exists),
  presentCount: item.paths.filter(exists).length,
  totalPaths: item.paths.length,
}));

const summary = rows.reduce((acc, row) => {
  acc.total += 1;
  if (row.kind === 'implemented') acc.implemented += 1;
  if (row.kind === 'partially_implemented') acc.partiallyImplemented += 1;
  if (row.present) acc.present += 1;
  return acc;
}, { total: 0, implemented: 0, partiallyImplemented: 0, present: 0 });

const statusLabel = (row) => {
  if (!row.present) return 'missing_artifacts';
  if (row.kind === 'partially_implemented') return 'partial';
  return 'ready_for_verification';
};

const md = [
  '# Implementation Status Matrix',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `- Requested items: ${summary.total}`,
  `- Implemented items: ${summary.implemented}`,
  `- Partially implemented items: ${summary.partiallyImplemented}`,
  `- Items with all expected artifacts present: ${summary.present}`,
  '',
  '| Item | Status | Evidence | Note |',
  '|---|---|---|---|',
  ...rows.map((row) => `| ${row.label} | ${statusLabel(row)} | ${row.presentCount}/${row.totalPaths} files | ${row.note} |`),
  '',
  '## Remaining hard blocker',
  '- Placeholder migrations are inventoried and policy-gated, but not all scaffold migration files have been replaced with generated Prisma SQL yet.',
  '- Workspace install/build/runtime verification still depends on an installable dependency bundle and live services.',
];

fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'IMPLEMENTATION_STATUS_MATRIX.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'implementation-status.json'), JSON.stringify({ summary, rows }, null, 2));
console.log('Generated implementation status matrix.');
