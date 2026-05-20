import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';
import { ExportActions } from '../../../components/ExportActions';
import { ApprovalPacketActions } from '../../../components/ApprovalPacketActions';

export default async function Page({ params }: { params: { id: string } }) {
  const res = await apiGet<{ ok: boolean; item: any }>(`/approval-packets/${params.id}`);
  const item = res?.item;
  const packetContentId = (item?.artifacts?.contentItemIds || [])[3] || '';

  return (
    <AppShell title="تفاصيل حزمة الاعتماد" subtitle="المحتوى المتولد مرتبط بعناصر محتوى داخل المنصة" badge="Wave11">
      {!item ? (
        <section className="card"><div className="notice">لم يتم العثور على الحزمة</div></section>
      ) : (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>{item.title}</h2>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span className="badge">{item.status}</span>
              <span className="badge">scenario: {item.scenarioKey}</span>
              <span className="mono">sim: {item.simulationRunId}</span>
              <span className="mono">twin: {item.twinId}</span>
            </div>
            <div className="notice">
              <b>ملخص تنفيذي</b>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{(item.sections?.executiveSummaryAr || '').slice(0, 1200)}</pre>
            </div>
          </section>

          <section className="card stack">
            <h3 style={{ margin: 0 }}>المخرجات المرتبطة</h3>
            <div className="muted">تم توليد 4 مستندات وربطها كعناصر محتوى مع مرفقات Markdown.</div>
            {Array.isArray(item.artifacts?.contentItemIds) ? (
              <ul className="list">
                {item.artifacts.contentItemIds.map((cid: string, idx: number) => (
                  <li key={cid} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>مستند {idx + 1}</span>
                    <span className="mono">{cid}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.artifacts, null, 2)}</pre>
            )}
          </section>

          {packetContentId ? (
            <ApprovalPacketActions approvalPacketId={params.id} organizationId={item.organizationId || 'org_demo_1'} packetContentId={packetContentId} title={item.title} />
          ) : null}

          <ExportActions approvalPacketId={params.id} />
        </>
      )}
    </AppShell>
  );
}
