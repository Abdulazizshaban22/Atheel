export type MegaEventsVectorStoreStatus = {
  provider: 'scaffold';
  mode: 'mega_events_vector_scaffold';
  syncState: 'idle' | 'ready' | 'stale';
  retrievalMode: 'keyword_semantic_ready';
  metadataFilters: string[];
  recommendedIndexAr: string;
  notesAr: string[];
};

export function getMegaEventsVectorStoreStatus(): MegaEventsVectorStoreStatus {
  return {
    provider: 'scaffold',
    mode: 'mega_events_vector_scaffold',
    syncState: 'ready',
    retrievalMode: 'keyword_semantic_ready',
    metadataFilters: [
      'city',
      'eventType',
      'venueType',
      'audienceScale',
      'crowdSensitivity',
      'operationsTier',
      'authorityLevel',
      'seasonWindow',
      'riskCategory',
      'readinessGate',
    ],
    recommendedIndexAr: 'التهيئة الحالية مناسبة للربط لاحقًا مع OpenAI Vector Stores أو pgvector HNSW لمجال الفعاليات الكبرى.',
    notesAr: [
      'المرحلة الحالية scaffold وليست مزامنة production فعلية.',
      'metadata filters هي الأساس قبل توسيع الاسترجاع الدلالي للحشود والجاهزية والتشغيل.',
      'يلزم لاحقًا إضافة reranking وربط أوضح بمحاكاة التوأم وstage-gates.',
    ],
  };
}
