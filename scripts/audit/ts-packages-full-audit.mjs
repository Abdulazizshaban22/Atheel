#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, '.artifacts', 'audit');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'ts-packages-full-audit.json');

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['tsc', '-b', 'tsconfig.packages.json', '--pretty', 'false'];
const run = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8' });
const combined = `${run.stdout || ''}${run.stderr || ''}`.trim();
const lines = combined ? combined.split(/\r?\n/).filter(Boolean) : [];
const diagnostics = lines.filter((line) => /error TS\d+:/i.test(line));
const report = {
  ok: run.status === 0,
  command: `${cmd} ${args.join(' ')}`,
  diagnosticsCount: diagnostics.length,
  diagnostics,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
if (run.status === 0) {
  console.log(`Full package audit passed. Report: ${path.relative(repoRoot, outFile)}`);
} else {
  console.log(`Full package audit failed with ${diagnostics.length} diagnostic(s). Report: ${path.relative(repoRoot, outFile)}`);
  process.exitCode = 1;
}
