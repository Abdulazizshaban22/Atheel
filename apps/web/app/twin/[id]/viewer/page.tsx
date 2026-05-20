'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../components/AppShell';
import { apiRequest } from '../../../../lib/api';
import GltfViewer from '../../../../components/twin/GltfViewer';
import TilesetViewer from '../../../../components/twin/TilesetViewer';

type TwinLayer = {
  id: string;
  twinId: string;
  nameAr: string;
  kind: 'geojson' | 'gltf' | 'three_d_tiles' | 'image' | 'pdf' | 'link';
  uri: string;
  contentType?: string;
};

export default function TwinViewerPage({ params }: { params: { id: string } }) {
  const twinId = params.id;
  const [layers, setLayers] = useState<TwinLayer[]>([]);
  const [activeTab, setActiveTab] = useState<'gltf' | 'tiles'>('gltf');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');

  async function loadLayers() {
    const res = await apiRequest<{ items: TwinLayer[] }>(`/twin/${twinId}/layers`, { method: 'GET' });
    setLayers(res.data?.items || []);
    if (!selectedLayerId && (res.data?.items || []).length) {
      setSelectedLayerId((res.data?.items || [])[0]?.id);
    }
  }

  useEffect(() => {
    loadLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinId]);

  const selected = useMemo(() => layers.find((l) => l.id === selectedLayerId), [layers, selectedLayerId]);

  const gltfLayers = useMemo(() => layers.filter((l) => l.kind === 'gltf'), [layers]);
  const tileLayers = useMemo(() => layers.filter((l) => l.kind === 'three_d_tiles'), [layers]);

  return (
    <AppShell
      title="عارض التوأم الرقمي"
      subtitle="glTF Viewer + 3D Tiles Viewer"
      badge={twinId}
      actions={
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn btn-ghost" href="/twin">رجوع</Link>
          <button className="btn" onClick={loadLayers}>تحديث الطبقات</button>
        </div>
      }
    >
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 320 }}>
            <div className="muted">نوع العارض</div>
            <div className="row" style={{ gap: 8 }}>
              <button className={activeTab === 'gltf' ? 'btn' : 'btn btn-ghost'} onClick={() => setActiveTab('gltf')}>glTF</button>
              <button className={activeTab === 'tiles' ? 'btn' : 'btn btn-ghost'} onClick={() => setActiveTab('tiles')}>3D Tiles</button>
            </div>
            <div className="muted" style={{ marginTop: 10 }}>اختر طبقة</div>
            <select
              className="input"
              value={selectedLayerId}
              onChange={(e) => setSelectedLayerId(e.target.value)}
            >
              {(activeTab === 'gltf' ? gltfLayers : tileLayers).map((l) => (
                <option key={l.id} value={l.id}>{l.nameAr} ({l.id})</option>
              ))}
            </select>
            <div className="muted" style={{ marginTop: 10 }}>الرابط</div>
            <div className="card" style={{ wordBreak: 'break-all' }}>{selected?.uri || '—'}</div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 520 }}>
            {activeTab === 'gltf'
              ? <GltfViewer url={selected?.uri || ''} />
              : <TilesetViewer tilesetUrl={selected?.uri || ''} />
            }
          </div>
        </div>

        <div className="muted">
          لإظهار 3D Tiles داخل الويب، تأكد من تهيئة أصول Cesium (Workers/Widgets) داخل public/cesium.
        </div>
      </section>
    </AppShell>
  );
}
