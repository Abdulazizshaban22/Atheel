import { ReactNode } from 'react';

/**
 * غلاف بسيط للصفحات العامة (بدون جلسة/تنقّل داخلي)
 * مخصص لصفحات التحقق الموجهة لجهات الاستلام.
 */
export function PublicShell(props: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 6 }}>
            {props.badge ? <div className="badge">{props.badge}</div> : null}
            <h1 style={{ margin: 0 }}>{props.title}</h1>
            {props.subtitle ? (
              <p className="muted" style={{ margin: 0 }}>
                {props.subtitle}
              </p>
            ) : null}
          </div>
          <a className="btn btn-ghost" href="/login">
            تسجيل الدخول
          </a>
        </div>

        <div className="notice">
          هذه صفحة تحقق عامة لجهات الاستلام. لا تتطلب تسجيل دخول. استخدمها للتحقق من سلامة حزمة الاعتماد عبر رفع ملف ZIP.
        </div>
      </section>
      {props.children}
    </main>
  );
}
