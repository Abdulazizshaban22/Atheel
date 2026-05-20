import { Injectable } from '@nestjs/common';

@Injectable()
export class EvalsRuntimeService {
  private readonly runs: any[] = [];
  private readonly thresholds: Record<string, unknown> = {
    heritage: { grounding: 0.85, policy: 0.95, usefulness: 0.8 },
    destination: { grounding: 0.82, partnerCoverage: 0.8, usefulness: 0.8 },
    'mega-events': { grounding: 0.83, readiness: 0.85, usefulness: 0.8 },
    exhibition: { grounding: 0.82, curation: 0.8, usefulness: 0.8 },
    'culture-programs': { grounding: 0.82, impact: 0.8, usefulness: 0.8 },
    'urban-experience': { grounding: 0.8, flow: 0.8, usefulness: 0.78 },
  };
  private readonly benchmarkSuites: Record<string, string[]> = {
    heritage: ['retrieval_grounding', 'policy_compliance', 'authenticity_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
    destination: ['retrieval_grounding', 'partner_coverage', 'seasonality_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
    'mega-events': ['retrieval_grounding', 'readiness_reasoning', 'crowd_ops_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
    exhibition: ['retrieval_grounding', 'curation_reasoning', 'asset_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
    'culture-programs': ['retrieval_grounding', 'impact_reasoning', 'partner_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
    'urban-experience': ['retrieval_grounding', 'flow_reasoning', 'wayfinding_reasoning', 'structured_output', 'citation_coverage', 'regression_guard', 'human_review_triggering'],
  };

  run(dto: any) {
    const domain = dto.domain || 'heritage';
    const threshold = this.thresholds[domain] || { grounding: 0.8, usefulness: 0.8 };
    const scores = {
      grounding: dto.grounding ?? 0.84,
      usefulness: dto.usefulness ?? 0.82,
      policy: dto.policy ?? 0.96,
      latencyBudget: dto.latencyBudget ?? 0.91,
      citationCoverage: dto.citationCoverage ?? 0.86,
      regressionStability: dto.regressionStability ?? 0.9,
      humanReviewPrecision: dto.humanReviewPrecision ?? 0.88,
    };
    const regressionPack = {
      retrievalRegression: scores.grounding >= (threshold.grounding ?? 0.8),
      usefulnessRegression: scores.usefulness >= (threshold.usefulness ?? 0.8),
      policyRegression: scores.policy >= (threshold.policy ?? 0.9),
      citationRegression: scores.citationCoverage >= 0.8,
      stabilityRegression: scores.regressionStability >= 0.85,
      humanReviewRegression: scores.humanReviewPrecision >= 0.8,
    };
    const item = {
      id: `eval_${Date.now()}`,
      domain,
      scores,
      thresholds: threshold,
      regressionPack,
      passed: Object.values(regressionPack).every(Boolean),
      createdAt: new Date().toISOString(),
    };
    this.runs.unshift(item);
    return { ok: true, item };
  }

  getBenchmark(domain: string) {
    return {
      ok: true,
      item: {
        domain,
        suites: this.benchmarkSuites[domain] || ['retrieval_grounding', 'structured_output'],
        thresholds: this.thresholds[domain] || { grounding: 0.8, usefulness: 0.8 },
        sampleSize: 180,
      },
    };
  }

  benchmarkOverview() {
    return {
      ok: true,
      items: Object.keys(this.benchmarkSuites).map((domain) => ({
        domain,
        suites: this.benchmarkSuites[domain],
        suiteCount: this.benchmarkSuites[domain].length,
        thresholds: this.thresholds[domain],
      })),
    };
  }

  latestRegression() {
    return { ok: true, item: this.runs[0] || null, count: this.runs.length };
  }

  regressionByDomain(domain: string) {
    const items = this.runs.filter((x) => x.domain === domain).slice(0, 20);
    return {
      ok: true,
      domain,
      count: items.length,
      passRate: items.length ? Number((items.filter((x) => x.passed).length / items.length).toFixed(2)) : null,
      items,
    };
  }


  thresholdBreaches() {
    const items = Object.keys(this.thresholds).map((domain) => {
      const latest = this.runs.find((x) => x.domain === domain);
      if (!latest) return { domain, breaches: [], latestRunId: null };
      const threshold = this.thresholds[domain] || {};
      const breaches = Object.entries(threshold)
        .filter(([key, value]) => typeof value === 'number' && Number(latest.scores?.[key] ?? 1) < Number(value))
        .map(([key, value]) => ({ metric: key, expected: value, actual: latest.scores?.[key] ?? null }));
      return { domain, breaches, latestRunId: latest.id, passed: latest.passed };
    });
    return { ok: true, count: items.length, items };
  }

  qualityOverview() {
    const domains = Object.keys(this.thresholds);
    return {
      ok: true,
      items: domains.map((domain) => {
        const latest = this.runs.find((x) => x.domain === domain);
        return {
          domain,
          latestPassed: latest?.passed ?? null,
          latestGrounding: latest?.scores?.grounding ?? null,
          latestCitationCoverage: latest?.scores?.citationCoverage ?? null,
          latestHumanReviewPrecision: latest?.scores?.humanReviewPrecision ?? null,
          benchmarkSuites: this.benchmarkSuites[domain]?.length ?? 0,
          thresholds: this.thresholds[domain],
        };
      }),
    };
  }
}
