import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Wave105 targeted any-reduction', () => {
  const root = join(__dirname, '..', 'src');
  const files = [
    'modules/experiences/experience-core.types.ts',
    'modules/experiences/experiences.repository.ts',
    'modules/experiences/experiences.application-service.ts',
    'modules/experiences/experiences.service.ts',
    'modules/experiences/experience-twin-orchestrator.service.ts',
    'modules/experiences/experience-twin-sync-worker.service.ts',
    'modules/experiences/experiences.controller.ts',
    'modules/queue/queue.service.ts',
    'common/events/operational-event-outbox.util.ts',
  ];

  it('removes explicit any usage from the highest-risk experience and queue files', () => {
    const offenders: Array<{ file: string; matches: string[] }> = [];

    for (const relativePath of files) {
      const content = readFileSync(join(root, relativePath), 'utf8');
      const matches = [
        ...content.matchAll(/\bas any\b/g),
        ...content.matchAll(/:\s*any\b/g),
        ...content.matchAll(/<any>/g),
      ].map((match) => match[0]);

      if (matches.length) {
        offenders.push({ file: relativePath, matches });
      }
    }

    expect(offenders).toEqual([]);
  });
});
