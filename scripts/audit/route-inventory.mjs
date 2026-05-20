import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'apps', 'api', 'src');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractRoutes(filePath, content) {
  const rel = path.relative(ROOT, filePath);
  const ctrlMatch = content.match(/@Controller\(([^)]+)\)/);
  const base = ctrlMatch ? ctrlMatch[1].replace(/['"`]/g, '').trim() : '';

  const routes = [];
  const methodRe = /@(Get|Post|Patch|Delete|Put)\(([^)]*)\)\s*[\r\n]+\s*(?:@[^\n]+\n\s*)*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = methodRe.exec(content))) {
    const http = m[1].toUpperCase();
    const arg = (m[2] || '').trim();
    const sub = arg ? arg.replace(/['"`]/g, '').trim() : '';
    const fn = m[3];
    routes.push({ method: http, path: `/${base}${sub ? '/' + sub : ''}`.replace(/\/+/g, '/'), handler: fn, file: rel });
  }
  return routes;
}

const files = walk(path.join(API_DIR, 'modules'));
let all = [];
for (const f of files) {
  const c = read(f);
  all = all.concat(extractRoutes(f, c));
}

all.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

const md = [];
md.push('# API Route Inventory');
md.push('');
md.push(`Generated at: ${new Date().toISOString()}`);
md.push('');
md.push('| Method | Path | Handler | File |');
md.push('|---|---|---|---|');
for (const r of all) {
  md.push(`| ${r.method} | ${r.path} | ${r.handler} | ${r.file} |`);
}

fs.mkdirSync(path.join(ROOT, '.artifacts', 'audit'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.artifacts', 'audit', 'api-routes-inventory.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'audit', 'api-routes-inventory.json'), JSON.stringify(all, null, 2));

console.log(`Wrote ${all.length} routes to docs/api-routes-inventory.md`);
