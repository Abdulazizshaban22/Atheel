import { PublicShell } from '../../../../components/PublicShell';
import { apiGet } from '../../../../lib/api';
import { VerifyBundleClient } from '../../../../components/VerifyBundleClient';

export default async function Page({ params }: { params: { id: string } }) {
  const res = await apiGet<any>(`/verification/approval-packets/${params.id}`);
  const doc = res?.document;

  return (
    <PublicShell title="التحقق من حزمة الاعتماد" subtitle="صفحة تحقق عامة لجهات الاستلام" badge="Wave53">
      {!doc ? (
        <section className="card"><div className="notice">لم يتم العثور على الوثيقة</div></section>
      ) : (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>{doc.title}</h2>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span className="badge">الحالة: {doc.status}</span>
              <span className="badge">سيناريو: {doc.scenarioKey}</span>
              <span className="mono">معرّف الوثيقة: {doc.id}</span>
              <span className="mono">رمز التحقق: {doc.verificationCode}</span>
            </div>
            <div className="notice">
              <b>الجهة المُصدرة</b>
              <div>{doc.issuerNameAr}</div>
              <div className="muted">تاريخ الإصدار: {doc.generatedAt}</div>
            </div>
            {Array.isArray(res.instructionsAr) ? (
              <div className="notice">
                <b>طريقة التحقق (سريع أو تدقيقي)</b>
                <ol>
                  {res.instructionsAr.map((x: string, i: number) => (
                    <li key={i}>{x}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>

          <VerifyBundleClient expectedPacketId={params.id} />
        </>
      )}
    </PublicShell>
  );
}
