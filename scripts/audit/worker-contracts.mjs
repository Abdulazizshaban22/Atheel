import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const apiQueueFile = path.join(ROOT, 'apps', 'api', 'src', 'modules', 'queue', 'queue.service.ts');
const workerFile = path.join(ROOT, 'apps', 'worker', 'src', 'index.ts');
const exportsApiFile = path.join(ROOT, 'apps', 'api', 'src', 'integrations', 'exports-renderer', 'exports-renderer.service.ts');
const exportsSvcFile = path.join(ROOT, 'apps', 'exports-svc', 'src', 'main.ts');

function parseDefaults(text) {
  const rows = [];
  const re = /process\.env\.([A-Z0-9_]+)\s*\|\|\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(text))) rows.push({ env: m[1], defaultValue: m[2] });
  return rows;
}

const apiQueues = parseDefaults(fs.readFileSync(apiQueueFile, 'utf8'));
const workerQueues = parseDefaults(fs.readFileSync(workerFile, 'utf8'));
const exportsApi = parseDefaults(fs.readFileSync(exportsApiFile, 'utf8'));
const exportsSvc = parseDefaults(fs.readFileSync(exportsSvcFile, 'utf8'));

const md = [
  '# Worker and Async Contracts',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  '## API queue defaults',
  '| Env | Default |',
  '|---|---|',
  ...apiQueues.map((row) => `| ${row.env} | ${row.defaultValue} |`),
  '',
  '## Worker / renderer defaults',
  '| Surface | Env | Default |',
  '|---|---|---|',
  ...workerQueues.map((row) => `| worker | ${row.env} | ${row.defaultValue} |`),
  ...exportsApi.map((row) => `| api->exports | ${row.env} | ${row.defaultValue} |`),
  ...exportsSvc.map((row) => `| exports-svc | ${row.env} | ${row.defaultValue} |`),
  '',
  '## Closure rule',
  '- Queue names, renderer transport, and worker tokens must be treated as contract-level configuration and frozen before staging rehearsal.',
];
fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.artifacts', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'WORKER_CONTRACTS.md'), md.join('\n'));
fs.writeFileSync(path.join(ROOT, '.artifacts', 'closure', 'worker-contracts.json'), JSON.stringify({ apiQueues, workerQueues, exportsApi, exportsSvc }, null, 2));
console.log('Generated worker contracts inventory.');
