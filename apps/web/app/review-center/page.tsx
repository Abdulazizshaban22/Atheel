import { AppShell } from '../../components/AppShell';
import { apiGet } from '../../lib/api';

type Summary = {
  approvals?: Array<{ id: string; title: string; status: string; updatedAt?: string }>;
  attachments?: Array<{ id: string; originalName: string; entityType?: string; uploadedAt?: string }>;
};

export default async function ReviewCenterPage() {
  const approvals = await apiGet<any[]>('/approvals');
  const attachments = await apiGet<any[]>('/attachments');
  const summary: Summary = { approvals: approvals || [], attachments: attachments || [] };

  return (
    <AppShell
      title="Review Center"
      subtitle="مركز إقفال الاعتمادات والمرفقات وجودة المراجعة بدل التنقل بين الصفحات المتفرقة"
      badge="Closure Shell"
    >
      <section className="grid grid-2">
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>الموافقات</h3>
            <a className="btn btn-ghost" href="/approvals">فتح الوحدة</a>
          </div>
          <div className="notice">هذه المساحة تجمع الطلبات المفتوحة، الحزم، ودرجة الإقفال قبل العرض التنفيذي.</div>
          <table>
            <thead><tr><th>العنوان</th><th>الحالة</th><th>آخر تحديث</th></tr></thead>
            <tbody>
              {(summary.approvals || []).slice(0, 8).map((row) => (
                <tr key={row.id}><td>{row.title}</td><td>{row.status}</td><td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString('ar-SA') : '—'}</td></tr>
              ))}
              {!(summary.approvals || []).length && <tr><td colSpan={3}>لا توجد موافقات متاحة حاليًا</td></tr>}
            </tbody>
          </table>
          <div className="row">
            <a className="btn btn-secondary" href="/approval-packets">Approval Packets</a>
            <a className="btn btn-ghost" href="/governance/readiness">جاهزية الحوكمة</a>
            <a className="btn btn-ghost" href="/audit-logs">سجل التدقيق</a>
          </div>
        </div>

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>المرفقات والأدلة</h3>
            <a className="btn btn-ghost" href="/attachments">فتح الوحدة</a>
          </div>
          <div className="notice">تجميع المرفقات المرتبطة بالكيانات الأساسية لتسريع الفحص قبل الاعتماد أو التسليم.</div>
          <table>
            <thead><tr><th>الملف</th><th>الكيان</th><th>تاريخ الرفع</th></tr></thead>
            <tbody>
              {(summary.attachments || []).slice(0, 8).map((row) => (
                <tr key={row.id}><td>{row.originalName}</td><td>{row.entityType || '—'}</td><td>{row.uploadedAt ? new Date(row.uploadedAt).toLocaleString('ar-SA') : '—'}</td></tr>
              ))}
              {!(summary.attachments || []).length && <tr><td colSpan={3}>لا توجد مرفقات متاحة حاليًا</td></tr>}
            </tbody>
          </table>
          <div className="row">
            <a className="btn btn-secondary" href="/content">المحتوى</a>
            <a className="btn btn-ghost" href="/projects">المشاريع</a>
            <a className="btn btn-ghost" href="/users">المستخدمون</a>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
