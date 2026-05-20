import { AppShell } from '../../components/AppShell';
import { apiGet } from '../../lib/api';

export default async function OperationsCenterPage() {
  const ready = await apiGet<any>('/health/ready');
  const queues = await apiGet<any>('/health/queues');
  const startup = await apiGet<any>('/health/startup');

  return (
    <AppShell
      title="Operations Center"
      subtitle="مركز التشغيل والـ health والصفوف والجاهزية قبل staging dress rehearsal"
      badge="Ops Closure"
    >
      <section className="grid grid-3">
        <div className="card stack">
          <div className={`badge ${ready?.ok ? 'success' : 'danger'}`}>{ready?.status || 'unknown'}</div>
          <h3 style={{ margin: 0 }}>Readiness</h3>
          <div className="notice">قاعدة البيانات والطوابير والعمال يجب أن تمر هنا قبل أي ترقية إلى staging.</div>
          <pre className="code">{JSON.stringify(ready, null, 2)}</pre>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Queues</h3>
          <div className="notice">صورة تشغيلية للطوابير والـ diagnostics الحالية.</div>
          <pre className="code">{JSON.stringify(queues, null, 2)}</pre>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Startup Profile</h3>
          <div className="notice">يوضح وجود الإعدادات الحرجة بدون كشف القيم السرية.</div>
          <pre className="code">{JSON.stringify(startup, null, 2)}</pre>
        </div>
      </section>
      <section className="card stack">
        <div className="row">
          <a className="btn btn-secondary" href="/observability">الرصد التشغيلي</a>
          <a className="btn btn-ghost" href="/queues/health">Queue Health</a>
          <a className="btn btn-ghost" href="/governance/release-gate">Release Gate</a>
          <a className="btn btn-ghost" href="/governance/final-closure">Final Closure</a>
        </div>
      </section>
    </AppShell>
  );
}
