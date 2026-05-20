'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { AppShell } from '../../components/AppShell';

type Project = {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  status: string;
  progressPercent: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
};

type ProjectForm = {
  organizationId: string;
  code: string;
  nameAr: string;
  status: string;
  progressPercent: number;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: ProjectForm = {
  organizationId: 'org_demo_1',
  code: 'PRJ-001',
  nameAr: 'مشروع ثقافي تجريبي',
  status: 'draft',
  progressPercent: 0,
  startDate: '',
  endDate: ''};

export default function ProjectsPage() {
  // Auth via HttpOnly cookies (no localStorage token)
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState({ q: '', status: '', organizationId: 'org_demo_1' });
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.status) params.set('status', query.status);
    if (query.organizationId) params.set('organizationId', query.organizationId);
    const res = await apiRequest<Project[]>(`/projects?${params.toString()}`);
    if (!res.ok) {
      setErr(res.error || 'تعذر تحميل المشاريع');
      setLoading(false);
      return;
    }
    setRows(res.data || []);
    setErr('');
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    const body = {
      ...form,
      progressPercent: Number(form.progressPercent || 0),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined};
    const res = editingId
      ? await apiRequest<Project>(`/projects/${editingId}`, { method: 'PATCH', body })
      : await apiRequest<Project>('/projects', { method: 'POST', body });

    if (!res.ok) return setErr(res.error || 'فشل حفظ المشروع');
    setMsg(editingId ? 'تم تحديث المشروع' : 'تم إنشاء المشروع');
    setEditingId(null);
    setForm({ ...EMPTY_FORM, code: `PRJ-${String((rows.length || 0) + 1).padStart(3, '0')}` });
    await load();
  }

  function editRow(row: Project) {
    setEditingId(row.id);
    setForm({
      organizationId: row.organizationId,
      code: row.code,
      nameAr: row.nameAr,
      status: row.status,
      progressPercent: Number(row.progressPercent || 0),
      startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
      endDate: row.endDate ? String(row.endDate).slice(0, 10) : ''});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function removeRow(row: Project) {
    if (!confirm(`حذف المشروع ${row.nameAr}؟`)) return;
    const res = await apiRequest(`/projects/${row.id}`, { method: 'DELETE'});
    if (!res.ok) return setErr(res.error || 'فشل الحذف');
    setMsg('تم حذف المشروع');
    if (editingId === row.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    await load();
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => ['active', 'in_progress'].includes(r.status)).length;
    const delayed = rows.filter((r) => r.status === 'delayed').length;
    const avgProgress = total ? Math.round(rows.reduce((s, r) => s + Number(r.progressPercent || 0), 0) / total) : 0;
    return { total, active, delayed, avgProgress };
  }, [rows]);

  return (
    <AppShell title="إدارة المشاريع الثقافية" subtitle="CRUD مستقل للمشاريع مع فلاتر وبطاقات مؤشرات وربط صفحة التفاصيل" badge="Projects CRUD v0.4">
      <section className="grid grid-4">
        <div className="card"><div className="muted">إجمالي المشاريع</div><h2 style={{ margin: '8px 0 0' }}>{stats.total}</h2></div>
        <div className="card"><div className="muted">نشطة</div><h2 style={{ margin: '8px 0 0' }}>{stats.active}</h2></div>
        <div className="card"><div className="muted">متأخرة</div><h2 style={{ margin: '8px 0 0' }}>{stats.delayed}</h2></div>
        <div className="card"><div className="muted">متوسط التقدم</div><h2 style={{ margin: '8px 0 0' }}>{stats.avgProgress}%</h2></div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{editingId ? 'تعديل المشروع' : 'إنشاء مشروع جديد'}</h2>
          {editingId ? <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>إلغاء التعديل</button> : null}
        </div>
        {msg ? <div className="notice success">{msg}</div> : null}
        {err ? <div className="notice error">{err}</div> : null}

        <form className="form-grid cols-3" onSubmit={submit}>
          <div><label>organizationId</label><input value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} /></div>
          <div><label>رمز المشروع</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label>اسم المشروع</label><input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
          <div>
            <label>الحالة</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="in_progress">in_progress</option>
              <option value="on_hold">on_hold</option>
              <option value="delayed">delayed</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div><label>التقدم %</label><input type="number" min={0} max={100} value={form.progressPercent} onChange={(e) => setForm({ ...form, progressPercent: Number(e.target.value) })} /></div>
          <div><label>تاريخ البداية</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><label>تاريخ النهاية</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="row" style={{ alignItems: 'end' }}><button className="btn" type="submit">{editingId ? 'حفظ التعديلات' : 'إنشاء'}</button></div>
        </form>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>قائمة المشاريع</h2>
          <div className="row">
            <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'جاري التحميل...' : 'تحديث'}</button>
          </div>
        </div>
        <div className="form-grid cols-3">
          <div><label>بحث</label><input value={query.q} onChange={(e) => setQuery({ ...query, q: e.target.value })} placeholder="اسم أو كود" /></div>
          <div><label>الحالة</label><input value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value })} placeholder="active / draft ..." /></div>
          <div><label>organizationId</label><input value={query.organizationId} onChange={(e) => setQuery({ ...query, organizationId: e.target.value })} /></div>
        </div>
        <div className="row"><button className="btn" onClick={load}>تطبيق الفلاتر</button></div>

        <table>
          <thead>
            <tr>
              <th>الاسم</th><th>الكود</th><th>الحالة</th><th>التقدم</th><th>التواريخ</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div>{row.nameAr}</div>
                  <small>{row.id}</small>
                </td>
                <td>{row.code}</td>
                <td>{row.status}</td>
                <td>{row.progressPercent}%</td>
                <td><small>{row.startDate ? String(row.startDate).slice(0, 10) : '-'} → {row.endDate ? String(row.endDate).slice(0, 10) : '-'}</small></td>
                <td>
                  <div className="row">
                    <a className="btn btn-ghost" href={`/projects/${row.id}`}>تفاصيل</a>
                    <button className="btn btn-secondary" onClick={() => editRow(row)}>تعديل</button>
                    <button className="btn btn-danger" onClick={() => removeRow(row)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6}>لا توجد مشاريع</td></tr> : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
