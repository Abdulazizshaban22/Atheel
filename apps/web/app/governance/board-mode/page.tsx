'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type BoardSummary = { ok?: boolean; executiveSummaryAr?: string; posture?: { blocked?: number; conditional?: number; ready?: number }; latestDecisions?: Array<{ id: string; verdict: string; riskLevel: string; entityType: string; entityId?: string }>; };

export default function GovernanceBoardModePage() {
  const [data, setData] = useState<BoardSummary | null>(null);
  useEffect(() => { apiGet<BoardSummary>('/governance/board-mode/summary').then(setData); }, []);
  return (
    <AppShell title="Board Mode" subtitle="ملخص تنفيذي لمجلس الإدارة" badge="Governance">
      <section className="card stack">
        <div className="notice">{data?.executiveSummaryAr || 'جاري تحميل الملخص التنفيذي...'}</div>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card"><div className="muted">Blocked</div><strong>{data?.posture?.blocked ?? 0}</strong></div>
          <div className="card"><div className="muted">Conditional</div><strong>{data?.posture?.conditional ?? 0}</strong></div>
          <div className="card"><div className="muted">Ready</div><strong>{data?.posture?.ready ?? 0}</strong></div>
        </div>
        <div className="stack">
          {(data?.latestDecisions || []).map((item) => (
            <div key={item.id} className="card">
              <strong>{item.entityType}</strong> — {item.verdict}
              <div className="muted">{item.entityId || '—'} • {item.riskLevel}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
