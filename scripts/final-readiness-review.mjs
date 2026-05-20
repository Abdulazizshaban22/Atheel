import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const checks = [
  ['truth matrix', 'docs/closure/TRUTH_MATRIX.md'],
  ['datastore inventory', 'docs/closure/DATASTORE_USAGE_INVENTORY.md'],
  ['placeholder migrations', 'docs/closure/PLACEHOLDER_MIGRATIONS.md'],
  ['migration closure readiness', 'docs/closure/MIGRATION_CLOSURE_READINESS.md'],
  ['endpoint inventory', 'docs/closure/ENDPOINT_INVENTORY.md'],
  ['worker contracts', 'docs/closure/WORKER_CONTRACTS.md'],
  ['implementation status matrix', 'docs/closure/IMPLEMENTATION_STATUS_MATRIX.md'],
  ['definition of done', 'docs/closure/DEFINITION_OF_DONE.md'],
  ['staging dress rehearsal', 'docs/closure/STAGING_DRESS_REHEARSAL.md'],
  ['sales demo pack', 'docs/closure/SALES_DEMO_PACK.md'],
  ['documentation pack', 'docs/closure/DOCUMENTATION_PACK.md'],
];
const rows = checks.map(([label, rel]) => ({ label, rel, present: fs.existsSync(path.join(ROOT, rel)) }));
const missing = rows.filter((row) => !row.present).map((row) => row.rel);

let implementationSummary = null;
const implPath = path.join(ROOT, '.artifacts', 'closure', 'implementation-status.json');
if (fs.existsSync(implPath)) {
  implementationSummary = JSON.parse(fs.readFileSync(implPath, 'utf8'))?.summary || null;
}

const md = [
  '# Final Readiness Review',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  '| Check | Path | Present |',
  '|---|---|---|',
  ...rows.map((row) => `| ${row.label} | ${row.rel} | ${row.present ? 'yes' : 'no'} |`),
  '',
];

if (implementationSummary) {
  md.push('## Implementation Summary');
  md.push(`- Requested items: ${implementationSummary.total}`);
  md.push(`- Implemented items: ${implementationSummary.implemented}`);
  md.push(`- Partially implemented items: ${implementationSummary.partiallyImplemented}`);
  md.push(`- Items with all expected artifacts present: ${implementationSummary.present}`);
  md.push('');
}

if (missing.length) {
  md.push('## Missing');
  md.push(...missing.map((item) => `- ${item}`));
} else {
  md.push('## Result');
  md.push('All closure documents are present. Runtime and build verification still require a live dependency bundle and installable workspace. Placeholder migrations remain the main code-level blocker before true staging promotion, but release-gate automation and baseline runbooks are now wired in.');
}

fs.mkdirSync(path.join(ROOT, 'docs', 'closure'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'closure', 'FINAL_READINESS_REVIEW.md'), md.join('\n'));
console.log('Generated final readiness review.');
