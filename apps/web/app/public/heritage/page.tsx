import Link from 'next/link';

export const dynamic = 'force-dynamic';

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api';
}

export default async function PublicHeritagePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const q = typeof searchParams?.q === 'string' ? searchParams?.q : '';
  const region = typeof searchParams?.region === 'string' ? searchParams?.region : '';
  const assetType = typeof searchParams?.assetType === 'string' ? searchParams?.assetType : '';

  const url = `${apiBase()}/public/heritage/search?q=${encodeURIComponent(q || '')}&region=${encodeURIComponent(region || '')}&assetType=${encodeURIComponent(assetType || '')}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = res.ok ? await res.json() : { items: [], count: 0 };
  const items: any[] = json?.items || [];

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>بوابة التراث</h1>
        <div style={{ opacity: 0.7 }}>نشر عام عبر IIIF + بحث نصي</div>
      </div>

      <form style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <input name="q" defaultValue={q} placeholder="ابحث داخل التراث…" style={{ flex: 2, minWidth: 260, padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <input name="region" defaultValue={region} placeholder="المنطقة (اختياري)" style={{ flex: 1, minWidth: 180, padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <select name="assetType" defaultValue={assetType} style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 10, border: '1px solid #ddd' }}>
          <option value="">كل الأنواع</option>
          <option value="material">تراث مادي</option>
          <option value="immaterial">تراث غير مادي</option>
          <option value="architectural">تراث عمراني</option>
        </select>
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #111', background: '#111', color: '#fff' }}>بحث</button>
      </form>

      <section style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: '1px solid #eee', borderRadius: 14, padding: 14, background: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{it.titleAr}</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 10 }}>{it.region ? `المنطقة: ${it.region}` : '—'} {it.city ? `• ${it.city}` : ''}</div>
            {it.snippetAr ? (
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{it.snippetAr}</div>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>{(it.descriptionAr || '').slice(0, 160)}</div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/public/heritage/${encodeURIComponent(it.publicSlug)}`} style={{ textDecoration: 'none', padding: '8px 10px', borderRadius: 10, border: '1px solid #111', color: '#111' }}>
                فتح
              </Link>
              <a
                href={`${apiBase()}/public/heritage/assets/${encodeURIComponent(it.publicSlug)}/manifest.json`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', color: '#111' }}
              >
                IIIF manifest
              </a>
            </div>
          </div>
        ))}

        {!items.length ? (
          <div style={{ opacity: 0.7, padding: 16 }}>لا توجد نتائج منشورة حاليًا.</div>
        ) : null}
      </section>

      <div style={{ marginTop: 18, opacity: 0.65, fontSize: 12 }}>
        ملاحظة: البحث النصي يستخدم فهرسة PostgreSQL عند توفرها، ويعود إلى بحث بسيط عند عدم توفرها.
      </div>
    </main>
  );
}
