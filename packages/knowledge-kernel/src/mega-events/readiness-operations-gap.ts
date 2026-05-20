export function summarizeReadinessOperationsGap(input: {
  programs: Array<{ metadata?: Record<string, any> }>;
  approvals: Array<any>;
  risks: Array<any>;
  jobs: Array<{ kind?: string; status?: string }>;
}) {
  const programs = Array.isArray(input.programs) ? input.programs : [];
  const approvals = Array.isArray(input.approvals) ? input.approvals : [];
  const risks = Array.isArray(input.risks) ? input.risks : [];
  const jobs = Array.isArray(input.jobs) ? input.jobs : [];

  const eventTypes = Array.from(new Set(programs.map((p) => String((p.metadata || {}).eventType || '')).filter(Boolean)));
  const gateCoverage = approvals.length;
  const activeSimulations = jobs.filter((j) => j.kind === 'twin_simulation' && (j.status === 'queued' || j.status === 'running')).length;
  const missingFocus = [] as string[];
  if (gateCoverage < 2) missingFocus.push('تعزيز evidence والاعتمادات الأساسية قبل الإطلاق.');
  if (risks.length < 2) missingFocus.push('رفع كثافة risk documentation للعمليات والحشود.');
  if (!activeSimulations) missingFocus.push('لا توجد محاكاة نشطة للحشود أو السيناريوهات حتى الآن.');

  const linkageScore = Math.min(100, programs.length * 10 + approvals.length * 8 + risks.length * 6 + activeSimulations * 12);
  return {
    eventTypes,
    gateCoverage,
    riskCount: risks.length,
    activeSimulations,
    missingFocus,
    linkageScore: Math.round(linkageScore),
  };
}
