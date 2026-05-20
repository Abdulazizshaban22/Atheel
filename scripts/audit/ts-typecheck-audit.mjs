#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const reportPath = resolve(repoRoot, '.artifacts/audit/ts-typecheck-audit.json');
mkdirSync(dirname(reportPath), { recursive: true });

function safeExecTsc() {
  try {
    execFileSync('tsc', ['-p', 'apps/api/tsconfig.json', '--noEmit', '--pretty', 'false'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { ok: true, output: '' };
  } catch (error) {
    return {
      ok: false,
      output: [error.stdout || '', error.stderr || ''].filter(Boolean).join('\n'),
    };
  }
}

function classifyModuleName(moduleName) {
  if (moduleName.startsWith('node:') || moduleName === 'crypto') return 'node_runtime';
  if (moduleName.startsWith('@madar/')) return 'workspace_package';
  return 'external_package';
}

function classifyDiagnostic(entry) {
  if (entry.code === 'TS2307') {
    const match = entry.message.match(/Cannot find module '([^']+)'/);
    if (match) return `missing_module:${classifyModuleName(match[1])}`;
    return 'missing_module:unknown';
  }
  if (entry.code === 'TS2580') return 'missing_runtime_global';
  if (entry.code === 'TS7006') return 'implicit_any';
  if (entry.code === 'TS2339') return 'unsafe_property_access';
  if (entry.code === 'TS18046') return 'unknown_narrowing';
  if (entry.code === 'TS2554') return 'argument_count';
  if (entry.code === 'TS2322' || entry.code === 'TS2345') return 'assignment_or_argument_type';
  return 'other';
}

const linePattern = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.+)$/;
const result = safeExecTsc();
const diagnostics = [];
for (const rawLine of result.output.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;
  const match = line.match(linePattern);
  if (!match?.groups) continue;
  const fileAbs = resolve(repoRoot, match.groups.file);
  const entry = {
    file: relative(repoRoot, fileAbs),
    line: Number(match.groups.line),
    column: Number(match.groups.column),
    code: match.groups.code,
    message: match.groups.message,
  };
  entry.category = classifyDiagnostic(entry);
  diagnostics.push(entry);
}

const byCategory = Object.fromEntries(
  [...diagnostics.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) || 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1]),
);

const byFileMap = diagnostics.reduce((map, item) => {
  const current = map.get(item.file) || { file: item.file, count: 0, categories: {} };
  current.count += 1;
  current.categories[item.category] = (current.categories[item.category] || 0) + 1;
  map.set(item.file, current);
  return map;
}, new Map());

const byFile = [...byFileMap.values()].sort((a, b) => b.count - a.count).slice(0, 25);
const report = {
  generatedAt: new Date().toISOString(),
  command: 'tsc -p apps/api/tsconfig.json --noEmit --pretty false',
  compilerSucceeded: result.ok,
  diagnosticCount: diagnostics.length,
  categories: byCategory,
  hotspots: byFile,
  diagnostics,
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Typecheck audit completed. Diagnostics: ${diagnostics.length}. Report: ${relative(repoRoot, reportPath)}`);
