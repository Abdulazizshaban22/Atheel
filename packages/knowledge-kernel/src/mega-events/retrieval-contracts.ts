export const MEGA_EVENTS_RETRIEVAL_CONTRACTS = {
  query: {
    required: ['query'],
    optional: ['organizationId', 'languageCode', 'city', 'eventType', 'readinessGate', 'operationsTier', 'topK'],
  },
  retrieval: {
    mode: 'mega_events_domain_routed_search',
    supportsMetadataFilters: true,
    supportsReadinessSignals: true,
    supportsCrowdOpsSignals: true,
    supportsTwinHints: true,
    supportsStageGateHints: true,
  },
  response: {
    required: ['count', 'items', 'strategy'],
    itemFields: ['chunkId', 'documentId', 'title', 'textPreview', 'tags', 'metadata', 'score'],
  },
};
