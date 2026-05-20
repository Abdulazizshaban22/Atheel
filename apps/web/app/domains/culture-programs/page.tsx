
async function getData() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  try {
    const [summaryRes, dashboardRes] = await Promise.all([
      fetch(`${base}/domains/culture-programs/summary`, { cache: 'no-store' }),
      fetch(`${base}/domains/culture-programs/dashboard`, { cache: 'no-store' }),
    ]);
    const [summary, dashboard] = await Promise.all([summaryRes.json(), dashboardRes.json()]);
    return { summary, dashboard };
  } catch {
    return { summary: null, dashboard: null };
  }
}

export default async function CultureProgramsDomainPage() {
  const data = await getData();
  return (
    <main className="stack p-6">
      <section className="card stack"><h1>Atheel Culture Programs</h1><p>ذكاء قطاعي للبرامج الثقافية مرتبط بالأثر والشركاء والإرث.</p></section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card stack"><h3>Summary</h3><pre>{JSON.stringify(data.summary, null, 2)}</pre></div>
        <div className="card stack"><h3>Dashboard</h3><pre>{JSON.stringify(data.dashboard, null, 2)}</pre></div>
      </section>
    </main>
  );
}
