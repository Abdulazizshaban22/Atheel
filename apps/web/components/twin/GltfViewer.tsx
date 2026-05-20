'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  url: string;
  background?: string;
};

export default function GltfViewer({ url }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function boot() {
      setError(null);
      if (!mountRef.current) return;
      if (!url) {
        setError('اختر رابط glTF/GLB أولاً');
        return;
      }

      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

      const el = mountRef.current;
      el.innerHTML = '';
      const width = el.clientWidth || 800;
      const height = el.clientHeight || 520;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0f14);

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
      camera.position.set(2.5, 1.6, 3.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      el.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 1.1);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(3, 5, 2);
      scene.add(dir);

      // Grid for orientation
      const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1f2937);
      (grid.material as any).opacity = 0.35;
      (grid.material as any).transparent = true;
      scene.add(grid);

      const loader = new GLTFLoader();

      loader.load(
        url,
        (gltf: any) => {
          if (disposed) return;
          const root = gltf.scene;
          scene.add(root);

          // Fit camera to model
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3()).length();
          const center = box.getCenter(new THREE.Vector3());
          controls.target.copy(center);
          camera.near = Math.max(0.01, size / 100);
          camera.far = Math.max(1000, size * 10);
          camera.updateProjectionMatrix();
          camera.position.copy(center).add(new THREE.Vector3(size / 1.8, size / 3, size / 1.8));
        },
        undefined,
        (e: any) => {
          if (disposed) return;
          setError(`فشل تحميل glTF: ${e?.message || 'خطأ غير معروف'}`);
        },
      );

      let raf = 0;
      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth || width;
        const h = mountRef.current.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      const animate = () => {
        raf = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(raf);
        controls.dispose();
        renderer.dispose();
        el.innerHTML = '';
      };
    }

    boot().catch((e) => setError(e instanceof Error ? e.message : 'خطأ'));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [url]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      {error ? <div className="card" style={{ borderColor: '#ef4444' }}>{error}</div> : null}
      <div ref={mountRef} style={{ width: '100%', height: 560, borderRadius: 12, overflow: 'hidden', border: '1px solid #1f2937' }} />
      <div className="muted">تلميح: يدعم روابط glTF/GLB. يفضل استخدام روابط قابلة للتحميل المباشر (بدون صفحة وسيطة).</div>
    </div>
  );
}
