export default function ForbiddenPage({ searchParams }: any) {
  const next = String(searchParams?.next || '');
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>لا تملك صلاحية الوصول</h1>
      <p style={{ lineHeight: 1.8 }}>
        هذه الصفحة مخصصة لأدوار تشغيلية أعلى مثل مدير الجهة أو مدير المنصة.
        إذا كنت تعتقد أن هذا خطأ، تواصل مع مدير الجهة لرفع صلاحياتك.
      </p>
      {next ? (
        <p style={{ opacity: 0.8 }}>المسار المطلوب: {next}</p>
      ) : null}
      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <a className="btn" href="/workbench">العودة للواجهة</a>
        <a className="btn btn-ghost" href="/login">تسجيل دخول بحساب آخر</a>
      </div>
    </main>
  );
}
