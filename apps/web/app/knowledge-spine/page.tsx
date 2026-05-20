async function getJson(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function KnowledgeSpinePage() {
  const summary = await getJson('/knowledge-spine/summary');
  const taxonomies = await getJson('/knowledge-spine/taxonomies');

  return (
    <main className="space-y-8 p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Knowledge Spine</h1>
        <p className="text-sm text-neutral-500">نواة المعرفة متعددة المجالات داخل أثيل: القواميس، القواعد المعرفية، والتوجيه الأولي للبحث.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border p-4">
          <div className="text-sm text-neutral-500">Corpora</div>
          <div className="text-3xl font-semibold">{summary?.totals?.corpora ?? '—'}</div>
        </article>
        <article className="rounded-2xl border p-4">
          <div className="text-sm text-neutral-500">Documents</div>
          <div className="text-3xl font-semibold">{summary?.totals?.documents ?? '—'}</div>
        </article>
        <article className="rounded-2xl border p-4">
          <div className="text-sm text-neutral-500">Chunks</div>
          <div className="text-3xl font-semibold">{summary?.totals?.chunks ?? '—'}</div>
        </article>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Domain Coverage</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(summary?.coverage || []).map((item: any) => (
            <article key={item.domain} className="rounded-2xl border p-4 space-y-2">
              <div className="font-semibold">{item.titleAr}</div>
              <div className="text-sm text-neutral-500">{item.domain}</div>
              <div className="text-sm">Corpora: {item.corpora}</div>
              <div className="text-sm">Docs: {item.docs}</div>
              <div className="text-sm">Chunks: {item.chunks}</div>
              <div className="text-xs text-neutral-400">Taxonomy v{item.taxonomyVersion}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Taxonomies</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(taxonomies?.items || []).map((item: any) => (
            <article key={item.domain} className="rounded-2xl border p-4 space-y-3">
              <div>
                <div className="font-semibold">{item.titleAr}</div>
                <div className="text-xs text-neutral-500">{item.domain}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Subdomains</div>
                <ul className="list-disc ps-5 text-sm text-neutral-600">
                  {item.subdomains.map((sub: string) => <li key={sub}>{sub}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
