export function scoreExhibitionCorpusQuality(input: { documents: number; chunks: number; evidenceLinks: number; experiences: number; assets: number }) {
  const score = Math.max(35, Math.min(100, 40 + input.documents * 3 + Math.min(input.chunks, 40) + input.evidenceLinks * 4 + input.experiences * 4 + input.assets * 2));
  return { score, posture: score >= 85 ? 'strong' : score >= 70 ? 'warming_up' : 'needs_work' };
}
