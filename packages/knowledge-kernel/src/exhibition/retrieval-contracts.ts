export const EXHIBITION_RETRIEVAL_CONTRACTS = [
  { key: 'curatorial_recall', nameAr: 'استرجاع المحتوى الكيوريتوري', filters: ['exhibitType', 'curatorialTrack'] },
  { key: 'experience_recall', nameAr: 'استرجاع محتوى الرحلة والتفاعل', filters: ['audienceSegment'] },
  { key: 'asset_recall', nameAr: 'استرجاع أصول المعرض والمواد الإبداعية', filters: ['assetType'] },
] as const;
