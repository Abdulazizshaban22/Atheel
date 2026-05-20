'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  tilesetUrl: string;
};

export default function TilesetViewer({ tilesetUrl }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let viewer: any = null;

    async function boot() {
      setError(null);
      if (!ref.current) return;
      if (!tilesetUrl) {
        setError('اختر رابط tileset.json أولاً');
        return;
      }

      // Cesium requires a base URL for static assets (Workers, Widgets).
      // You can copy node_modules/cesium/Build/Cesium into public/cesium and set NEXT_PUBLIC_CESIUM_BASE_URL=/cesium
      (window as any).CESIUM_BASE_URL = (process.env.NEXT_PUBLIC_CESIUM_BASE_URL || '/cesium');

      const Cesium = await import('cesium');
      const container = ref.current;
      container.innerHTML = '';

      viewer = new (Cesium as any).Viewer(container, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: true,
        navigationHelpButton: false,
        sceneModePicker: true,
        selectionIndicator: true,
        infoBox: true,
      });

      try {
        const tileset = await (Cesium as any).Cesium3DTileset.fromUrl(tilesetUrl);
        viewer.scene.primitives.add(tileset);
        await viewer.zoomTo(tileset);
      } catch (e: any) {
        setError(`فشل تحميل 3D Tiles: ${e?.message || 'خطأ غير معروف'}`);
      }
    }

    boot().catch((e) => setError(e instanceof Error ? e.message : 'خطأ'));

    return () => {
      destroyed = true;
      if (viewer && !destroyed) {
        try { viewer.destroy(); } catch {}
      }
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [tilesetUrl]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      {error ? <div className="card" style={{ borderColor: '#ef4444' }}>{error}</div> : null}
      <div ref={ref} style={{ width: '100%', height: 620, borderRadius: 12, overflow: 'hidden', border: '1px solid #1f2937' }} />
      <div className="muted">يُتوقع أن يكون الرابط إلى tileset.json. للعرض الأفضل داخل المؤسسة، فعّل الاستضافة الداخلية للأصول.</div>
    </div>
  );
}
