export type HeritageVectorStoreStatus = "not_configured" | "scaffolded" | "syncing" | "ready";

export type HeritageVectorStoreRecord = {
  id: string;
  domain: 'heritage';
  provider: 'openai_vector_store' | 'pgvector';
  status: HeritageVectorStoreStatus;
  corpusId: string;
  fileCount: number;
  chunkCount: number;
  lastSyncAt?: string | null;
  retrievalMode: 'keyword_foundation' | 'hybrid_foundation' | 'vector_ready';
  metadataFilters: string[];
};

export const DEFAULT_HERITAGE_VECTOR_STORE: HeritageVectorStoreRecord = {
  id: 'heritage_vs_default',
  domain: 'heritage',
  provider: 'openai_vector_store',
  status: 'scaffolded',
  corpusId: 'heritage_default_corpus',
  fileCount: 0,
  chunkCount: 0,
  lastSyncAt: null,
  retrievalMode: 'hybrid_foundation',
  metadataFilters: ['authorityLevel', 'assetClass', 'regionCode', 'sourceAuthority', 'sensitivity', 'validityWindow'],
};
