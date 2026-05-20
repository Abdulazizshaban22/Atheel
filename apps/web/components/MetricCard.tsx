export function MetricCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div style={{ opacity: 0.8, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}
