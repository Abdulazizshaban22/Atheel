export type HeritageCorpusQualityResult = {
  posture: 'good' | 'needs_hardening' | 'critical';
  score: number;
  signals: {
    metadataCoverage: number;
    authorityCoverage: number;
    policyCoverage: number;
    duplicationRisk: number;
    languageBalance: number;
  };
  actionsAr: string[];
};
