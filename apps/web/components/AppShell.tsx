'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser } from '../lib/session';
import { PLATFORM_NAVIGATION } from '../lib/navigation';
import { ShellNavigation } from './ShellNavigation';

export function AppShell(props: {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useMemo(() => getStoredUser(), []);

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div className="stack" style={{ gap: 6 }}>
            {props.badge ? <div className="badge">{props.badge}</div> : null}
            <h1 style={{ margin: 0 }}>{props.title}</h1>
            {props.subtitle ? <p className="muted" style={{ margin: 0 }}>{props.subtitle}</p> : null}
          </div>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {props.actions}
            <a className="btn btn-ghost" href="/login">الجلسة</a>
            <button className="btn btn-danger" onClick={logout}>خروج</button>
          </div>
        </div>

        <div className="notice">
          المستخدم: {user?.name || user?.email || 'غير معروف'} | الأدوار: {(user?.roles || []).join('، ') || '—'}
        </div>
      </section>

      <ShellNavigation pathname={pathname} sections={PLATFORM_NAVIGATION} />

      {props.children}
    </main>
  );
}
