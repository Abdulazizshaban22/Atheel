#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
const EXT = /\.(ts|tsx|mts|cts)$/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (EXT.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT, []);
const errors = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  for (const diag of sf.parseDiagnostics ?? []) {
    const { line, character } = sf.getLineAndCharacterOfPosition(diag.start ?? 0);
    errors.push({
      file: path.relative(ROOT, file),
      line: line + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
    });
  }
}

const reportDir = path.join(ROOT, '.artifacts', 'audit');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'ts-parse-audit.json');
fs.writeFileSync(reportPath, JSON.stringify({ checkedFiles: files.length, errors }, null, 2));

if (errors.length) {
  console.error(`TypeScript parse audit failed with ${errors.length} error(s). Report: ${path.relative(ROOT, reportPath)}`);
  for (const error of errors.slice(0, 20)) {
    console.error(`- ${error.file}:${error.line}:${error.column} ${error.message}`);
  }
  process.exit(1);
}

console.log(`TypeScript parse audit passed for ${files.length} file(s). Report: ${path.relative(ROOT, reportPath)}`);
