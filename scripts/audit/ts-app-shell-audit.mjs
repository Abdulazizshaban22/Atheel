#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, '.artifacts', 'audit');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'ts-app-shell-audit.json');

const targets = [
  { name: 'worker-bootstrap', project: 'apps/worker/tsconfig.audit.json' },
  { name: 'exports-svc-shell', project: 'apps/exports-svc/tsconfig.audit.json' },
  { name: 'web-shell', project: 'apps/web/tsconfig.audit.json' },
];

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const results = [];
let hasFailure = false;

for (const target of targets) {
  const args = ['tsc', '-p', target.project, '--pretty', 'false'];
  const run = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8' });
  const combined = `${run.stdout || ''}${run.stderr || ''}`.trim();
  const lines = combined ? combined.split(/\r?\n/).filter(Boolean) : [];
  const diagnostics = lines.filter((line) => /error TS\d+:/i.test(line));
  const item = {
    ...target,
    ok: run.status === 0,
    diagnosticsCount: diagnostics.length,
    diagnostics,
  };
  results.push(item);
  if (!item.ok) hasFailure = true;
}

const report = {
  ok: !hasFailure,
  targets: results,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
if (report.ok) {
  console.log(`App shell audit passed. Report: ${path.relative(repoRoot, outFile)}`);
} else {
  console.log(`App shell audit failed. Report: ${path.relative(repoRoot, outFile)}`);
  process.exitCode = 1;
}
