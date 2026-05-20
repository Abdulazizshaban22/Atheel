'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Summary = {
  total: number;
  byDomain: Record<string, number>;
  byIntent: Record<string, number>;
  byTrigger: Record<string, number>;
  byComplexity: Record<string, number>;
  persisted?: { instances: number; runs: number; packs: number };
};

type Template = {
  id: string;
  code: string;
  nameAr: string;
  summaryAr: string;
  domain: string;
  intent: string;
  trigger: string;
  complexity: string;
  audience: string;
  channel: string;
  tags: string[];
  aiProfile: { ragEnabled: boolean; agentMode: string; preferredModelClass: string; qualityGate: string };
  steps: Array<{ id: string; nameAr: string; actor: string; estimatedMinutes: number }>;
};

export default function WorkflowsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Template[]>([]);
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState('');
  const [selected, setSelected] = useState<Template | null>(null);
  const [sim, setSim] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const domains = useMemo(() => Object.keys(summary?.byDomain || {}), [summary]);

  async function load() {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
apiRequest<Summary>('/workflows/catalog/summary').then((r) => r.data as Summary),
        apiRequest<{ items: Template[] }>('/workflows/catalog?limit=60' + (q ? `&q=${encodeURIComponent(q)}` : '') + (domain ? `&domain=${encodeURIComponent(domain)}` : ''), { method: 'GET' }).then((r) => (r.data || { items: [] })),
      ]);
      setSummary(s);
      setItems(list.items || []);
      if (!selected && list.items?.length) setSelected(list.items[0]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 350);
    return () => clearTimeout(t);
  }, [q, domain]);

  async function simulate(templateId: string) {
    setSimulating(true);
    setSim(null);
    try {
      const { data: res } = await apiRequest<any>('/workflows/runs/simulate', {
        method: 'POST',
        body: {
          templateId,
          hasKnowledge: true,
          hasApprovalActor: true,
          priority: 'normal',
          persistRun: false,
        },
      });
      setSim(res);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <AppShell title="مكتبة سير العمل" subtitle="أكثر من 500 Workflow مع Runtime + Queue + Realtime" badge="Wave07">
      <div className='space-y-4'>
        <div className='card'>
          <h1 style={{ margin: 0, fontSize: 22 }}>مكتبة سير العمل الثقافي</h1>
          <p className='muted' style={{ marginTop: 8 }}>قوالب تشغيل ثقافية جاهزة ومدعومة بمسارات LLM وRAG وAgent</p>
        </div>
        <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
        <aside className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='mb-3'>
            <h2 className='text-lg font-semibold text-slate-900'>أكثر من 500 Workflow</h2>
            <p className='mt-1 text-sm text-slate-600'>قوالب تشغيل ثقافية جاهزة ومدعومة بمسارات LLM وRAG وAgent.</p>
          </div>

          <div className='grid gap-3'>
            <div className='rounded-lg bg-slate-50 p-3'>
              <div className='text-xs text-slate-500'>إجمالي القوالب</div>
              <div className='text-2xl font-bold text-slate-900'>{summary?.total ?? '...'}</div>
            </div>
            <div className='rounded-lg bg-slate-50 p-3'>
              <div className='text-xs text-slate-500'>محفوظ محليًا</div>
              <div className='text-sm text-slate-700'>
                Instances {summary?.persisted?.instances ?? 0} • Runs {summary?.persisted?.runs ?? 0} • Packs {summary?.persisted?.packs ?? 0}
              </div>
            </div>

            <input
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
              placeholder='بحث في القوالب'
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              <option value=''>كل المجالات</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d} ({summary?.byDomain?.[d] ?? 0})</option>
              ))}
            </select>

            <button
              className='rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50'
              onClick={() => selected && simulate(selected.id)}
              disabled={!selected || simulating}
            >
              {simulating ? 'جاري المحاكاة...' : 'محاكاة التشغيل'}
            </button>
          </div>

          <div className='mt-4 max-h-[55vh] space-y-2 overflow-auto pr-1'>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={'w-full rounded-lg border p-3 text-right transition ' + (selected?.id === item.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300')}
              >
                <div className='text-xs text-slate-500'>{item.id} • {item.complexity}</div>
                <div className='mt-1 text-sm font-semibold text-slate-900'>{item.nameAr}</div>
                <div className='mt-1 text-xs text-slate-600 line-clamp-2'>{item.summaryAr}</div>
              </button>
            ))}
            {!loading && items.length === 0 && (
              <div className='rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500'>لا توجد نتائج</div>
            )}
          </div>
        </aside>

        <section className='space-y-4'>
          {selected ? (
            <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <div className='text-xs text-slate-500'>{selected.code}</div>
                  <h2 className='mt-1 text-xl font-semibold text-slate-900'>{selected.nameAr}</h2>
                  <p className='mt-2 text-sm text-slate-600'>{selected.summaryAr}</p>
                </div>
                <div className='text-xs text-slate-600'>
                  <div>القناة: <span className='font-medium text-slate-900'>{selected.channel}</span></div>
                  <div>الجمهور: <span className='font-medium text-slate-900'>{selected.audience}</span></div>
                  <div>AI: <span className='font-medium text-slate-900'>{selected.aiProfile?.agentMode}</span> • {selected.aiProfile?.preferredModelClass}</div>
                </div>
              </div>
              <div className='mt-4 flex flex-wrap gap-2 items-center justify-between'>
                <div className='flex flex-wrap gap-2'>
                  {selected.tags?.slice(0, 8).map((tag) => (
                    <span key={tag} className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700'>{tag}</span>
                  ))}
                </div>
                <Link
                  href={`/workflows/designer/${selected.id}`}
                  className='rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                >
                  فتح مصمم المسار
                </Link>
              </div>

              <div className='mt-5'>
                <h3 className='text-sm font-semibold text-slate-900'>خطوات التنفيذ</h3>
                <div className='mt-3 grid gap-2'>
                  {selected.steps?.map((step, idx) => (
                    <div key={step.id} className='rounded-lg border border-slate-200 p-3'>
                      <div className='flex items-center justify-between gap-2 text-sm'>
                        <div className='font-medium text-slate-900'>{idx + 1}. {step.nameAr}</div>
                        <div className='text-xs text-slate-500'>{step.actor} • {step.estimatedMinutes} د</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-500'>اختر Workflow من القائمة</div>
          )}

          <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h3 className='text-sm font-semibold text-slate-900'>نتيجة محاكاة التشغيل</h3>
            {!sim && <p className='mt-2 text-sm text-slate-500'>نفّذ محاكاة لرؤية الزمن المتوقع وعدد استدعاءات الذكاء وخطوات المراجعة البشرية.</p>}
            {sim && (
              <div className='mt-4 space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                  <Metric label='الحالة' value={sim.status} />
                  <Metric label='إجمالي الخطوات' value={String(sim.totalSteps)} />
                  <Metric label='المدة المتوقعة' value={`${sim.estimatedDurationMinutes} دقيقة`} />
                  <Metric label='استدعاءات AI' value={String(sim.aiCallsEstimate)} />
                </div>

                <div>
                  <div className='text-sm font-semibold text-slate-900'>المؤشرات</div>
                  <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                    {Object.entries(sim.metricsPreview || {}).map(([k, v]) => (
                      <div key={k} className='rounded-lg border border-slate-200 p-3 text-sm'>
                        <div className='text-xs text-slate-500'>{k}</div>
                        <div className='font-semibold text-slate-900'>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className='text-sm font-semibold text-slate-900'>سجل الخطوات</div>
                  <div className='mt-2 space-y-2'>
                    {(sim.trace || []).map((t: any, i: number) => (
                      <div key={t.id || i} className='rounded-lg border border-slate-200 p-3'>
                        <div className='flex items-center justify-between gap-3 text-sm'>
                          <div className='font-medium text-slate-900'>{i + 1}. {t.nameAr}</div>
                          <div className='text-xs text-slate-500'>{t.status}</div>
                        </div>
                        {t.noteAr && <div className='mt-1 text-xs text-slate-600'>{t.noteAr}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-slate-200 p-3'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-1 text-sm font-semibold text-slate-900'>{value}</div>
    </div>
  );
}
