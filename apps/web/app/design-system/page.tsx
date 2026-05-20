import { AppShell } from '../../components/AppShell';

const TOKENS = [
  { name: 'card', meaning: 'حاوية أساسية للمحتوى واللوحات' },
  { name: 'badge', meaning: 'إشارة حالة سريعة' },
  { name: 'btn / btn-secondary / btn-ghost', meaning: 'تدرج الأفعال الأساسية والثانوية والتنقلية' },
  { name: 'notice', meaning: 'معلومة أو تنبيه أو حالة توجيهية' },
  { name: 'grid-*', meaning: 'شبكة العرض الموحدة' },
  { name: 'pre.code', meaning: 'عرض التشخيص والحمولات والنواتج' },
];

export default function DesignSystemPage() {
  return (
    <AppShell title="Design System" subtitle="طبقة عرض موحدة لمرحلة الإقفال بدل تكرار الأنماط في كل صفحة" badge="UI Foundation">
      <section className="grid grid-2">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>العناصر الأساسية</h3>
          <ul className="list">
            {TOKENS.map((token) => (
              <li key={token.name}>
                <strong>{token.name}</strong><br />
                <small>{token.meaning}</small>
              </li>
            ))}
          </ul>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>أمثلة العرض</h3>
          <div className="row">
            <span className="badge">Default</span>
            <span className="badge success">Success</span>
            <span className="badge warning">Warning</span>
            <span className="badge danger">Danger</span>
          </div>
          <div className="row">
            <button className="btn">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-ghost">Ghost</button>
          </div>
          <div className="notice">هذه الصفحة ليست showcase جماليًا فقط؛ بل مرجع توحيد بصري سريع لفريق التطوير خلال مرحلة closure.</div>
          <pre className="code">{`<div className="card stack">...</div>`}</pre>
        </div>
      </section>
    </AppShell>
  );
}
