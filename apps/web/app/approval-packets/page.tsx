import { AppShell } from '../../components/AppShell';
import { apiGet } from '../../lib/api';

type ApprovalPacketItem = {
  id: string;
  title: string;
  scenarioKey: string;
  status: string;
  simulationRunId: string;
  twinId?: string;
  projectId?: string;
  experienceId?: string;
  generatedAt: string;
};

export default async function Page() {
  const res = await apiGet<{ count: number; items: ApprovalPacketItem[] }>(`/approval-packets`);
  const items = res?.items || [];

  return (
    <AppShell title="حزم الاعتماد" subtitle="حزم رسمية مبنية على محاكاة التوأم الرقمي وتوليد تلقائي لعرض الفعالية والاستراتيجية والدراسة التشغيلية" badge="Wave11">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>القائمة</h2>
          <div className="muted">{res?.count ?? 0} حزمة</div>
        </div>
        {items.length === 0 ? (
          <div className="notice">لا توجد حزم بعد. شغّل محاكاة من صفحة التوأم الرقمي وستتولد الحزمة تلقائيًا.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>السيناريو</th>
                <th>الحالة</th>
                <th>المحاكاة</th>
                <th>تاريخ التوليد</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td><a href={`/approval-packets/${x.id}`}>{x.title}</a></td>
                  <td>{x.scenarioKey}</td>
                  <td>{x.status}</td>
                  <td className="mono">{x.simulationRunId}</td>
                  <td className="mono">{new Date(x.generatedAt).toLocaleString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
