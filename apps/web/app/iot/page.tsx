'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Device = {
  id: string;
  organizationId?: string;
  twinId?: string;
  nameAr: string;
  kind: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function IoTPage() {
  const [items, setItems] = useState<Device[]>([]);
  const [busy, setBusy] = useState(false);

  const [nameAr, setNameAr] = useState('جهاز جديد');
  const [kind, setKind] = useState('counter');
  const [orgId, setOrgId] = useState('org_demo_1');
  const [twinId, setTwinId] = useState('twin_demo_1');
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  async function load() {
    const res = await apiRequest<any>('/iot/devices', { method: 'GET' });
    setItems(res.data?.items || []);
  }

  useEffect(() => { load(); }, []);

  async function createDevice() {
    setBusy(true);
    setLastSecret(null);
    try {
      const res = await apiRequest<any>('/iot/devices', {
        method: 'POST',
        body: { nameAr, kind, organizationId: orgId, twinId, isActive: true },
      });
      setLastSecret(res.data?.secretKey || null);
      await load();
    } finally { setBusy(false); }
  }

  async function rotate(id: string) {
    setBusy(true);
    setLastSecret(null);
    try {
      const res = await apiRequest<any>(`/iot/devices/${id}/rotate-key`, { method: 'POST' });
      setLastSecret(res.data?.secretKey || null);
      await load();
    } finally { setBusy(false); }
  }

  return (
    <AppShell
      title="IoT"
      subtitle="إدارة أجهزة القياس وربطها بالتوأم الرقمي (Telemetry → Twin 4D)"
      badge={items.length ? `${items.length} أجهزة` : '—'}
      actions={<button className="btn" disabled={busy} onClick={load}>تحديث</button>}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 340 }}>
            <div className="muted">إنشاء جهاز</div>
            <div className="stack" style={{ gap: 8 }}>
              <input className="input" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {['counter','sensor','gateway','camera','beacon','manual'].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="organizationId" />
              <input className="input" value={twinId} onChange={(e) => setTwinId(e.target.value)} placeholder="twinId" />
              <button className="btn" disabled={busy} onClick={createDevice}>إنشاء</button>
              {lastSecret ? (
                <div className="card">
                  <div className="muted">مفتاح الجهاز (يظهر مرة واحدة)</div>
                  <div style={{ wordBreak: 'break-all' }}>{lastSecret}</div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    استخدمه في Telemetry:
                    <div style={{ wordBreak: 'break-all' }}>
                      POST /api/iot/ingest مع Headers: x-device-id و x-device-key
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 520 }}>
            <div className="muted">الأجهزة</div>
            <div className="stack" style={{ gap: 10 }}>
              {items.map((d) => (
                <div key={d.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.nameAr}</div>
                      <div className="muted">{d.kind} • {d.id}</div>
                      <div className="muted">twinId: {d.twinId || '—'} • orgId: {d.organizationId || '—'}</div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-ghost" disabled={busy} onClick={() => rotate(d.id)}>تدوير المفتاح</button>
                    </div>
                  </div>
                </div>
              ))}
              {!items.length ? <div className="muted">لا يوجد أجهزة بعد</div> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
