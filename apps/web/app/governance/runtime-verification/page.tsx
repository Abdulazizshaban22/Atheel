import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Verification = {
  commands?: string[];
  successCriteria?: string[];
  blockers?: string[];
  executionOrder?: string[];
  noteAr?: string;
};

export default async function RuntimeVerificationPage() {
  const data = await apiGet<Verification>('/governance/runtime-verification/plan');
  return (
    <AppShell title="Runtime Verification" subtitle="خطة تحقق تشغيلية نهائية قبل go-live" badge="Verification">
      <section className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>ترتيب التنفيذ</h3>
          <ol>{(data?.executionOrder ?? []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>أوامر التحقق</h3>
          <ul>{(data?.commands ?? []).map((x, i) => <li key={i}><code>{x}</code></li>)}</ul>
        </div>
      </section>
      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>معايير النجاح</h3>
          <ul>{(data?.successCriteria ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>المعوقات الحالية</h3>
          <ul>{(data?.blockers ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          <p style={{ opacity: 0.8 }}>{data?.noteAr ?? ''}</p>
        </div>
      </section>
    </AppShell>
  );
}
