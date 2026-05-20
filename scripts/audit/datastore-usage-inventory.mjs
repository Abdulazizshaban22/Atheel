import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'apps', 'api', 'src');
const CORE = ['auth', 'users', 'projects', 'content', 'attachments', 'approvals'];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(TARGET);
const rows = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('DataStoreService')) continue;
  const rel = path.relative(ROOT, file);
  const hits = (content.match(/DataStoreService|dataStore\.|store\./g) || []).length;
  const parts = rel.split(path.sep);
  const moduleName = parts.includes('modules') ? parts[parts.indexOf('modules') + 1] : 'unknown';
  rows.push({ file: rel, moduleName, hits, core: CORE.includes(moduleName) });
}
rows.sort((a, b) => (Number(b.core) - Number(a.core)) || b.hits - a.hits || a.file.localeCompare(b.file));
const summary = { totalFiles: rows.length, coreFiles: rows.filter((x) => x.core).length, totalHits: rows.reduce((acc, row) => acc + row.hits, 0) };
const md = [
  '# DataStoreService Usage Inventory',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `- Files: ${summary.totalFiles}`,
  `- Core files: ${summary.coreFiles}`,
  `- Total hits: ${summary.totalHits}`,
  '',
  '| Core | Module | Hits | File |',
  '|---|---:|---:|---|',
  ...rows.map((row) => `| ${row.core ? 'yes' : 'no'} | ${row.moduleName} | ${row.hits} | ${row.file} |`),
  '',
  '## Closure intent',
  '- Core modules must be migrated to Prisma-only source of truth.',
  '- Non-core modules may remain on a documented migration backlog until their Prisma models and contracts are closed.',
];
fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'DATASTORE_USAGE_INVENTORY.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'datastore-usage-inventory.json'), JSON.stringify({ summary, rows }, null, 2));
console.log(`Generated DataStore inventory (${rows.length} files).`);
