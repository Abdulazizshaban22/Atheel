import type { EvidenceRef, IdeaCard, IdeaState } from './types';
import { inferEvidenceKindFromUrl } from './sources';

export function canAdvanceIdeaState(idea: IdeaCard, next: IdeaState) {
  if (next === 'pitch_ready') {
    const okCount = idea.evidenceRefs.length >= idea.evidenceMinCount;
    const hasOfficial = idea.evidenceRefs.some((r) => r.kind === 'official_sa' || r.kind === 'unesco');
    return {
      ok: okCount && hasOfficial,
      reasonAr: okCount
        ? (hasOfficial ? '' : 'لا يمكن اعتماد الفكرة للعرض بدون مرجع رسمي سعودي أو UNESCO واحد على الأقل')
        : `لا يمكن اعتماد الفكرة للعرض بدون ${idea.evidenceMinCount} مراجع موثقة على الأقل`,
    };
  }
  return { ok: true, reasonAr: '' };
}

export function normalizeEvidenceInput(input: { titleAr: string; url?: string; citationAr?: string }) {
  const kind = input.url ? inferEvidenceKindFromUrl(input.url) : 'other';
  const ref: Omit<EvidenceRef, 'id' | 'ideaId' | 'createdAt'> = {
    titleAr: input.titleAr,
    url: input.url,
    kind,
    citationAr: input.citationAr,
  };
  return ref;
}
