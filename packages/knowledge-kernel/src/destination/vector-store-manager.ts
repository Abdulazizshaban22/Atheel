export type DestinationVectorStoreStatus = {
  provider: 'scaffold';
  mode: 'destination_vector_scaffold';
  syncState: 'idle' | 'ready' | 'stale';
  retrievalMode: 'keyword_semantic_ready';
  metadataFilters: string[];
  recommendedIndexAr: string;
  notesAr: string[];
};

export function getDestinationVectorStoreStatus(): DestinationVectorStoreStatus {
  return {
    provider: 'scaffold',
    mode: 'destination_vector_scaffold',
    syncState: 'ready',
    retrievalMode: 'keyword_semantic_ready',
    metadataFilters: [
      'city',
      'destinationType',
      'seasonWindow',
      'partnerType',
      'audienceSegment',
      'economicSignal',
      'district',
      'mobilitySignal',
    ],
    recommendedIndexAr: 'التهيئة الحالية مناسبة للربط لاحقًا مع OpenAI Vector Stores أو pgvector HNSW.',
    notesAr: [
      'المرحلة الحالية scaffold وليست مزامنة production فعلية.',
      'metadata filters هي الأساس قبل توسيع الاسترجاع الدلالي.',
      'يلزم لاحقًا إضافة reranking ومؤشرات stale corpus.',
    ],
  };
}
