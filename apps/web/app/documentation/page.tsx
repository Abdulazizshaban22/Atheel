'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Asset = { id: string; titleAr: string; url: string; citationId?: string; sourceId?: string; notesAr?: string };

export default function DocumentationPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [check, setCheck] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);

  async function load() {
    const { data } = await apiRequest<any>('/inspiration/assets?limit=80', { method: 'GET' });
    setAssets(data?.items || []);
    if (!assetId && data?.items?.[0]?.id) setAssetId(data.items[0].id);
    const rr = await apiRequest<any>('/documentation/rules', { method: 'GET' });
    setRules(rr.data?.items || []);
  }

  async function validate() {
    if (!assetId) return;
    const { data } = await apiRequest<any>('/documentation/validate/inspiration-asset', { method: 'POST', body: { assetId } });
    setCheck(data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="التوثيق"
      subtitle="تحويل أدلة التوثيق والأرشفة إلى قواعد داخل أثيل لضمان الاتساق قبل السردية والعرض"
      badge={`Assets: ${assets.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>قواعد</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {rules.map((r) => <span key={r.code} className="badge">{r.code}</span>)}
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>تحقق من أصل إلهام</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.titleAr}</option>)}
          </select>
          <button className="btn" onClick={validate}>تحقق</button>
        </div>
        {check ? <pre className="code">{JSON.stringify(check, null, 2)}</pre> : null}
      </section>
    </AppShell>
  );
}
