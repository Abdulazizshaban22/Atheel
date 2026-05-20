
export const URBAN_EXPERIENCE_RETRIEVAL_CONTRACTS = {
  primaryEntity: 'route_or_place_experience',
  rankingSignals: ['semantic_match', 'route_type_match', 'place_type_match', 'flow_intensity', 'evidence_density'],
  filters: ['organizationId', 'routeType', 'placeType'],
  futureModes: ['vector_search', 'hybrid_search', 'flow_aware_reranking'],
} as const;
