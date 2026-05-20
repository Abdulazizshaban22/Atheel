export function scoreMegaEventsCorpusQuality(input: {
  docs: Array<{ chunkCount?: number; metadata?: Record<string, any>; tags?: string[] }>;
}) {
  const docs = Array.isArray(input.docs) ? input.docs : [];
  if (!docs.length) {
    return {
      completenessScore: 0,
      readinessCoverageScore: 0,
      crowdOpsCoverageScore: 0,
      overallScore: 0,
    };
  }

  const completenessScore = Math.round(docs.reduce((acc, d) => {
    const md = d.metadata || {};
    return acc
      + (Number(d.chunkCount || 0) > 0 ? 1 : 0)
      + (md.city ? 1 : 0)
      + (md.eventType ? 1 : 0)
      + (md.readinessGate ? 1 : 0);
  }, 0) / (docs.length * 4) * 100);

  const readinessCoverageScore = Math.min(100, docs.filter((d) => (d.tags || []).includes('readiness') || (d.tags || []).includes('stage_gate')).length * 18);
  const crowdOpsCoverageScore = Math.min(100, docs.filter((d) => (d.tags || []).includes('crowd') || (d.tags || []).includes('operations') || (d.tags || []).includes('risk')).length * 16);
  const overallScore = Math.round((completenessScore + readinessCoverageScore + crowdOpsCoverageScore) / 3);

  return { completenessScore, readinessCoverageScore, crowdOpsCoverageScore, overallScore };
}
