export function summarizeImpactPartnerLinkage(input: { partners: number; impactFrameworks: number; documents: number; }) {
  const linkageScore = Math.max(35, Math.min(100, 45 + input.partners * 7 + input.impactFrameworks * 8 + input.documents * 2));
  return { linkageScore, posture: linkageScore >= 85 ? 'strong' : linkageScore >= 65 ? 'maturing' : 'early', gapsAr: linkageScore >= 80 ? [] : ['زيادة الربط بين وثائق البرامج والشركاء.', 'تعميق نماذج الأثر والإرث لكل برنامج.'] };
}
