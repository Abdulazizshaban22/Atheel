'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Agent = { id: string; name?: string; label?: string; type?: string; riskLevel?: string; };
type Scorecard = { ok?: boolean; agent?: Agent; scorecard?: { passRate?: number; citationQuality?: number; policyCompliance?: number; hallucinationRisk?: number; recommendationUsefulness?: number; }; };

type JobsResponse = { items?: Array<{ id: string; status: string; payload?: { agentId?: string } }> } | null;

export default function AiScorecardsPage() {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGet<JobsResponse>('/ai/jobs');
      if (!mounted) return;
      const ids = Array.from(new Set((res?.items || []).map((x) => x.payload?.agentId).filter(Boolean))) as string[];
      const cards = await Promise.all(ids.slice(0, 8).map((id) => apiGet<Scorecard>(`/ai/agents/${id}/scorecard`)));
      if (!mounted) return;
      setScorecards(cards.filter(Boolean) as Scorecard[]);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <AppShell title="بطاقات تقييم الذكاء" subtitle="Scorecards للوكلاء والقرارات المقترحة" badge="AI Scorecards">
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>الوكلاء المقيمون</h2>
          {(scorecards || []).map((card, idx) => (
            <div key={card.agent?.id || idx} className="card">
              <div><strong>{card.agent?.name || card.agent?.label || card.agent?.id || 'agent'}</strong></div>
              <div className="muted">المخاطر: {card.agent?.riskLevel || '—'}</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <span className="badge">Pass {card.scorecard?.passRate ?? '—'}</span>
                <span className="badge">Citations {card.scorecard?.citationQuality ?? '—'}</span>
                <span className="badge">Policy {card.scorecard?.policyCompliance ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>اختصارات تشغيلية</h2>
          <Link className="btn" href="/ai">لوحة الذكاء الرئيسية</Link>
          <Link className="btn btn-ghost" href="/dashboards/command-center">مركز القيادة</Link>
          <div className="notice">هذه الصفحة تربط الواجهة مباشرة بمسارات الذكاء الجديدة بدل بقاءها معزولة.</div>
        </div>
      </section>
    </AppShell>
  );
}
