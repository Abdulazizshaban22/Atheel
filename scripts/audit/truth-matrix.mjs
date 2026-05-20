import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'apps', 'api', 'src', 'modules');
const WEB_DIR = path.join(ROOT, 'apps', 'web', 'app');
const TEST_DIR = path.join(ROOT, 'apps', 'api', 'test');
const CORE = new Set(['auth', 'users', 'projects', 'content', 'attachments', 'approvals', 'health', 'metrics']);

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function countFiles(dir, suffix) { return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(suffix)).length : 0; }

const rows = [];
for (const name of fs.readdirSync(MODULES_DIR)) {
  const moduleDir = path.join(MODULES_DIR, name);
  if (!fs.statSync(moduleDir).isDirectory()) continue;
  const files = fs.readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));
  const contents = files.map((f) => read(path.join(moduleDir, f))).join('\n');
  const controllers = files.filter((f) => f.endsWith('.controller.ts')).length;
  const services = files.filter((f) => f.endsWith('.service.ts')).length;
  const repositories = files.filter((f) => f.endsWith('.repository.ts')).length;
  const routes = (contents.match(/@(Get|Post|Patch|Delete|Put)\(/g) || []).length;
  const usesPrisma = contents.includes('PrismaService');
  const usesDataStore = contents.includes('DataStoreService');
  const webExists = fs.existsSync(path.join(WEB_DIR, name));
  const tests = fs.existsSync(TEST_DIR) ? fs.readdirSync(TEST_DIR).filter((f) => f.toLowerCase().includes(name.toLowerCase())).length : 0;

  let score = 35;
  if (usesPrisma) score += 20;
  if (repositories) score += 10;
  if (controllers) score += 8;
  if (routes) score += 8;
  if (tests) score += 10;
  if (webExists) score += 4;
  if (usesDataStore) score -= 12;
  if (CORE.has(name)) score += 5;
  score = Math.max(0, Math.min(100, score));

  const state = score >= 75 ? 'near_ready' : score >= 55 ? 'needs_closure' : 'scaffold_heavy';
  const blocker = usesDataStore && CORE.has(name)
    ? 'Core module still references DataStoreService.'
    : !usesPrisma && CORE.has(name)
      ? 'Core module lacks explicit Prisma path.'
      : !routes
        ? 'No controller routes detected.'
        : tests === 0
          ? 'No module-specific API tests detected.'
          : 'Closure backlog remains.';

  rows.push({ name, core: CORE.has(name), controllers, services, repositories, routes, usesPrisma, usesDataStore, webExists, tests, score, state, blocker });
}

rows.sort((a, b) => (Number(b.core) - Number(a.core)) || b.score - a.score || a.name.localeCompare(b.name));
const md = [
  '# Truth Matrix',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  '| Core | Module | Score | State | Routes | Prisma | DataStore | Tests | Web | Blocker |',
  '|---|---|---:|---|---:|---|---|---:|---|---|',
  ...rows.map((row) => `| ${row.core ? 'yes' : 'no'} | ${row.name} | ${row.score} | ${row.state} | ${row.routes} | ${row.usesPrisma ? 'yes' : 'no'} | ${row.usesDataStore ? 'yes' : 'no'} | ${row.tests} | ${row.webExists ? 'yes' : 'no'} | ${row.blocker} |`),
  '',
  '## Reading guide',
  '- near_ready: clear implementation path exists, but still requires verification and staging rehearsal.',
  '- needs_closure: usable module but closure work remains in persistence, tests, or UX.',
  '- scaffold_heavy: broad surface area exceeds implementation depth.',
];
fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'TRUTH_MATRIX.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'truth-matrix.json'), JSON.stringify(rows, null, 2));
console.log(`Generated truth matrix (${rows.length} modules).`);
