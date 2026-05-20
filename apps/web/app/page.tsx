import { apiGet } from '../lib/api';
import { MetricCard } from '../components/MetricCard';
import { AppShell } from '../components/AppShell';

type Dashboard = {
  counts: { orgs: number; projects: number; content: number; experiences: number };
  metrics: { contentQualityIndex: number; culturalImpactScore: number };
  generatedAt: string;
};

type Project = { id: string; code: string; nameAr: string; status: string; progressPercent: number };

export default async function HomePage() {
  const dashboard = await apiGet<Dashboard>('/analytics/dashboard');
  const projects = await apiGet<Project[]>('/projects');

  return (
    <AppShell
      title="لوحة الإقفال التنفيذي"
      subtitle="تجميع المسارات الأساسية في واجهة واحدة قابلة للمراجعة والتشغيل"
      badge="Closure Program"
      summary={
        <>
          <div className="readiness-band">
            <div className="readiness-pill">Core CRUD: Prisma Only</div>
            <div className="readiness-pill">Fallback: Disabled in strict env</div>
            <div className="readiness-pill">CI: Build + Smoke + Closure Audits</div>
            <div className="readiness-pill">Release Gate: Migration Closure</div>
          </div>
          <div className="row">
            <a className="btn" href="/review-center">مراجعة الاعتماد</a>
            <a className="btn btn-secondary" href="/operations-center">عمليات المنصة</a>
            <a className="btn btn-secondary" href="/ai-center">جودة الذكاء</a>
            <a className="btn btn-ghost" href="/governance/migration-closure">إغلاق الهجرات</a>
          </div>
        </>
      }
    >
      <section className="metric-strip">
        <MetricCard title="الجهات" value={dashboard?.counts.orgs ?? '—'} />
        <MetricCard title="المشاريع" value={dashboard?.counts.projects ?? '—'} />
        <MetricCard title="المحتوى" value={dashboard?.counts.content ?? '—'} />
        <MetricCard title="التجارب" value={dashboard?.counts.experiences ?? '—'} />
      </section>

      <section className="grid grid-2">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>حالة الرحلات الأساسية</h3>
          <table>
            <tbody>
              <tr><th>مؤشر جودة المحتوى</th><td>{dashboard?.metrics.contentQualityIndex ?? '—'}</td></tr>
              <tr><th>مؤشر الأثر الثقافي</th><td>{dashboard?.metrics.culturalImpactScore ?? '—'}</td></tr>
              <tr><th>آخر تحديث</th><td>{dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleString('ar-SA') : '—'}</td></tr>
              <tr><th>المسار الموصى به</th><td>Review Center → Operations Center → AI Center → Governance</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>المشاريع النشطة</h3>
          <table>
            <thead>
              <tr>
                <th>الكود</th><th>المشروع</th><th>الحالة</th><th>التقدم</th>
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).slice(0, 8).map((p) => (
                <tr key={p.id}>
                  <td>{p.code}</td>
                  <td>{p.nameAr}</td>
                  <td>{p.status}</td>
                  <td>{p.progressPercent}%</td>
                </tr>
              ))}
              {(!projects || projects.length === 0) && (
                <tr><td colSpan={4}>لا توجد بيانات حالياً — شغّل API أو أضف سجلات جديدة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
