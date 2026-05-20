import { CULTURE_AUDIENCES, CULTURE_FORMATS, CULTURE_THEMES, SAUDI_REGIONS, type CultureAudience, type CultureFormat, type CultureTheme, type SaudiRegion } from './taxonomy';

export type CulturalIdeaCard = {
  id: string;
  region: SaudiRegion;
  theme: CultureTheme;
  format: CultureFormat;
  audience: CultureAudience;
  titleAr: string;
  descriptionAr: string;
  tags: string[];
  kpis: Array<{ key: string; nameAr: string; unit: 'count' | 'percent' | 'sar' | 'minutes' }>
  assetsSuggested: string[];
  workflowHints: string[];
};

const KPI_LIBRARY = [
  { key: 'visitors', nameAr: 'عدد الزوار', unit: 'count' as const },
  { key: 'satisfaction', nameAr: 'رضا الزوار', unit: 'percent' as const },
  { key: 'engagement', nameAr: 'التفاعل', unit: 'percent' as const },
  { key: 'local_participation', nameAr: 'مشاركة المجتمع المحلي', unit: 'percent' as const },
  { key: 'revenue', nameAr: 'الإيراد', unit: 'sar' as const },
  { key: 'duration', nameAr: 'مدة التجربة', unit: 'minutes' as const },
];

function pickKpis(theme: CultureTheme, format: CultureFormat) {
  const base = ['visitors', 'satisfaction', 'engagement'];
  const add = theme === 'Contemporary_Creative' ? ['revenue'] : theme === 'Crafts' ? ['local_participation'] : theme === 'Hajj_Routes' ? ['duration'] : ['local_participation'];
  const extra = format === 'Workshop' ? ['duration'] : format === 'Festival' ? ['revenue'] : [];
  const keys = Array.from(new Set([...base, ...add, ...extra]));
  return KPI_LIBRARY.filter((k) => keys.includes(k.key));
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateSaudiCultureIdeaCards(limit?: number): CulturalIdeaCard[] {
  const cards: CulturalIdeaCard[] = [];
  for (const r of SAUDI_REGIONS) {
    for (const t of CULTURE_THEMES) {
      for (const f of CULTURE_FORMATS) {
        // balanced audiences: pick 4 audiences per combo deterministically
        const audiences = CULTURE_AUDIENCES.filter((a) => {
          const h = (r.code + t.code + f.code + a.code).length;
          return h % 3 === 0;
        }).slice(0, 4);
        for (const a of audiences) {
          const id = `sa_${slug(r.code)}_${slug(t.code)}_${slug(f.code)}_${slug(a.code)}`;
          const hubs = r.hubs.join('، ');
          const titleAr = `${f.nameAr} عن ${t.nameAr} في ${r.nameAr}`;
          const descriptionAr = `فكرة ${f.nameAr} موجهة إلى ${a.nameAr} في ${r.nameAr}. تُبنى على عناصر ${t.nameAr} وتستثمر نقاط ارتكاز محلية مثل: ${hubs}.`;
          const tags = [r.nameAr, t.nameAr, f.nameAr, a.nameAr, ...t.keywordsAr.slice(0, 3)];
          const assetsSuggested = [
            'مسار تجربة زائر مختصر',
            'نصوص لوحات تعريفية',
            'هوية بصرية مصغرة للفعالية',
            'حزمة محتوى رقمي (قصص قصيرة + منشورات)',
            'نموذج تقييم رضا الزوار',
          ];
          const workflowHints = [
            'wf_content_policy_pack',
            'wf_visitor_journey_design',
            'wf_approval_governance',
            'wf_event_ops_runbook',
          ];
          cards.push({
            id,
            region: r.code,
            theme: t.code,
            format: f.code,
            audience: a.code,
            titleAr,
            descriptionAr,
            tags,
            kpis: pickKpis(t.code, f.code),
            assetsSuggested,
            workflowHints,
          });
          if (limit && cards.length >= limit) return cards;
        }
      }
    }
  }
  return cards;
}

export function filterIdeaCards(cards: CulturalIdeaCard[], params?: Partial<Pick<CulturalIdeaCard,'region'|'theme'|'format'|'audience'>> & { q?: string; limit?: number }) {
  const q = (params?.q || '').toLowerCase().trim();
  let out = cards;
  if (params?.region) out = out.filter((c) => c.region === params.region);
  if (params?.theme) out = out.filter((c) => c.theme === params.theme);
  if (params?.format) out = out.filter((c) => c.format === params.format);
  if (params?.audience) out = out.filter((c) => c.audience === params.audience);
  if (q) out = out.filter((c) => (c.titleAr + ' ' + c.descriptionAr + ' ' + c.tags.join(' ')).toLowerCase().includes(q));
  const limit = Math.max(1, Math.min(500, params?.limit ?? 50));
  return out.slice(0, limit);
}
