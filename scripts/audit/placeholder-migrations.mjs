import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, 'packages', 'db', 'prisma', 'migrations');
const KEYWORDS = ['placeholder', 'scaffold', 'generate actual sql', 'use prisma migrate', 'safe scaffold'];
const rows = [];
for (const name of fs.readdirSync(MIGRATIONS)) {
  const file = path.join(MIGRATIONS, name, 'migration.sql');
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const header = text.split(/\r?\n/).slice(0, 12).join(' ');
  const matches = KEYWORDS.filter((keyword) => header.toLowerCase().includes(keyword));
  if (matches.length) rows.push({ migration: name, keywords: matches, file: path.relative(ROOT, file) });
}
rows.sort((a, b) => a.migration.localeCompare(b.migration));
const md = [
  '# Placeholder Migrations Inventory',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `- Placeholder migrations detected: ${rows.length}`,
  '',
  '| Migration | Keywords | File |',
  '|---|---|---|',
  ...rows.map((row) => `| ${row.migration} | ${row.keywords.join(', ')} | ${row.file} |`),
  '',
  '## Closure rule',
  '- Every placeholder migration must be replaced with generated SQL committed from Prisma Migrate before staging promotion.',
];
fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'PLACEHOLDER_MIGRATIONS.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'placeholder-migrations.json'), JSON.stringify(rows, null, 2));
console.log(`Generated placeholder migrations inventory (${rows.length}).`);
