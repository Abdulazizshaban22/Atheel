import { AppShell } from '../../../components/AppShell';

const blocking = [
  'حصر جميع placeholder migrations وتثبيت تقرير readiness',
  'توليد SQL الحقيقي من Prisma لكل migration غير مغلقة',
  'اختبار migrate deploy على Stage نظيفة قبل الترقية',
  'منع release promotion إذا ظل أي scaffold داخل التاريخ',
];

export default function MigrationClosurePage() {
  return (
    <AppShell
      title="إغلاق الهجرات"
      subtitle="مسار الحسم الأخير قبل اعتماد Stage و Production"
      badge="Migration Closure"
      summary={
        <div className="readiness-band">
          <div className="readiness-pill">Inventory موجود</div>
          <div className="readiness-pill">Release Gate موجود</div>
          <div className="readiness-pill">Baseline Runbook موجود</div>
          <div className="readiness-pill">المنع النهائي يعتمد على استبدال placeholder SQL</div>
        </div>
      }
    >
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>ما تم إغلاقه</h2>
          <ul className="list">
            <li>تقرير Placeholder Migrations inventory</li>
            <li>تقرير Migration Closure Readiness</li>
            <li>Workflow منفصل لـ Release Gate</li>
            <li>سياسة Stage و Production تمنع الترقية مع migrations غير مغلقة</li>
          </ul>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>ما بقي قبل الترقية</h2>
          <ul className="list">
            {blocking.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Definition of Done الخاص بالهجرات</h2>
        <table>
          <tbody>
            <tr><th>Placeholder count</th><td>0 على قناة staging/production</td></tr>
            <tr><th>Migration deploy</th><td>ينجح end-to-end على قاعدة Stage نظيفة</td></tr>
            <tr><th>Review</th><td>كل SQL الجديدة مراجعَة وموثقة</td></tr>
            <tr><th>Evidence</th><td>تقرير readiness + rehearsal + artifact upload</td></tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
