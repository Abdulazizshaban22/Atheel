import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'apps', 'api', 'src', 'modules');
const CORE_MODULES = new Set(['auth', 'users', 'projects', 'content', 'attachments', 'approvals', 'health', 'metrics']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

function extractRoutes(filePath, content) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);
  const moduleName = parts[parts.indexOf('modules') + 1] || 'unknown';
  const ctrlMatch = content.match(/@Controller\(([^)]+)\)/);
  const base = ctrlMatch ? ctrlMatch[1].replace(/[\'"`]/g, '').trim() : '';
  const routes = [];
  const methodRe = /@(Get|Post|Patch|Delete|Put)\(([^)]*)\)\s*[\r\n]+\s*(?:@[^\n]+\n\s*)*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = methodRe.exec(content))) {
    const http = m[1].toUpperCase();
    const arg = (m[2] || '').trim();
    const sub = arg ? arg.replace(/[\'"`]/g, '').trim() : '';
    routes.push({
      moduleName,
      core: CORE_MODULES.has(moduleName),
      method: http,
      path: `/${base}${sub ? '/' + sub : ''}`.replace(/\/+/g, '/'),
      handler: m[3],
      file: rel,
    });
  }
  return routes;
}

let all = [];
for (const file of walk(API_DIR)) all = all.concat(extractRoutes(file, fs.readFileSync(file, 'utf8')));
all.sort((a, b) => (Number(b.core) - Number(a.core)) || a.moduleName.localeCompare(b.moduleName) || (a.path + a.method).localeCompare(b.path + b.method));
const md = [
  '# Endpoint Inventory',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `- Total routes: ${all.length}`,
  `- Core routes: ${all.filter((x) => x.core).length}`,
  '',
  '| Core | Module | Method | Path | Handler | File |',
  '|---|---|---|---|---|---|',
  ...all.map((row) => `| ${row.core ? 'yes' : 'no'} | ${row.moduleName} | ${row.method} | ${row.path} | ${row.handler} | ${row.file} |`),
];
fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'ENDPOINT_INVENTORY.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'endpoint-inventory.json'), JSON.stringify(all, null, 2));
console.log(`Generated endpoint inventory (${all.length} routes).`);
