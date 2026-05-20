'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Project = {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  status: string;
  progressPercent: number;
  startDate?: string | null;
  endDate?: string | null;
};

type ContentItem = {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  languageCode: string;
  contentType: string;
  status: string;
  summary?: string | null;
};

type VisitorExperience = {
  id: string;
  projectId: string;
  titleAr: string;
  experienceType: string;
  durationMinutesDefault: number;
  publishStatus: string;
};

type TabKey = 'projects' | 'content' | 'experiences';

const defaultProject = {
  organizationId: 'org_demo_1',
  code: 'ATH-001',
  nameAr: 'برنامج ثقافي تجريبي',
  status: 'planning',
  progressPercent: 10,
  startDate: '2026-03-01',
  endDate: '2026-06-30',
};

const defaultContent = {
  organizationId: 'org_demo_1',
  projectId: 'prj_1',
  title: 'نص تعريفي للمسار التراثي',
  languageCode: 'ar',
  contentType: 'article',
  status: 'draft',
  summary: 'نسخة أولية قابلة للمراجعة',
};

const defaultExperience = {
  projectId: 'prj_1',
  titleAr: 'جولة ليلية ثقافية',
  experienceType: 'route',
  durationMinutesDefault: 60,
  publishStatus: 'draft',
};

export default function WorkbenchPage() {
  const [tab, setTab] = useState<TabKey>('projects');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [experiences, setExperiences] = useState<VisitorExperience[]>([]);
  const [simulation, setSimulation] = useState<any>(null);

  const [projectForm, setProjectForm] = useState(defaultProject);
  const [contentForm, setContentForm] = useState(defaultContent);
  const [experienceForm, setExperienceForm] = useState(defaultExperience);

  async function loadAll() {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    const [p, c, e] = await Promise.all([
      apiRequest<Project[]>('/projects'),
      apiRequest<ContentItem[]>('/content'),
      apiRequest<VisitorExperience[]>('/experiences'),
    ]);

    if (!p.ok || !c.ok || !e.ok) {
      setErrorMsg(`تعذر التحميل: ${p.error || c.error || e.error || 'خطأ غير معروف'}`);
      setLoading(false);
      return;
    }

    setProjects(p.data || []);
    setContentItems(c.data || []);
    setExperiences(e.data || []);
    setStatusMsg('تم تحميل البيانات بنجاح');
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest<Project>('/projects', { method: 'POST', body: projectForm });
    if (!res.ok || !res.data) return setErrorMsg(res.error || 'فشل إنشاء المشروع');
    setStatusMsg('تم إنشاء مشروع');
    setErrorMsg('');
    await loadAll();
  }

  async function createContent(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest<ContentItem>('/content', { method: 'POST', body: contentForm });
    if (!res.ok || !res.data) return setErrorMsg(res.error || 'فشل إنشاء المحتوى');
    setStatusMsg('تم إنشاء عنصر محتوى');
    setErrorMsg('');
    await loadAll();
  }

  async function createExperience(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest<VisitorExperience>('/experiences', { method: 'POST', body: experienceForm });
    if (!res.ok || !res.data) return setErrorMsg(res.error || 'فشل إنشاء التجربة');
    setStatusMsg('تم إنشاء تجربة');
    setErrorMsg('');
    await loadAll();
  }

  async function deleteRow(path: string) {
    const res = await apiRequest<{ deleted: boolean }>(path, { method: 'DELETE' });
    if (!res.ok) return setErrorMsg(res.error || 'فشل الحذف');
    setStatusMsg('تم الحذف');
    setErrorMsg('');
    await loadAll();
  }

  async function simulateExperience(id: string) {
    setErrorMsg('');
    setStatusMsg('');
    setSimulation(null);
    const res = await apiRequest<any>(`/experiences/${id}/simulate`, {
      method: 'POST',
      body: {
        durationMinutes: 60,
        stepSeconds: 5,
        arrivalsPerMinute: 6,
        shortestPathBias: 0.65,
      },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل تشغيل المحاكاة');
    setSimulation(res.data);
    setStatusMsg('تم تشغيل المحاكاة بنجاح');
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="badge">CRUD Workbench</div>
            <h1 style={{ margin: '8px 0 0' }}>لوحة CRUD التجريبية — أَثِيل</h1>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href="/login">صفحة الدخول</a>
            <button className="btn" onClick={loadAll} disabled={loading}>{loading ? 'جاري التحميل...' : 'تحديث البيانات'}</button>
          </div>
        </div>

        <div className="notice">
          <div><strong>التوثيق:</strong> عبر HttpOnly Cookies + CSRF تلقائي</div>
          <div className="muted">هذه اللوحة تدعم CRUD أساسي للمشاريع والمحتوى والتجارب لاختبار API وRBAC بسرعة.</div>
        </div>

        {statusMsg ? <div className="notice success">{statusMsg}</div> : null}
        {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

        <div className="row">
          <button className={`btn ${tab === 'projects' ? '' : 'btn-ghost'}`} onClick={() => setTab('projects')}>المشاريع</button>
          <button className={`btn ${tab === 'content' ? '' : 'btn-ghost'}`} onClick={() => setTab('content')}>المحتوى</button>
          <button className={`btn ${tab === 'experiences' ? '' : 'btn-ghost'}`} onClick={() => setTab('experiences')}>التجارب</button>
        </div>
      </section>

      {tab === 'projects' && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>إدارة المشاريع</h2>
          <form className="stack" onSubmit={createProject}>
            <div className="form-grid cols-3">
              <div><label>organizationId</label><input value={projectForm.organizationId} onChange={(e) => setProjectForm({ ...projectForm, organizationId: e.target.value })} /></div>
              <div><label>الكود</label><input value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} /></div>
              <div><label>اسم المشروع</label><input value={projectForm.nameAr} onChange={(e) => setProjectForm({ ...projectForm, nameAr: e.target.value })} /></div>
              <div><label>الحالة</label><select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}><option>draft</option><option>planning</option><option>in_progress</option><option>paused</option><option>completed</option><option>archived</option></select></div>
              <div><label>التقدم %</label><input type="number" value={projectForm.progressPercent} onChange={(e) => setProjectForm({ ...projectForm, progressPercent: Number(e.target.value) })} /></div>
              <div><label>بداية</label><input type="date" value={projectForm.startDate || ''} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} /></div>
            </div>
            <div className="row"><button className="btn" type="submit">إنشاء مشروع</button></div>
          </form>
          <table>
            <thead><tr><th>الكود</th><th>الاسم</th><th>الحالة</th><th>التقدم</th><th>إجراء</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.code}</td><td>{p.nameAr}</td><td>{p.status}</td><td>{p.progressPercent}%</td>
                  <td><button className="btn btn-danger" onClick={() => deleteRow(`/projects/${p.id}`)}>حذف</button></td>
                </tr>
              ))}
              {!projects.length && <tr><td colSpan={5}>لا توجد مشاريع</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'content' && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>إدارة المحتوى</h2>
          <form className="stack" onSubmit={createContent}>
            <div className="form-grid cols-3">
              <div><label>organizationId</label><input value={contentForm.organizationId} onChange={(e) => setContentForm({ ...contentForm, organizationId: e.target.value })} /></div>
              <div><label>projectId</label><input value={contentForm.projectId || ''} onChange={(e) => setContentForm({ ...contentForm, projectId: e.target.value })} /></div>
              <div><label>العنوان</label><input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} /></div>
              <div><label>اللغة</label><select value={contentForm.languageCode} onChange={(e) => setContentForm({ ...contentForm, languageCode: e.target.value })}><option>ar</option><option>en</option></select></div>
              <div><label>النوع</label><select value={contentForm.contentType} onChange={(e) => setContentForm({ ...contentForm, contentType: e.target.value })}><option>article</option><option>stop_text</option><option>audio_script</option><option>label</option><option>educational</option><option>campaign</option></select></div>
              <div><label>الحالة</label><select value={contentForm.status} onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}><option>draft</option><option>in_review</option><option>approved</option><option>published</option><option>archived</option></select></div>
            </div>
            <div className="kv"><label>الملخص</label><textarea value={contentForm.summary || ''} onChange={(e) => setContentForm({ ...contentForm, summary: e.target.value })} /></div>
            <div className="row"><button className="btn" type="submit">إنشاء محتوى</button></div>
          </form>
          <table>
            <thead><tr><th>العنوان</th><th>اللغة</th><th>النوع</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {contentItems.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td><td>{c.languageCode}</td><td>{c.contentType}</td><td>{c.status}</td>
                  <td><button className="btn btn-danger" onClick={() => deleteRow(`/content/${c.id}`)}>حذف</button></td>
                </tr>
              ))}
              {!contentItems.length && <tr><td colSpan={5}>لا يوجد محتوى</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'experiences' && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>إدارة التجارب</h2>
          <form className="stack" onSubmit={createExperience}>
            <div className="form-grid cols-3">
              <div><label>projectId</label><input value={experienceForm.projectId} onChange={(e) => setExperienceForm({ ...experienceForm, projectId: e.target.value })} /></div>
              <div><label>عنوان التجربة</label><input value={experienceForm.titleAr} onChange={(e) => setExperienceForm({ ...experienceForm, titleAr: e.target.value })} /></div>
              <div><label>النوع</label><select value={experienceForm.experienceType} onChange={(e) => setExperienceForm({ ...experienceForm, experienceType: e.target.value })}><option>museum</option><option>route</option><option>event</option><option>exhibition</option><option>food_culture</option></select></div>
              <div><label>المدة بالدقائق</label><input type="number" value={experienceForm.durationMinutesDefault} onChange={(e) => setExperienceForm({ ...experienceForm, durationMinutesDefault: Number(e.target.value) })} /></div>
              <div><label>حالة النشر</label><select value={experienceForm.publishStatus} onChange={(e) => setExperienceForm({ ...experienceForm, publishStatus: e.target.value })}><option>draft</option><option>published</option><option>archived</option></select></div>
            </div>
            <div className="row"><button className="btn" type="submit">إنشاء تجربة</button></div>
          </form>
          <table>
            <thead><tr><th>العنوان</th><th>النوع</th><th>المدة</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {experiences.map((x) => (
                <tr key={x.id}>
                  <td>{x.titleAr}</td><td>{x.experienceType}</td><td>{x.durationMinutesDefault}</td><td>{x.publishStatus}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn" onClick={() => simulateExperience(x.id)}>محاكاة</button>
                      <button className="btn btn-danger" onClick={() => deleteRow(`/experiences/${x.id}`)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!experiences.length && <tr><td colSpan={5}>لا توجد تجارب</td></tr>}
            </tbody>
          </table>

          {simulation ? (
            <div className="stack">
              <div style={{ fontWeight: 900 }}>نتيجة المحاكاة (Wave54)</div>
              <pre className="code">{JSON.stringify(simulation, null, 2)}</pre>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
