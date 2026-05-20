import { AppShell } from '../../components/AppShell';
import { apiGet } from '../../lib/api';

export default async function AICenterPage() {
  const scorecards = await apiGet<any>('/ai/scorecards');
  const runtimeHealth = await apiGet<any>('/ai/runtime/health');
  const quality = await apiGet<any>('/quality/rag-metrics/summary');

  return (
    <AppShell
      title="AI Center"
      subtitle="منطقة تشغيل الذكاء التوليدي والاسترجاع والتقييمات بدل التوزع بين شاشات متعددة"
      badge="AI Closure"
    >
      <section className="grid grid-3">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Runtime Health</h3>
          <pre className="code">{JSON.stringify(runtimeHealth, null, 2)}</pre>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Scorecards</h3>
          <pre className="code">{JSON.stringify(scorecards, null, 2)}</pre>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>RAG Quality</h3>
          <pre className="code">{JSON.stringify(quality, null, 2)}</pre>
        </div>
      </section>
      <section className="card row">
        <a className="btn btn-secondary" href="/ai/runtime">AI Runtime</a>
        <a className="btn btn-ghost" href="/ai/memory">الذاكرة</a>
        <a className="btn btn-ghost" href="/ai/scorecards">بطاقات الذكاء</a>
        <a className="btn btn-ghost" href="/dashboards/ai-quality">لوحة الجودة</a>
      </section>
    </AppShell>
  );
}
