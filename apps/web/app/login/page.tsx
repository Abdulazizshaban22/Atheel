'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest, getApiBase } from '../../lib/api';
import { clearSession, persistSession } from '../../lib/session';

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn?: string;
  user: { id: string; email: string; name: string; roles: string[] };
};

export default function LoginPage() {
  const allowPrefill = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_PREFILL === 'true';
  const [email, setEmail] = useState(allowPrefill ? 'admin@atheel.sa' : '');
    const [password, setPassword] = useState(allowPrefill ? 'Admin@1234' : '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [meJson, setMeJson] = useState<string>('');

  useEffect(() => {
    // If cookies already exist, /auth/me will succeed.
    fetchMe().catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setMeJson('');

    const res = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (!res.ok || !res.data) {
      setError(res.error || 'فشل تسجيل الدخول');
      setLoading(false);
      return;
    }

    // Wave36: tokens are HttpOnly cookies (not stored in localStorage)
    persistSession({ user: { sub: res.data.user.id, id: res.data.user.id, email: res.data.user.email, name: res.data.user.name, roles: res.data.user.roles } });
    setMessage(`تم تسجيل الدخول بنجاح للمستخدم ${res.data.user.name}`);
    setLoading(false);
  }

  async function fetchMe() {
    setError('');
    setMessage('');
    const res = await apiRequest<{ user: unknown }>('/auth/me', {
      method: 'GET',
    });
    if (!res.ok || !res.data) {
      setError(res.error || 'فشل قراءة بيانات المستخدم');
      return;
    }
    setMeJson(JSON.stringify(res.data, null, 2));
    setMessage('تم جلب بيانات المستخدم الحالي');
  }

  async function rotateRefresh() {
    const res = await apiRequest<LoginResponse>('/auth/refresh', { method: 'POST', body: {} });
    if (!res.ok || !res.data) return setError(res.error || 'فشل refresh');
    setMessage('تم تدوير الجلسة بنجاح (Refresh Rotation)');
    setError('');
    await fetchMe();
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST', body: {} });
    clearSession();
    clearLocal();
    setMessage('تم تسجيل الخروج');
  }

  function clearLocal() {
    clearSession();
    setMeJson('');
    setError('');
  }

  return (
    <main className="container">
      <div className="grid grid-2">
        <section className="card stack">
          <div className="badge">MVP Auth / RBAC / Refresh</div>
          <h1 style={{ margin: 0 }}>تسجيل الدخول — أَثِيل v0.3</h1>
          <p className="muted" style={{ margin: 0 }}>
            شاشة تشغيلية لتجربة Login + Refresh + Logout وربطها مباشرة مع API.
          </p>

          <form className="stack" onSubmit={onSubmit}>
            <div className="kv">
              <label>البريد الإلكتروني</label>
              <input value={email} onChange={(e: { target: { value: string } }) => setEmail(e.target.value)} placeholder="admin@atheel.sa" />
            </div>
            <div className="kv">
              <label>كلمة المرور</label>
              <input type="password" value={password} onChange={(e: { target: { value: string } }) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="row">
              <button className="btn" type="submit" disabled={loading}>{loading ? 'جاري الدخول...' : 'دخول'}</button>
              <button className="btn btn-ghost" type="button" onClick={fetchMe}>اختبار /auth/me</button>
              <button className="btn btn-secondary" type="button" onClick={rotateRefresh}>Refresh</button>
              <button className="btn btn-danger" type="button" onClick={logout}>Logout</button>
            </div>
          </form>

          <div className="row">
            <a className="btn btn-ghost" href="/workbench">Workbench</a>
            <a className="btn btn-ghost" href="/users">Users</a>
            <a className="btn btn-ghost" href="/approvals">Approvals</a>
            <a className="btn btn-ghost" href="/attachments">Attachments</a>
          </div>

          {message ? <div className="notice success">{message}</div> : null}
          {error ? <div className="notice error">{error}</div> : null}
        </section>

        <section className="card stack">
          <h3 style={{ margin: 0 }}>حالة الجلسة</h3>
          <div className="notice">
            <div><strong>API Base:</strong> {getApiBase()}</div>
            <div><strong>الجلسة:</strong> Cookies HttpOnly + CSRF (لا يتم تخزين التوكن في المتصفح)</div>
          </div>

          <div>
            <h4 style={{ marginBottom: 8 }}>نتيجة /auth/me</h4>
            <pre className="code">{meJson || 'اضغط اختبار /auth/me بعد تسجيل الدخول'}</pre>
          </div>

          <div className="notice">
            بيانات الاختبار الافتراضية: admin@atheel.sa / Admin@1234 — editor@atheel.sa / Editor@1234 — pm@atheel.sa / Pm@1234
          </div>
        </section>
      </div>
    </main>
  );
}
