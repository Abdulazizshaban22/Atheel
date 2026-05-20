import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Wave108 hotspot reduction guard', () => {
  const files = [
    'src/modules/risks/risks.service.ts',
    'src/modules/visitor-guide/visitor-guide.service.ts',
    'src/modules/experiences/experience-twin-sync-worker.service.ts',
    'src/modules/content/content.application-service.ts',
    'src/modules/projects/projects.application-service.ts',
    'src/otel.ts',
  ];

  it.each(files)('keeps %s free of raw any casts', (relativePath) => {
    const absolutePath = join(process.cwd(), 'apps/api', relativePath);
    const content = readFileSync(absolutePath, 'utf8');
    expect(content).not.toMatch(/:\s*any\b/);
    expect(content).not.toMatch(/as\s+any\b/);
  });
});
