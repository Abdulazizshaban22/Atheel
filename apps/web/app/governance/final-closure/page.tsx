import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Summary = {
  releaseGate?: string; posture?: string;
  readiness?: { readiness?: { score0to100?: number; releaseGate?: string } };
  domains?: Array<{ key: string; titleAr: string; status: string }>;
  actionsAr?: string[];
};

export default async function FinalClosurePage() {
  const details = await apiGet<Summary>('/governance/final-closure/summary');
  return (
    <AppShell title="Final Closure" subtitle="لوحة الإغلاق النهائي للمجالات والجاهزية التشغيلية" badge="Closure">
      <section className="grid grid-4">
        <div className="card"><h3>Release Gate</h3><p>{details?.releaseGate ?? '—'}</p></div>
        <div className="card"><h3>Posture</h3><p>{details?.posture ?? '—'}</p></div>
        <div className="card"><h3>Readiness</h3><p>{details?.readiness?.readiness?.score0to100 ?? 0}</p></div>
        <div className="card"><h3>Domains</h3><p>{details?.domains?.length ?? 0}</p></div>
      </section>
      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card"><h3 style={{ marginTop: 0 }}>المجالات</h3><table><thead><tr><th>المجال</th><th>الحالة</th></tr></thead><tbody>{(details?.domains ?? []).map((d)=><tr key={d.key}><td>{d.titleAr}</td><td>{d.status}</td></tr>)}</tbody></table></div>
        <div className="card"><h3 style={{ marginTop: 0 }}>الإجراءات</h3><ul>{(details?.actionsAr ?? []).map((a,i)=><li key={i}>{a}</li>)}</ul></div>
      </section>
    </AppShell>
  );
}
