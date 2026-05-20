export const DESTINATION_RETRIEVAL_CONTRACTS = {
  query: {
    required: ['query'],
    optional: ['organizationId', 'languageCode', 'city', 'destinationType', 'seasonWindow', 'topK'],
  },
  retrieval: {
    mode: 'destination_domain_routed_search',
    supportsMetadataFilters: true,
    supportsPartnerCoverageSignals: true,
    supportsProgrammingSignals: true,
  },
  response: {
    required: ['count', 'items', 'strategy'],
    itemFields: ['chunkId', 'documentId', 'title', 'textPreview', 'tags', 'metadata', 'score'],
  },
};
