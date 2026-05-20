import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['apps', 'packages'];
const OUTPUT_MD = path.join(ROOT, 'docs', 'closure', 'MODULE_BOUNDARY_AUDIT.md');
const OUTPUT_JSON = path.join(ROOT, '.artifacts', 'architecture', 'module-boundary-audit.json');

const PROJECT_PREFIXES = ['apps', 'packages'];
const WEB_FORBIDDEN_ALIAS_PREFIXES = ['@madar/db', '@madar/object-store'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.next', 'dist', 'coverage', '.turbo'].includes(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

function getProjectRoot(filePath) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);
  if (parts[0] === 'apps' && parts[1]) return path.join('apps', parts[1]);
  if (parts[0] === 'packages' && parts[1]) return path.join('packages', parts[1]);
  return null;
}

function getProjectKind(projectRoot) {
  if (!projectRoot) return 'unknown';
  if (projectRoot.startsWith('apps/web')) return 'web';
  if (projectRoot.startsWith('apps/api')) return 'api';
  if (projectRoot.startsWith('apps/worker')) return 'worker';
  if (projectRoot.startsWith('apps/exports-svc')) return 'exports-svc';
  if (projectRoot.startsWith('packages/')) return 'package';
  return 'other';
}

function parseImports(content) {
  const imports = [];
  const re = /(?:import\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\()(?:['"])([^'"]+)(?:['"])/g;
  let m;
  while ((m = re.exec(content))) imports.push(m[1]);
  return imports;
}

function resolveRelativeImport(filePath, specifier) {
  const resolved = path.resolve(path.dirname(filePath), specifier);
  return path.relative(ROOT, resolved);
}

const results = [];
const violations = [];

for (const base of SCAN_DIRS) {
  for (const filePath of walk(path.join(ROOT, base))) {
    const relFile = path.relative(ROOT, filePath);
    const sourceProject = getProjectRoot(filePath);
    const sourceKind = getProjectKind(sourceProject);
    const content = fs.readFileSync(filePath, 'utf8');
    const specs = parseImports(content);

    for (const specifier of specs) {
      const record = {
        file: relFile,
        sourceProject,
        sourceKind,
        specifier,
        classification: 'ok',
        reason: null,
      };

      if (specifier.startsWith('.')) {
        const resolvedRel = resolveRelativeImport(filePath, specifier);
        const targetProject = getProjectRoot(path.join(ROOT, resolvedRel));
        if (targetProject && sourceProject && targetProject !== sourceProject) {
          record.classification = 'violation';
          record.reason = `Cross-project relative import from ${sourceProject} to ${targetProject}`;
        }
      } else if (specifier.startsWith('apps/')) {
        record.classification = 'violation';
        record.reason = 'Direct app-to-app import by path alias is forbidden';
      } else if (specifier.startsWith('packages/')) {
        record.classification = 'violation';
        record.reason = 'Direct package internal import by path is forbidden';
      } else if (sourceKind === 'package' && specifier.startsWith('@madar/web')) {
        record.classification = 'violation';
        record.reason = 'Packages must not depend on app-level web code';
      } else if (sourceKind === 'web' && WEB_FORBIDDEN_ALIAS_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
        record.classification = 'violation';
        record.reason = `apps/web must not import Node-only package ${specifier}`;
      }

      results.push(record);
      if (record.classification === 'violation') violations.push(record);
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  scannedImports: results.length,
  violations: violations.length,
  status: violations.length === 0 ? 'pass' : 'fail',
};

const byReason = new Map();
for (const item of violations) {
  byReason.set(item.reason, (byReason.get(item.reason) || 0) + 1);
}

const md = [
  '# Module Boundary Audit',
  '',
  `Generated at: ${summary.generatedAt}`,
  '',
  `- Scanned imports: ${summary.scannedImports}`,
  `- Violations: ${summary.violations}`,
  `- Status: ${summary.status}`,
  '',
  '## Rules Checked',
  '',
  '- No cross-app imports via relative paths',
  '- No direct apps/* imports as specifiers',
  '- No direct packages/* internal path imports as specifiers',
  '- packages/* must not depend on @madar/web',
  '- apps/web must not depend on @madar/db or @madar/object-store',
  '',
  '## Violation Summary',
  '',
  '| Reason | Count |',
  '|---|---:|',
  ...(violations.length ? [...byReason.entries()].map(([reason, count]) => `| ${reason} | ${count} |`) : ['| none | 0 |']),
  '',
  '## Violations',
  '',
  '| File | Source Project | Import | Reason |',
  '|---|---|---|---|',
  ...(violations.length ? violations.map((v) => `| ${v.file} | ${v.sourceProject || 'unknown'} | ${v.specifier} | ${v.reason} |`) : ['| none | - | - | - |']),
];

fs.mkdirSync(path.dirname(OUTPUT_MD), { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
fs.writeFileSync(OUTPUT_MD, md.join('\n'));
fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ summary, results, violations }, null, 2));
console.log(`Module boundary audit complete: ${summary.violations} violation(s).`);
if (summary.violations > 0) process.exitCode = 1;
