import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'packages', 'db', 'prisma', 'migrations');
const KEYWORDS = ['placeholder', 'scaffold', 'generate actual sql', 'use prisma migrate', 'safe scaffold'];
const RELEASE_CHANNEL = (process.env.CI_RELEASE_CHANNEL || process.env.RELEASE_CHANNEL || 'ci').toLowerCase();
const STRICT_CHANNELS = new Set(['staging', 'stage', 'preprod', 'production', 'prod', 'release']);

function classifyMigration(text) {
  const lower = text.toLowerCase();
  const header = lower.split(/\r?\n/).slice(0, 20).join(' ');
  const matchedKeywords = KEYWORDS.filter((keyword) => header.includes(keyword));
  const nonCommentStatements = text
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .filter((chunk) => !chunk.startsWith('--'));
  const hasExecutableSql = nonCommentStatements.length > 0;

  if (matchedKeywords.length) {
    return { status: hasExecutableSql ? 'mixed_placeholder' : 'placeholder', matchedKeywords, hasExecutableSql, statementCount: nonCommentStatements.length };
  }

  return { status: hasExecutableSql ? 'generated_or_curated' : 'empty', matchedKeywords, hasExecutableSql, statementCount: nonCommentStatements.length };
}

const rows = [];
for (const name of fs.readdirSync(MIGRATIONS_DIR)) {
  const file = path.join(MIGRATIONS_DIR, name, 'migration.sql');
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const classification = classifyMigration(text);
  rows.push({
    migration: name,
    file: path.relative(ROOT, file),
    ...classification,
  });
}
rows.sort((a, b) => a.migration.localeCompare(b.migration));

const totals = {
  total: rows.length,
  placeholder: rows.filter((row) => row.status === 'placeholder').length,
  mixedPlaceholder: rows.filter((row) => row.status === 'mixed_placeholder').length,
  generatedOrCurated: rows.filter((row) => row.status === 'generated_or_curated').length,
  empty: rows.filter((row) => row.status === 'empty').length,
};

const blockingRows = rows.filter((row) => row.status === 'placeholder' || row.status === 'mixed_placeholder');
const releaseBlocked = STRICT_CHANNELS.has(RELEASE_CHANNEL) && blockingRows.length > 0;

const markdown = [
  '# Migration Closure Readiness',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `- Release channel: ${RELEASE_CHANNEL}`,
  `- Total migrations: ${totals.total}`,
  `- Generated or curated: ${totals.generatedOrCurated}`,
  `- Placeholder only: ${totals.placeholder}`,
  `- Mixed placeholder: ${totals.mixedPlaceholder}`,
  `- Empty migrations: ${totals.empty}`,
  `- Release blocked: ${releaseBlocked ? 'yes' : 'no'}`,
  '',
  '## Rules',
  '- CI may inventory placeholder migrations, but staging/production promotion must fail while any placeholder or mixed-placeholder migration remains.',
  '- Use Prisma Migrate generated SQL for schema history, and keep hand-edited SQL only when reviewed and intentionally curated.',
  '',
  '| Migration | Status | Statements | Keywords | File |',
  '|---|---|---:|---|---|',
  ...rows.map((row) => `| ${row.migration} | ${row.status} | ${row.statementCount} | ${row.matchedKeywords.join(', ') || '—'} | ${row.file} |`),
  '',
  '## Blocking set',
  ...(blockingRows.length
    ? blockingRows.map((row) => `- ${row.migration}: ${row.status}${row.matchedKeywords.length ? ` (${row.matchedKeywords.join(', ')})` : ''}`)
    : ['- None']),
];

fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'MIGRATION_CLOSURE_READINESS.md'), markdown.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'migration-closure-readiness.json'), JSON.stringify({ releaseChannel: RELEASE_CHANNEL, totals, releaseBlocked, rows }, null, 2));
console.log(`Generated migration closure readiness (${rows.length} migrations, blocked=${releaseBlocked}).`);

if (releaseBlocked) {
  console.error('Release gate failed: placeholder migrations still exist for this release channel.');
  process.exit(2);
}
