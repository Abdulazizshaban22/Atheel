export function scoreCultureProgramsCorpusQuality(input: { documents: number; chunks: number; evidenceLinks: number; partnerRecords: number; impactFrameworks: number; }) {
  const base = Math.min(100, 35 + input.documents * 4 + input.chunks + input.evidenceLinks * 3 + input.partnerRecords * 2 + input.impactFrameworks * 3);
  return { score: Math.max(30, base), posture: base >= 85 ? 'strong' : base >= 65 ? 'maturing' : 'early', notesAr: ['تحسين الربط بين corpus البرامج وإطارات الأثر.', 'زيادة تغطية الشركاء تعزز جودة المجال.', 'إضافة corpus أكبر سترفع الاسترجاع لاحقًا.'] };
}
