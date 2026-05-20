import Link from 'next/link';

export const dynamic = 'force-dynamic';

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api';
}

export default async function PublicHeritageAssetPage({ params, searchParams }: { params: { slug: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  const slug = decodeURIComponent(params.slug);
  const q = typeof searchParams?.q === 'string' ? searchParams.q : '';

  const assetRes = await fetch(`${apiBase()}/public/heritage/assets/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  const assetJson = assetRes.ok ? await assetRes.json() : null;
  const asset = assetJson?.asset;

  if (!asset) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>غير موجود</h1>
        <div style={{ opacity: 0.7 }}>الأصل غير منشور أو الرابط غير صحيح.</div>
        <div style={{ marginTop: 12 }}>
          <Link href="/public/heritage">رجوع</Link>
        </div>
      </main>
    );
  }

  const manifestUrl = `${apiBase()}/public/heritage/assets/${encodeURIComponent(slug)}/manifest.json`;

  let searchResults: any = null;
  if (q) {
    const sRes = await fetch(`${apiBase()}/public/heritage/assets/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    searchResults = sRes.ok ? await sRes.json() : null;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>{asset.titleAr}</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            {asset.assetType} {asset.region ? `• ${asset.region}` : ''} {asset.city ? `• ${asset.city}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/public/heritage" style={{ textDecoration: 'none', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 10 }}>
            رجوع
          </Link>
          <a href={manifestUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '8px 10px', border: '1px solid #111', borderRadius: 10, color: '#111' }}>
            IIIF manifest
          </a>
        </div>
      </div>

      {asset.descriptionAr ? (
        <section style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 14, padding: 14, background: '#fff' }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>الوصف</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{asset.descriptionAr}</div>
        </section>
      ) : null}

      <section style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 14, padding: 14, background: '#fff' }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>بحث داخل النص</div>
        <form>
          <input name="q" defaultValue={q} placeholder="ابحث داخل التفريغ/النص…" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #111', background: '#111', color: '#fff' }}>بحث</button>
            <a href={manifestUrl} target="_blank" rel="noreferrer" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', textDecoration: 'none', color: '#111' }}>
              افتح في عارض IIIF
            </a>
          </div>
        </form>

        {q && searchResults ? (
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>نتائج بحث IIIF (AnnotationPage)</div>
            <pre style={{ overflowX: 'auto', background: '#0b0b0b', color: '#fff', padding: 12, borderRadius: 12 }}>{JSON.stringify(searchResults, null, 2)}</pre>
          </div>
        ) : null}
      </section>

      {Array.isArray(asset.protocols) && asset.protocols.length ? (
        <section style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 14, padding: 14, background: '#fff' }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>بروتوكولات الوصول</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {asset.protocols.map((p: any) => (
              <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>{p.nameAr}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>rulesJson</div>
                <pre style={{ overflowX: 'auto', marginTop: 8, background: '#fafafa', padding: 10, borderRadius: 10 }}>{JSON.stringify(p.rulesJson || {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
