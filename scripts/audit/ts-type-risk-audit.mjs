#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const TARGETS = [
  'apps/api/src/main.ts',
  'apps/api/src/common',
  'apps/api/src/modules/experiences',
  'apps/api/src/modules/queue',
];
const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
const EXT = /\.(ts|tsx|mts|cts)$/;

function walk(input, out = []) {
  const full = path.join(ROOT, input);
  if (!fs.existsSync(full)) return out;
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    if (EXT.test(full)) out.push(full);
    return out;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const nested = path.join(full, entry.name);
    if (entry.isDirectory()) walk(path.relative(ROOT, nested), out);
    else if (EXT.test(entry.name)) out.push(nested);
  }
  return out;
}

function getLine(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

const files = TARGETS.flatMap((target) => walk(target, []));
const findings = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      findings.push({ file: path.relative(ROOT, file), line: getLine(sf, node.pos), kind: 'explicit_any', snippet: node.getText(sf) });
    }
    if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      findings.push({ file: path.relative(ROOT, file), line: getLine(sf, node.pos), kind: 'cast_any', snippet: node.getText(sf).slice(0, 120) });
    }
    if (ts.isTypeAssertionExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      findings.push({ file: path.relative(ROOT, file), line: getLine(sf, node.pos), kind: 'assert_any', snippet: node.getText(sf).slice(0, 120) });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

const byFile = Object.values(findings.reduce((acc, item) => {
  acc[item.file] ||= { file: item.file, explicitAny: 0, castAny: 0, assertAny: 0, total: 0 };
  acc[item.file].total += 1;
  if (item.kind === 'explicit_any') acc[item.file].explicitAny += 1;
  if (item.kind === 'cast_any') acc[item.file].castAny += 1;
  if (item.kind === 'assert_any') acc[item.file].assertAny += 1;
  return acc;
}, {})).sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));

const reportDir = path.join(ROOT, '.artifacts', 'audit');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'ts-type-risk-audit.json');
fs.writeFileSync(reportPath, JSON.stringify({ checkedFiles: files.length, findings, byFile }, null, 2));
console.log(`Type-risk audit completed for ${files.length} file(s). Findings: ${findings.length}. Report: ${path.relative(ROOT, reportPath)}`);
