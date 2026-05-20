'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { getToken } from '../lib/session';

type Approval = { id: string; status: string; title: string; dueAt?: string; decidedAt?: string; decisionNote?: string; requestedChanges?: string; currentApproverId?: string };

export function ApprovalPacketActions(props: { approvalPacketId: string; organizationId: string; packetContentId: string; title: string }) {
  const token = getToken();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Approval[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const latest = useMemo(() => rows?.[0], [rows]);

  async function load() {
    setErr(null);
    try {
      const res = await apiRequest<any>(`/approvals?organizationId=${encodeURIComponent(props.organizationId)}&entityType=content&entityId=${encodeURIComponent(props.packetContentId)}`, { token });
      if (!res.ok) throw new Error(res.error || 'تعذر تحميل طلبات الاعتماد');
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || res.data || []);
      setRows(items || []);
    } catch (e: any) {
      setErr(e?.message || 'حدث خطأ');
    }
  }

  useEffect(() => { if (token) void load(); }, []);

  async function createAndSubmit() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const create = await apiRequest<any>('/approvals', {
        method: 'POST',
        token,
        body: {
          organizationId: props.organizationId,
          entityType: 'content',
          entityId: props.packetContentId,
          title: `اعتماد: ${props.title}`,
          dueAt,
          payloadSnapshot: {
            approvalPacketId: props.approvalPacketId,
            approvalPacketContentId: props.packetContentId,
            organizationId: props.organizationId,
          },
        },
      });
      if (!create.ok) throw new Error(create.error || 'فشل إنشاء طلب الاعتماد');
      const approvalId = create.data?.id || create.data?.approval?.id || create.data?.item?.id;
      if (!approvalId) throw new Error('لم يتم استرجاع معرف طلب الاعتماد');

      const submit = await apiRequest<any>(`/approvals/${approvalId}/submit`, { method: 'POST', token, body: { currentApproverId: 'usr_super_1' } });
      if (!submit.ok) throw new Error(submit.error || 'فشل إرسال طلب الاعتماد');

      setMsg('تم إنشاء الطلب وإرساله للمعتمد الحالي');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <h3 style={{ margin: 0 }}>الاعتماد</h3>
      <div className="muted">
        ربط قرار الاعتماد بالحزمة عبر سجل رسمي وتدقيق كامل، ثم تمكين التصدير كحزمة تسليم مؤسسية.
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={createAndSubmit} disabled={loading}>
          {loading ? 'جاري إنشاء الطلب...' : 'إنشاء طلب اعتماد وربطه بالحزمة'}
        </button>
        {latest?.status ? <span className="badge">آخر حالة: {latest.status}</span> : <span className="badge">لا يوجد طلب مرتبط</span>}
        <a className="btn btn-ghost" href="/approvals">فتح صندوق الاعتمادات</a>
      </div>

      {msg ? <div className="notice success">{msg}</div> : null}
      {err ? <div className="notice error">{err}</div> : null}

      {latest ? (
        <div className="notice">
          <b>تفاصيل آخر طلب</b>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <span className="badge">id: {latest.id}</span>
            {latest.dueAt ? <span className="badge">due: {latest.dueAt}</span> : null}
            {latest.currentApproverId ? <span className="badge">approver: {latest.currentApproverId}</span> : null}
          </div>
          {latest.decisionNote ? <div style={{ marginTop: 8 }}>قرار: {latest.decisionNote}</div> : null}
          {latest.requestedChanges ? <div style={{ marginTop: 8 }}>تعديلات مطلوبة: {latest.requestedChanges}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
