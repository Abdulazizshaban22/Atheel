import { Injectable } from '@nestjs/common';

@Injectable()
export class MemoryRuntimeService {
  private readonly outcomes: any[] = [];
  private readonly patterns: any[] = [];
  private readonly feedback: any[] = [];

  captureProjectOutcome(projectId: string, dto: any) {
    const item = {
      projectId,
      domain: dto.domain || 'core',
      whatWorked: dto.whatWorked || [],
      whatFailed: dto.whatFailed || [],
      lessons: dto.lessons || [],
      promotedPatternCandidates: (dto.lessons || []).slice(0, 3),
      createdAt: new Date().toISOString(),
    };
    this.outcomes.unshift(item);
    return { ok: true, item };
  }

  getPatterns(domain: string) {
    return { ok: true, items: this.patterns.filter((x) => x.domain === domain), outcomeCount: this.outcomes.filter((x) => x.domain === domain).length };
  }

  promotePattern(dto: any) {
    const item = { id: `pat_${Date.now()}`, domain: dto.domain || 'core', title: dto.title, rule: dto.rule, sourceProjectId: dto.sourceProjectId || null, createdAt: new Date().toISOString() };
    this.patterns.unshift(item);
    return { ok: true, item };
  }

  captureAgentFeedback(agentId: string, dto: any) {
    const item = { id: `fb_${Date.now()}`, agentId, domain: dto.domain || 'core', score: dto.score ?? 0.8, note: dto.note || '', createdAt: new Date().toISOString() };
    this.feedback.unshift(item);
    return { ok: true, item };
  }

  getAgentFeedback(id: string) {
    const items = this.feedback.filter((x) => x.agentId === id);
    return { ok: true, item: { agentId: id, feedbackLoops: items.length, lastPromotedPatternAt: this.patterns.find((x) => x.domain === items[0]?.domain)?.createdAt || null, items } };
  }

  domainOverview() {
    const domains = Array.from(new Set([...this.outcomes.map((x) => x.domain), ...this.patterns.map((x) => x.domain), ...this.feedback.map((x) => x.domain)])).filter(Boolean);
    return {
      ok: true,
      items: domains.map((domain) => ({
        domain,
        outcomes: this.outcomes.filter((x) => x.domain === domain).length,
        patterns: this.patterns.filter((x) => x.domain === domain).length,
        feedbackItems: this.feedback.filter((x) => x.domain === domain).length,
      })),
    };
  }
}
