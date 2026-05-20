'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type ReleaseGatePayload = {
  ok?: boolean;
  releaseGate?: string;
  posture?: string;
  readiness?: { readiness?: { score0to100?: number; boardAttentionRequired?: boolean } };
  queueStats?: { totals?: { queued?: number; active?: number; completed?: number; failed?: number } };
  actionsAr?: string[];
  noteAr?: string;
};

export default function ReleaseGatePage() {
  const [data, setData] = useState<ReleaseGatePayload | null>(null);

  useEffect(() => {
    apiGet<ReleaseGatePayload>('/governance/release-gate/details').then(setData);
  }, []);

  return (
    <AppShell
      title="بوابة الإطلاق"
      subtitle="قرار تنفيذي موحد قبل go-live يجمع الجاهزية والرصد وصحة الطوابير"
      badge="Release Gate"
    >
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>قرار الإطلاق</h2>
          <div>Release Gate: <strong>{data?.releaseGate || '—'}</strong></div>
          <div>Posture: <strong>{data?.posture || '—'}</strong></div>
          <div>Readiness Score: <strong>{data?.readiness?.readiness?.score0to100 ?? '—'}</strong></div>
          <div>Board Attention: <strong>{data?.readiness?.readiness?.boardAttentionRequired ? 'نعم' : 'لا'}</strong></div>
          <div className="notice">{data?.noteAr || '—'}</div>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>صحة الطوابير</h2>
          <div>Queued: {data?.queueStats?.totals?.queued ?? 0}</div>
          <div>Active: {data?.queueStats?.totals?.active ?? 0}</div>
          <div>Completed: {data?.queueStats?.totals?.completed ?? 0}</div>
          <div>Failed: {data?.queueStats?.totals?.failed ?? 0}</div>
        </div>
      </section>
      <section className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>الإجراءات المقترحة</h2>
        {(data?.actionsAr || []).length ? (
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {(data?.actionsAr || []).map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        ) : (
          <div className="muted">لا توجد إجراءات معروضة</div>
        )}
      </section>
    </AppShell>
  );
}
