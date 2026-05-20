export type HeritageRetrievalContract = {
  mode: 'foundation' | 'policy_aware' | 'vector_candidate';
  topKMax: number;
  requiredMetadata: string[];
  optionalMetadata: string[];
  scoringSignals: string[];
  requiredGroundingTags: string[];
};

export const HERITAGE_RETRIEVAL_CONTRACTS: HeritageRetrievalContract[] = [
  {
    mode: 'foundation',
    topKMax: 20,
    requiredMetadata: ['authorityLevel', 'assetClass'],
    optionalMetadata: ['regionCode', 'sourceAuthority', 'sensitivity', 'validityWindow'],
    scoringSignals: ['keyword_overlap', 'authority_boost', 'tag_match'],
    requiredGroundingTags: ['heritage'],
  },
  {
    mode: 'policy_aware',
    topKMax: 12,
    requiredMetadata: ['authorityLevel', 'assetClass', 'sensitivity'],
    optionalMetadata: ['regionCode', 'sourceAuthority', 'validityWindow'],
    scoringSignals: ['keyword_overlap', 'authority_boost', 'policy_match', 'sensitivity_guardrail'],
    requiredGroundingTags: ['heritage', 'policy'],
  },
  {
    mode: 'vector_candidate',
    topKMax: 10,
    requiredMetadata: ['authorityLevel', 'assetClass'],
    optionalMetadata: ['regionCode', 'sourceAuthority', 'validityWindow'],
    scoringSignals: ['semantic_similarity', 'keyword_overlap', 'authority_boost', 'rerank'],
    requiredGroundingTags: ['heritage'],
  },
];
