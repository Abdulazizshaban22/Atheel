'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Provider = {
  id: string;
  organizationId?: string;
  name: string;
  kind: 'mock' | 'vllm_openai_compatible';
  baseUrl?: string;
  modelName?: string;
  isActive: boolean;
};

export default function AiRuntimePage() {
  // Auth via HttpOnly cookies (no localStorage token)
  const [health, setHealth] = useState<any>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ragResult, setRagResult] = useState<any>(null);
  const [ingestResult, setIngestResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('ما هو تعريف أثيل وما الذي تديره؟');
  const [providerForm, setProviderForm] = useState({
    organizationId: 'org_demo_1',
    name: 'vLLM Local',
    kind: 'vllm_openai_compatible',
    baseUrl: 'http://localhost:8000',
    modelName: 'Qwen/Qwen2.5-7B-Instruct'});

  const [ingestForm, setIngestForm] = useState({
    organizationId: 'org_demo_1',
    projectId: 'prj_1',
    title: 'هوية التجربة الثقافية',
    tags: 'أثيل,ثقافة,هوية',
    text: 'أثيل يعمل كمنصة تشغيل ثقافي تربط بين إدارة المشاريع والمحتوى والتجارب والزوار والموافقات والتحليلات والحوكمة. يمكن استخدام الذكاء الاصطناعي لصناعة مسودات محتوى، تلخيص المعرفة، وبناء أفكار ثقافية قابلة للتنفيذ.'});

  async function loadAll() {
    setError('');
    const [h, p] = await Promise.all([
      apiRequest<any>('/ai/runtime/health'),
      apiRequest<any>('/ai/providers?organizationId=org_demo_1'),
    ]);
    if (!h.ok) setError(h.error || 'تعذر قراءة صحة الذكاء الاصطناعي');
    if (!p.ok) setError((prev) => prev || p.error || 'تعذر قراءة المزودات');
    setHealth(h.data || null);
    setProviders(p.data?.items || []);
  }

  useEffect(() => { void loadAll(); }, []);

  async function submitProvider(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest<any>('/ai/providers', {
      method: 'POST',
      body: {
        ...providerForm,
        isActive: true,
        kind: providerForm.kind}});
    if (!res.ok) { setError(res.error || 'فشل حفظ المزود'); return; }
    await loadAll();
  }

  async function submitIngest(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest<any>('/ai/knowledge/ingest', {
      method: 'POST',
      body: {
        organizationId: ingestForm.organizationId,
        projectId: ingestForm.projectId,
        title: ingestForm.title,
        sourceType: 'manual',
        tags: ingestForm.tags.split(',').map((x) => x.trim()).filter(Boolean),
        languageCode: 'ar',
        text: ingestForm.text}});
    if (!res.ok) { setError(res.error || 'فشل إدخال المعرفة'); return; }
    setIngestResult(res.data);
  }

  async function runRag(synthesize: boolean) {
    const res = await apiRequest<any>('/ai/rag/query', {
      method: 'POST',
      body: {
        query,
        organizationId: 'org_demo_1',
        projectId: 'prj_1',
        topK: 5,
        synthesize,
        outputLanguage: 'ar',
        mode: 'brief'}});
    if (!res.ok) { setError(res.error || 'فشل الاسترجاع'); return; }
    setRagResult(res.data);
  }

  return (
    <AppShell
      title="طبقة الذكاء الاصطناعي"
      subtitle="LLM + RAG + Agent foundation داخل نفس المونوريبو مع دعم vLLM ومحاكاة محلية"
      badge="AI Runtime"
      actions={<button className="btn btn-ghost" onClick={loadAll}>تحديث الحالة</button>}
    >
      {error ? <div className="notice error">{error}</div> : null}

      <section className="grid grid-3">
        <div className="card stack"><h3 style={{ margin: 0 }}>المزودات</h3><div>{providers.length}</div></div>
        <div className="card stack"><h3 style={{ margin: 0 }}>المعرفة</h3><div>{health?.runtime?.knowledgeDocsCount ?? '-' } مستند / {health?.runtime?.knowledgeChunksCount ?? '-' } مقطع</div></div>
        <div className="card stack"><h3 style={{ margin: 0 }}>المزود النشط</h3><div>{health?.runtime?.activeProvider?.name || '-'}</div><small>{health?.runtime?.activeProvider?.kind || '-'}</small></div>
      </section>

      <section className="grid grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>تسجيل مزود vLLM</h2>
          <form className="stack" onSubmit={submitProvider}>
            <div className="form-grid cols-2">
              <div><label>organizationId</label><input value={providerForm.organizationId} onChange={(e) => setProviderForm({ ...providerForm, organizationId: e.target.value })} /></div>
              <div><label>name</label><input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} /></div>
              <div><label>kind</label>
                <select value={providerForm.kind} onChange={(e) => setProviderForm({ ...providerForm, kind: e.target.value as 'mock' | 'vllm_openai_compatible' })}>
                  <option value="vllm_openai_compatible">vllm_openai_compatible</option>
                  <option value="mock">mock</option>
                </select>
              </div>
              <div><label>modelName</label><input value={providerForm.modelName} onChange={(e) => setProviderForm({ ...providerForm, modelName: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>baseUrl</label><input value={providerForm.baseUrl} onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })} /></div>
            </div>
            <button className="btn" type="submit">حفظ وتفعيل</button>
          </form>

          <details>
            <summary>قائمة المزودات الحالية</summary>
            <pre className="code">{JSON.stringify(providers, null, 2)}</pre>
          </details>
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>إدخال معرفة</h2>
          <form className="stack" onSubmit={submitIngest}>
            <div className="form-grid cols-2">
              <div><label>organizationId</label><input value={ingestForm.organizationId} onChange={(e) => setIngestForm({ ...ingestForm, organizationId: e.target.value })} /></div>
              <div><label>projectId</label><input value={ingestForm.projectId} onChange={(e) => setIngestForm({ ...ingestForm, projectId: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>title</label><input value={ingestForm.title} onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>tags (comma separated)</label><input value={ingestForm.tags} onChange={(e) => setIngestForm({ ...ingestForm, tags: e.target.value })} /></div>
            </div>
            <div><label>text</label><textarea rows={7} value={ingestForm.text} onChange={(e) => setIngestForm({ ...ingestForm, text: e.target.value })} /></div>
            <button className="btn" type="submit">تخزين المستند وتقطيعه</button>
          </form>
          {ingestResult ? <pre className="code">{JSON.stringify(ingestResult, null, 2)}</pre> : null}
        </section>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>RAG Query</h2>
        <div className="stack">
          <label>السؤال</label>
          <textarea rows={3} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => runRag(false)}>استرجاع فقط</button>
          <button className="btn" onClick={() => runRag(true)}>استرجاع + توليد</button>
        </div>
        {ragResult ? <pre className="code">{JSON.stringify(ragResult, null, 2)}</pre> : null}
      </section>
    </AppShell>
  );
}
