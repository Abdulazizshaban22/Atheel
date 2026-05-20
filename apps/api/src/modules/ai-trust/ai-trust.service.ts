import { Injectable } from '@nestjs/common';

@Injectable()
export class AiTrustService {
  private readonly reports: any[] = [];
  private readonly reviews: any[] = [];
  private readonly thresholds: Record<string, { confidence: number; grounding: number; maxReviewWaitMinutes: number }> = {
    heritage: { confidence: 0.78, grounding: 0.86, maxReviewWaitMinutes: 15 },
    destination: { confidence: 0.76, grounding: 0.84, maxReviewWaitMinutes: 20 },
    'mega-events': { confidence: 0.8, grounding: 0.85, maxReviewWaitMinutes: 10 },
    exhibition: { confidence: 0.75, grounding: 0.83, maxReviewWaitMinutes: 20 },
    'culture-programs': { confidence: 0.76, grounding: 0.83, maxReviewWaitMinutes: 20 },
    'urban-experience': { confidence: 0.74, grounding: 0.82, maxReviewWaitMinutes: 20 },
    core: { confidence: 0.75, grounding: 0.82, maxReviewWaitMinutes: 30 },
  };

  evaluate(dto: any) {
    const domain = dto.domain || 'core';
    const threshold = this.thresholds[domain] || this.thresholds.core;
    const confidence = dto.confidence ?? 0.78;
    const grounding = dto.groundingScore ?? 0.81;
    const confidenceGap = Number((threshold.confidence - confidence).toFixed(3));
    const groundingGap = Number((threshold.grounding - grounding).toFixed(3));
    const humanReviewRequired = confidence < threshold.confidence || grounding < threshold.grounding || dto.riskLevel === 'high' || dto.policyRisk === 'elevated';
    const item = {
      jobId: dto.jobId,
      domain,
      confidence,
      grounding,
      thresholds: threshold,
      confidenceGap,
      groundingGap,
      hallucinationRisk: confidence < threshold.confidence || grounding < threshold.grounding ? 'elevated' : 'normal',
      policyRisk: dto.policyRisk || 'normal',
      humanReviewRequired,
      provenance: dto.sources || [],
      trustDecision: humanReviewRequired ? 'route_to_human_review' : 'auto_pass',
      evaluatedAt: new Date().toISOString(),
    };
    this.reports.unshift(item);
    if (humanReviewRequired) {
      this.reviews.unshift({
        reviewId: `hr_${Date.now()}`,
        jobId: dto.jobId,
        domain,
        reason: confidence < threshold.confidence ? 'low_confidence' : grounding < threshold.grounding ? 'low_grounding' : 'policy_or_risk_escalation',
        reviewerGroup: this.getReviewerGroup(domain),
        maxReviewWaitMinutes: threshold.maxReviewWaitMinutes,
        status: 'queued_for_human_review',
        queuedAt: new Date().toISOString(),
      });
    }
    return { ok: true, item };
  }

  private getReviewerGroup(domain: string) {
    if (domain === 'heritage') return 'heritage_board';
    if (domain === 'mega-events') return 'ops_command';
    if (domain === 'exhibition') return 'curation_studio';
    return 'domain_reviewers';
  }

  getReport(jobId: string) {
    const item = this.reports.find((x) => x.jobId === jobId);
    return item ? { ok: true, item } : { ok: false, message: 'report_not_found' };
  }

  requestHumanReview(dto: any) {
    const domain = dto.domain || 'core';
    const threshold = this.thresholds[domain] || this.thresholds.core;
    const item = {
      reviewId: `hr_${Date.now()}`,
      ...dto,
      reviewerGroup: dto.reviewerGroup || this.getReviewerGroup(domain),
      maxReviewWaitMinutes: dto.maxReviewWaitMinutes || threshold.maxReviewWaitMinutes,
      status: 'queued_for_human_review',
      queuedAt: new Date().toISOString(),
    };
    this.reviews.unshift(item);
    return { ok: true, item };
  }

  listHumanReviews(domain?: string) {
    const items = this.reviews.filter((x) => !domain || x.domain === domain).map((item) => ({
      ...item,
      queueAgeMinutes: Number(((Date.now() - new Date(item.queuedAt).getTime()) / 60000).toFixed(2)),
    }));
    return { ok: true, count: items.length, items: items.slice(0, 100) };
  }

  resolveHumanReview(reviewId: string, dto: any) {
    const item = this.reviews.find((x) => x.reviewId === reviewId);
    if (!item) return { ok: false, message: 'review_not_found' };
    item.status = dto.status || 'approved';
    item.resolutionNote = dto.note || '';
    item.resolvedBy = dto.reviewer || 'human_reviewer';
    item.resolvedAt = new Date().toISOString();
    return { ok: true, item };
  }


  listReviewBreaches() {
    const items = this.reviews
      .filter((x) => x.status === 'queued_for_human_review')
      .map((item) => ({
        ...item,
        queueAgeMinutes: Number(((Date.now() - new Date(item.queuedAt).getTime()) / 60000).toFixed(2)),
      }))
      .filter((item) => item.queueAgeMinutes > item.maxReviewWaitMinutes);
    return { ok: true, count: items.length, items };
  }

  queueOverview() {
    const items = this.reviews.filter((x) => x.status === 'queued_for_human_review');
    return {
      ok: true,
      queued: items.length,
      breaches: items.filter((item) => ((Date.now() - new Date(item.queuedAt).getTime()) / 60000) > item.maxReviewWaitMinutes).length,
      byGroup: items.reduce((acc: Record<string, number>, item) => {
        const key = item.reviewerGroup || 'unassigned';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  scorecardOverview() {
    const domains = Object.keys(this.thresholds);
    return {
      ok: true,
      items: domains.map((domain) => {
        const reports = this.reports.filter((x) => x.domain === domain);
        const queued = this.reviews.filter((x) => x.domain === domain && x.status === 'queued_for_human_review');
        const latest = reports[0];
        return {
          domain,
          evaluations: reports.length,
          queuedReviews: queued.length,
          avgQueueAgeMinutes: queued.length ? Number((queued.reduce((acc, item) => acc + (Date.now() - new Date(item.queuedAt).getTime()) / 60000, 0) / queued.length).toFixed(2)) : 0,
          latestDecision: latest?.trustDecision ?? null,
          latestConfidence: latest?.confidence ?? null,
          latestGrounding: latest?.grounding ?? null,
          thresholds: this.thresholds[domain],
        };
      }),
    };
  }
}
