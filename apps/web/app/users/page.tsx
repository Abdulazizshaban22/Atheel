'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type UserRow = { id: string; email: string; displayName: string; isActive: boolean; roles: string[]; orgIds?: string[] };

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ email: 'new.user@atheel.sa', displayName: 'مستخدم جديد', password: 'ChangeMe@123', roles: 'viewer', orgIds: 'org_demo_1' });
  // Auth via HttpOnly cookies (no localStorage token)

  async function load() {
    const [u, c] = await Promise.all([
      apiRequest<UserRow[]>('/users'),
      apiRequest<{ roles: string[] }>('/users/roles/catalog'),
    ]);
    if (!u.ok) return setErr(u.error || 'تعذر تحميل المستخدمين');
    setRows(u.data || []);
    setRolesCatalog(c.data?.roles || []);
    setErr('');
  }

  useEffect(() => { if (token) void load(); }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest('/users', {
      method: 'POST', body: {
        email: form.email,
        displayName: form.displayName,
        password: form.password,
        roles: form.roles.split(',').map((x) => x.trim()).filter(Boolean),
        orgIds: form.orgIds.split(',').map((x) => x.trim()).filter(Boolean)}
    });
    if (!res.ok) return setErr(res.error || 'فشل إنشاء المستخدم');
    setMsg('تم إنشاء المستخدم'); setErr(''); await load();
  }

  async function toggleActive(u: UserRow) {
    const res = await apiRequest(`/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } });
    if (!res.ok) return setErr(res.error || 'فشل تحديث المستخدم');
    setMsg('تم تحديث حالة المستخدم'); setErr(''); await load();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="badge">Users / Roles Management</div>
            <h1 style={{ margin: '8px 0 0' }}>إدارة المستخدمين والأدوار — أَثِيل</h1>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href="/login">Login</a>
            <a className="btn btn-ghost" href="/workbench">Workbench</a>
            <button className="btn" onClick={load}>تحديث</button>
          </div>
        </div>
        {msg ? <div className="notice success">{msg}</div> : null}
        {err ? <div className="notice error">{err}</div> : null}
        <div className="notice">يتطلب دور org_admin أو super_admin. أدوار النظام: {rolesCatalog.join('، ') || '...'}.</div>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>إنشاء مستخدم</h2>
        <form className="form-grid cols-3" onSubmit={createUser}>
          <div><label>البريد الإلكتروني</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>الاسم</label><input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><label>كلمة مرور أولية</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><label>roles (comma)</label><input value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} /></div>
          <div><label>orgIds (comma)</label><input value={form.orgIds} onChange={(e) => setForm({ ...form, orgIds: e.target.value })} /></div>
          <div className="row" style={{ alignItems: 'end' }}><button className="btn" type="submit">إنشاء</button></div>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>قائمة المستخدمين</h2>
        <table>
          <thead><tr><th>الاسم</th><th>البريد</th><th>الأدوار</th><th>الجهات</th><th>نشط</th><th>إجراء</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.email}</td>
                <td>{(u.roles || []).join('، ')}</td>
                <td>{(u.orgIds || []).join('، ')}</td>
                <td>{u.isActive ? 'نعم' : 'لا'}</td>
                <td><button className="btn btn-ghost" onClick={() => toggleActive(u)}>{u.isActive ? 'تعطيل' : 'تفعيل'}</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}>لا توجد بيانات</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
