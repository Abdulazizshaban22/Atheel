export function summarizeStudioExperienceLinkage(input: { experiences: number; documents: number; attachments: number }) {
  const linkageScore = Math.max(35, Math.min(100, 45 + input.experiences * 8 + input.documents * 3 + input.attachments * 2));
  return { linkageScore, posture: linkageScore >= 85 ? 'strong' : linkageScore >= 70 ? 'warming_up' : 'needs_work' };
}
