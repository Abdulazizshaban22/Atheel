export function scoreUrbanExperienceCorpusQuality(input: { documents: number; chunks: number; evidenceLinks: number; experienceRecords: number; }) {
  const base = 35;
  const documents = Math.min(input.documents * 6, 25);
  const chunks = Math.min(input.chunks * 0.5, 20);
  const evidence = Math.min(input.evidenceLinks * 4, 10);
  const experiences = Math.min(input.experienceRecords * 4, 10);
  const score = Math.max(0, Math.min(100, Math.round(base + documents + chunks + evidence + experiences)));
  return { score, posture: score >= 85 ? 'strong' : score >= 70 ? 'warming_up' : 'needs_work' };
}
