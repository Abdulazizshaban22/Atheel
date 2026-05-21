export function summarizeFlowLinkage(input: { documents: number; experienceRecords: number; evidenceLinks: number; }) {
  const score = Math.max(35, Math.min(100, 45 + input.documents * 5 + input.experienceRecords * 5 + input.evidenceLinks * 2));
  return { linkageScore: score, posture: score >= 85 ? 'linked' : score >= 70 ? 'partial' : 'weak', notesAr: ['رفع جودة ربط المعرفة بالمسارات والتدفق', 'تعميق الارتباط مع التوأم الرقمي لاحقًا'] };
}
