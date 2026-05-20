import { AppShell } from '../../../components/AppShell';

async function getJson(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Page() {
  const overview = await getJson('/memory/domains/overview');
  return (
    <AppShell title="AI Memory" subtitle="حلقة الذاكرة المؤسسية والأنماط المعاد استخدامها عبر المجالات." badge="Memory">
      <section className="card stack">
        <h3>Domain Memory Overview</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Outcomes</th>
                <th>Patterns</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.items || []).map((item: any) => (
                <tr key={item.domain}>
                  <td>{item.domain}</td>
                  <td>{item.outcomes}</td>
                  <td>{item.patterns}</td>
                  <td>{item.feedbackItems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
