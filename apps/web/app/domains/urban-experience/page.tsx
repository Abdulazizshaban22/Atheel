
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Dashboard = {
  summary?: { documents?: number; experiences?: number; localOffers?: number };
  quality?: { score?: number; posture?: string };
  vector?: { mode?: string; syncState?: string };
  linkage?: { linkageScore?: number; posture?: string };
  readiness?: { score?: number; posture?: string };
  recentEvals?: Array<{ id: string; query: string; flowScore: number; routeCoverageScore: number }>;
};

export default async function UrbanExperienceDomainPage() {
  const dashboard = await apiGet<Dashboard>('/domains/urban-experience/dashboard');
  return (
    <AppShell title="Atheel Urban Experience" subtitle="مجال التجربة الحضرية: المسارات، التدفق، التفعيل، والإرشاد المكاني" badge="Batch C">
      <section className="grid grid-4">
        <div className="card"><h3>الوثائق</h3><p>{dashboard?.summary?.documents ?? 0}</p></div>
        <div className="card"><h3>التجارب</h3><p>{dashboard?.summary?.experiences ?? 0}</p></div>
        <div className="card"><h3>جودة corpus</h3><p>{dashboard?.quality?.score ?? 0} / {dashboard?.quality?.posture ?? '—'}</p></div>
        <div className="card"><h3>جاهزية المجال</h3><p>{dashboard?.readiness?.score ?? 0} / {dashboard?.readiness?.posture ?? '—'}</p></div>
      </section>
      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>وضع الاسترجاع</h3>
          <table><tbody>
            <tr><th>Vector mode</th><td>{dashboard?.vector?.mode ?? '—'}</td></tr>
            <tr><th>Sync state</th><td>{dashboard?.vector?.syncState ?? '—'}</td></tr>
            <tr><th>Flow linkage</th><td>{dashboard?.linkage?.linkageScore ?? 0} / {dashboard?.linkage?.posture ?? '—'}</td></tr>
          </tbody></table>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>آخر التقييمات</h3>
          <table>
            <thead><tr><th>الاستعلام</th><th>Flow</th><th>Coverage</th></tr></thead>
            <tbody>
              {(dashboard?.recentEvals ?? []).map((row) => (
                <tr key={row.id}><td>{row.query}</td><td>{row.flowScore}</td><td>{row.routeCoverageScore}</td></tr>
              ))}
              {(!dashboard?.recentEvals || dashboard.recentEvals.length === 0) && <tr><td colSpan={3}>لا توجد تقييمات بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
