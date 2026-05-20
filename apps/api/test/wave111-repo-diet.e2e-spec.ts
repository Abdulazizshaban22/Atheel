import fs from 'node:fs';
import path from 'node:path';

describe('Wave111 repo diet', () => {
  it('keeps generated and duplicate files out of the handoff baseline', () => {
    const root = path.resolve(__dirname, '../../..');
    expect(fs.existsSync(path.join(root, 'docs', 'workflows_catalog_summary.json'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'release', 'WAVE83_WAVE86_PRODUCTION_HARDENING.md'))).toBe(false);
  });
});
