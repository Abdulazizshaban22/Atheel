'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { AppShell } from '../../components/AppShell';

type NotificationRow = {
  id: string;
  organizationId?: string;
  userId?: string;
  severity: 'info' | 'warning' | 'critical' | string;
  titleAr: string;
  messageAr: string;
  entityType?: string;
  entityId?: string;
  metaJson?: any;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
};

export default function NotificationsPage() {
  // Auth via HttpOnly cookies (no localStorage token)
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState({ organizationId: 'org_demo_1', unread: 'true', limit: '50' });

  async function load() {
    setLoading(true);
    setErr('');
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await apiRequest<{ count: number; items: NotificationRow[] }>(`/notifications?${params.toString()}`);
    if (!res.ok) setErr(res.error || 'تعذر تحميل التنبيهات');
    else setRows(res.data?.items || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    const res = await apiRequest(`/notifications/${id}/read`, { method: 'PATCH'});
    if (!res.ok) { setErr(res.error || 'تعذر تعليم التنبيه كمقروء'); return; }
    await load();
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell
      title="التنبيهات الداخلية"
      subtitle="تنبيهات تغييرات الفرص والملحقات والمواعيد وغيرها"
      badge="Notifications"
      actions={<button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'جاري التحميل...' : 'تحديث'}</button>}
    >
      <section className="card stack">
        {err ? <div className="notice error">{err}</div> : null}
        <div className="form-grid cols-3">
          <div>
            <label>organizationId</label>
            <input value={filter.organizationId} onChange={(e) => setFilter({ ...filter, organizationId: e.target.value })} />
          </div>
          <div>
            <label>unread</label>
            <select value={filter.unread} onChange={(e) => setFilter({ ...filter, unread: e.target.value })}>
              <option value="">الكل</option>
              <option value="true">غير مقروء</option>
              <option value="false">مقروء</option>
            </select>
          </div>
          <div>
            <label>limit</label>
            <input value={filter.limit} onChange={(e) => setFilter({ ...filter, limit: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={load}>تطبيق</button>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>القائمة</h2>
        {rows.length === 0 ? <div className="notice">لا توجد تنبيهات مطابقة للفلاتر الحالية.</div> : null}
        <div className="stack">
          {rows.map((n) => (
            <div key={n.id} className="card" style={{ borderStyle: 'solid', borderWidth: 1 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 6 }}>
                  <div className="badge">{n.severity}</div>
                  <h3 style={{ margin: 0 }}>{n.titleAr}</h3>
                  <p className="muted" style={{ margin: 0 }}>{new Date(n.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                {!n.isRead ? (
                  <button className="btn" onClick={() => markRead(n.id)}>تعليم كمقروء</button>
                ) : (
                  <div className="badge">مقروء</div>
                )}
              </div>
              <p style={{ marginTop: 10 }}>{n.messageAr}</p>
              {(n.entityType || n.entityId) ? (
                <div className="notice">
                  مرجع: {n.entityType || '—'} / {n.entityId || '—'}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
