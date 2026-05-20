export function computeRouteStopScore(input: {
  interestMatch: number; distanceFit: number; timeFit: number;
  culturalPriority: number; antiCongestion: number; contentQuality: number;
}): number {
  const s = 0.35*input.interestMatch + 0.20*input.distanceFit + 0.15*input.timeFit +
            0.10*input.culturalPriority + 0.10*input.antiCongestion + 0.10*input.contentQuality;
  return Number(s.toFixed(4));
}

export function computeContentQualityIndex(input: {
  factualAccuracy: number; languageClarity: number; narrativeDepth: number;
  culturalFit: number; interactivityReadiness: number; mediaCompleteness: number;
}): number {
  const s = 0.25*input.factualAccuracy + 0.20*input.languageClarity + 0.20*input.narrativeDepth +
            0.15*input.culturalFit + 0.10*input.interactivityReadiness + 0.10*input.mediaCompleteness;
  return Number((s*100).toFixed(2));
}

export function computeCulturalImpactScore(input: {
  routeCompletion: number; stopEngagement: number; ratingsQuality: number;
  returnRate: number; sharingRate: number; qualityTime: number;
}): number {
  const s = 0.30*input.routeCompletion + 0.20*input.stopEngagement + 0.15*input.ratingsQuality +
            0.15*input.returnRate + 0.10*input.sharingRate + 0.10*input.qualityTime;
  return Number((s*100).toFixed(2));
}
