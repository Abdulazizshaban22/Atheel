import type { InspirationSource, EvidenceSourceKind } from './types';

export const DEFAULT_SAUDI_CULTURE_SOURCES: InspirationSource[] = [
  {
    id: 'src_unesco_ich_sa',
    nameAr: 'UNESCO التراث الثقافي غير المادي في السعودية',
    url: 'https://ich.unesco.org/en/state/saudi-arabia-SA',
    kind: 'unesco',
    tags: ['unesco', 'ich', 'saudi', 'heritage'],
  },
  {
    id: 'src_unesco_wh_sa',
    nameAr: 'UNESCO مواقع التراث العالمي في السعودية',
    url: 'https://whc.unesco.org/en/statesparties/sa',
    kind: 'unesco',
    tags: ['unesco', 'world_heritage', 'saudi'],
  },
  {
    id: 'src_heritage_commission_home',
    nameAr: 'هيئة التراث السعودية: مكتبة وتراث مصور ومواد',
    url: 'https://heritage.moc.gov.sa/en',
    kind: 'official_sa',
    tags: ['heritage', 'moc', 'library', 'photos'],
  },
  {
    id: 'src_heritage_register',
    nameAr: 'هيئة التراث: السجل الوطني للآثار والتوثيق الرقمي',
    url: 'https://heritage.moc.gov.sa/en/Cultural-Heritage',
    kind: 'official_sa',
    tags: ['registry', 'archaeology', 'maps', 'archive'],
  },
  {
    id: 'src_moc_home',
    nameAr: 'وزارة الثقافة السعودية: مكتبة صور وأفلام ومركز إعلامي',
    url: 'https://www.moc.gov.sa/en',
    kind: 'official_sa',
    tags: ['moc', 'media', 'library'],
  },
  {
    id: 'src_moc_intangible',
    nameAr: 'وزارة الثقافة: التراث غير المادي',
    url: 'https://snc-ecs.moc.gov.sa/intangible-heritage/',
    kind: 'official_sa',
    tags: ['moc', 'intangible', 'unesco'],
  },
  {
    id: 'src_moc_archiving_guide_pdf',
    nameAr: 'دليل توثيق التراث والأرشفة الرقمية (وزارة الثقافة) PDF',
    url: 'https://www.moc.gov.sa/-/media/Project/Ministries/Moc/Publications/Cultural-Heritage-Documentation-and-Digital-Archiving-Guide-%281%29.pdf',
    kind: 'official_sa',
    tags: ['guide', 'archiving', 'documentation', 'pdf'],
  },
  {
    id: 'src_saudipedia_ich',
    nameAr: 'سعوديبيديا: التراث غير المادي في السعودية',
    url: 'https://saudipedia.com/en/saudi-intangible-cultural-heritage-inscribed-on-unesco-list',
    kind: 'saudipedia',
    tags: ['saudipedia', 'context', 'summary'],
  },
  {
    id: 'src_manuscripts_platform',
    nameAr: 'منصة المخطوطات (هيئة المكتبات) سعوديبيديا',
    url: 'https://saudipedia.com/en/manuscripts-platform',
    kind: 'saudipedia',
    tags: ['manuscripts', 'library', 'digitization'],
  },
  {
    id: 'src_misk_art_exhibitions',
    nameAr: 'معهد مسك للفنون: معارض وإلهام بصري',
    url: 'https://miskartinstitute.org/en/exhibitions',
    kind: 'misk',
    tags: ['misk', 'art', 'exhibitions', 'inspiration'],
  },
  {
    id: 'src_alula_design_space',
    nameAr: 'Design Space AlUla: أرشيف ومعرض وورشة للتصميم',
    url: 'https://www.experiencealula.com/en/places-to-go/design-space',
    kind: 'alula',
    tags: ['alula', 'design', 'archive'],
  },
];

export function inferEvidenceKindFromUrl(url: string): EvidenceSourceKind {
  const u = (url || '').toLowerCase();
  if (u.includes('ich.unesco.org') || u.includes('whc.unesco.org')) return 'unesco';
  if (u.includes('moc.gov.sa') || u.includes('heritage.moc.gov.sa') || u.includes('snc-ecs.moc.gov.sa') || u.includes('ksaforunesco.org')) return 'official_sa';
  if (u.includes('saudipedia.com')) return 'saudipedia';
  if (u.includes('miskartinstitute.org') || u.includes('misk.org.sa')) return 'misk';
  if (u.includes('experiencealula.com')) return 'alula';
  return 'other';
}
