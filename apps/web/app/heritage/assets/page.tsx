'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export default function HeritageAssetsPage() {
  const [orgId, setOrgId] = useState('org_demo_1');
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [assetType, setAssetType] = useState<'material'|'immaterial'|'architectural'>('material');
  const [accessLevel, setAccessLevel] = useState<'public'|'researchers'|'internal'|'restricted'>('internal');

  async function load() {
    setErr('');
    const q = new URLSearchParams({ organizationId: orgId });
    const res = await apiRequest(`/heritage/assets?${q.toString()}`);
    if (!res.ok) return setErr(res.error || 'فشل تحميل السجل');
    setItems((res.data as any)?.items || []);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    setErr('');
    const res = await apiRequest('/heritage/assets', { method: 'POST', body: { organizationId: orgId, titleAr, assetType, accessLevel }});
    if (!res.ok) return setErr(res.error || 'فشل إنشاء الأصل');
    setTitleAr('');
    await load();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="badge">Heritage Registry</div>
        <h1 style={{ margin: '8px 0 0' }}>سجل التراث</h1>
        <div className="muted">توثيق أصول تراثية مع بروتوكولات وصول داخلية</div>

        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="stack" style={{ minWidth: 240 }}>
            <div className="label">Organization ID</div>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} />
          </div>
          <div className="stack" style={{ flex: 1, minWidth: 280 }}>
            <div className="label">عنوان الأصل</div>
            <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="مثال: بيت تراثي في الطائف" />
          </div>
          <div className="stack">
            <div className="label">النوع</div>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value as any)}>
              <option value="material">مادي</option>
              <option value="immaterial">غير مادي</option>
              <option value="architectural">عمراني</option>
            </select>
          </div>
          <div className="stack">
            <div className="label">مستوى الوصول</div>
            <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as any)}>
              <option value="public">عام</option>
              <option value="researchers">باحثين</option>
              <option value="internal">داخلي</option>
              <option value="restricted">مقيد</option>
            </select>
          </div>
          <div className="stack" style={{ justifyContent: 'end' }}>
            <button className="btn" onClick={create} disabled={!titleAr.trim()}>إضافة</button>
          </div>
          <div className="stack" style={{ justifyContent: 'end' }}>
            <button className="btn btn-secondary" onClick={load}>تحديث</button>
          </div>
        </div>

        {err ? <div className="notice error">{err}</div> : null}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>الأصول</h2>
        <div className="muted">يتم إخفاء الأصول المقيدة حسب بروتوكول الوصول</div>

        <div className="stack">
          {items.map((a) => (
            <div key={a.id} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div><b>{a.titleAr}</b></div>
                <div className="muted">{a.assetType} • {a.accessLevel} • {a.status}</div>
              </div>
              {a.descriptionAr ? <div className="muted" style={{ marginTop: 6 }}>{a.descriptionAr}</div> : null}
              {a.protocols?.length ? (
                <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                  {a.protocols.slice(0,5).map((p: any) => <span key={p.id} className="badge">{p.nameAr}</span>)}
                </div>
              ) : null}
            </div>
          ))}
          {!items.length ? <div className="muted">لا يوجد أصول بعد</div> : null}
        </div>
      </section>
    </main>
  );
}
