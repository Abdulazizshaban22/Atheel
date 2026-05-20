'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { apiRequest, getApiBase } from '../../../lib/api';
import { getStoredUser, getToken } from '../../../lib/session';

type Attachment = {
  id: string;
  originalName: string;
  mimeType?: string | null;
  uploadedAt?: string;
};

type StaffUser = { id: string; displayName?: string | null; email?: string | null };

type Requirement = {
  id: string;
  category: string;
  discipline: string;
  textAr: string;
  inStudioScope: boolean;
  status: string;
  sourceRefJson?: any;
};

type Obligation = {
  id: string;
  type: string;
  status: string;
  titleAr: string;
  descriptionAr?: string | null;
  dueAt?: string | null;
  ownerUserId?: string | null;
  workflowExecutionId?: string | null;
  reminders?: Array<{ id: string; remindAt: string; status: string; channel: string }>;
  owner?: { id: string; displayName?: string | null; email?: string | null } | null;
};

type ExperiencePlan = {
  zones: Array<{ id: string; code: string; nameAr: string; kind: string; notesAr?: string | null }>;
  scheduleItems: Array<{ id: string; dayIndex: number; startTime: string; endTime: string; titleAr: string; zoneCode?: string | null; notesAr?: string | null }>;
  journeySteps: Array<{ id: string; stepOrder: number; titleAr: string; zoneCode?: string | null; experienceGoalAr: string; measurementHintAr: string }>;
  queueMetrics: Array<{ id: string; metricType: string; zoneCode?: string | null; targetWaitMinutes?: number | null; peakFactor?: any; avgDwellMinutes?: number | null; notesAr?: string | null }>;
};

type OwnerRecommendation = { category: string; recommendedUserId: string | null; score: number; reasonsAr: string[]; breakdown: any };

function fmtDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function nextReminder(reminders?: Obligation['reminders']) {
  const arr = (reminders || []).filter((r) => r.status === 'pending').sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  return arr[0] || null;
}

export default function CompetitionDetailsPage() {
  const params = useParams();
  const id = String((params as any)?.id || '');
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [item, setItem] = useState<any>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [experiencePlan, setExperiencePlan] = useState<ExperiencePlan | null>(null);

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [categoryOwners, setCategoryOwners] = useState<Record<string, string>>({});
  const [ownerRecs, setOwnerRecs] = useState<OwnerRecommendation[]>([]);

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>('');

  async function loadAll() {
    setLoading(true);
    setErrorMsg('');

    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}`, { token });
    if (!res.ok) {
      setErrorMsg(res.error || 'فشل تحميل المنافسة');
      setLoading(false);
      return;
    }
    const data = res.data as any;
    setItem(data?.item || null);
    setAttachments((data?.attachments || []) as Attachment[]);

    const reqRes = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/requirements`, { token });
    if (reqRes.ok) setRequirements((reqRes.data as any)?.items || []);

    const staffRes = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/staff-catalog`, { token });
    if (staffRes.ok) setStaffUsers(((staffRes.data as any)?.items || []) as StaffUser[]);

    const catRes = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/category-assignments`, { token });
    if (catRes.ok) {
      const ownersObj = (catRes.data as any)?.owners || {};
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(ownersObj)) {
        map[String(k)] = String((v as any)?.userId || (v as any)?.user?.id || '');
      }
      setCategoryOwners(map);
    }

    // Wave29: obligations list
    const oblRes = await apiRequest<any>(`/obligations?competitionId=${encodeURIComponent(id)}`, { token });
    if (oblRes.ok) setObligations(((oblRes.data as any)?.items || []) as Obligation[]);

    // Wave32: materialized experience plan tables
    const planRes = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/experience-plan`, { token });
    if (planRes.ok) {
      const d = planRes.data as any;
      setExperiencePlan({
        zones: d?.zones || [],
        scheduleItems: d?.scheduleItems || [],
        journeySteps: d?.journeySteps || [],
        queueMetrics: d?.queueMetrics || [],
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function uploadFile(e: FormEvent) {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');

    const input = document.getElementById('rfp_file') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return setErrorMsg('اختر ملف PDF أولاً');

    const fd = new FormData();
    fd.append('file', file);

    const res = await apiRequest<any>(
      `/attachments/upload?organizationId=${encodeURIComponent(orgId)}&entityType=competition&entityId=${encodeURIComponent(id)}`,
      {
        method: 'POST',
        token,
        body: fd,
      },
    );

    if (!res.ok) return setErrorMsg(res.error || 'فشل رفع الملف');
    setStatusMsg('تم رفع الكراسة');
    await loadAll();
  }

  async function analyze() {
    setStatusMsg('');
    setErrorMsg('');
    if (!selectedAttachmentId) return setErrorMsg('اختر مرفق الكراسة ثم اضغط تحليل');

    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      token,
      body: { attachmentId: selectedAttachmentId },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل إرسال مهمة التحليل');

    const ok = (res.data as any)?.ok;
    if (!ok) {
      return setErrorMsg((res.data as any)?.noteAr || 'التحليل يتطلب Worker');
    }

    setStatusMsg('تم إرسال مهمة التحليل. عند اكتمالها حدّث الصفحة. (Wave29 سيحوّل الامتثال إلى التزامات تلقائيًا)');
  }

  async function setOwner(category: string, userId: string) {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/category-assignments/set-owner`, {
      method: 'POST',
      token,
      body: { category, userId },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل تعيين المسؤول');
    setCategoryOwners((prev) => ({ ...prev, [category]: userId }));
    setStatusMsg('تم تحديث مسؤول الخانة');
  }

  async function recommendOwners(apply: boolean) {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/category-assignments/recommend-owners`, {
      method: 'POST',
      token,
      body: { apply },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل توليد التوصيات');
    const recs = ((res.data as any)?.recommendations || []) as OwnerRecommendation[];
    setOwnerRecs(recs);
    if (apply) {
      const map: Record<string, string> = { ...categoryOwners };
      for (const r of recs) {
        if (r.recommendedUserId) map[r.category] = r.recommendedUserId;
      }
      setCategoryOwners(map);
      setStatusMsg('تم توليد التوصيات وتطبيقها على المسؤولين');
    } else {
      setStatusMsg('تم توليد توصيات المسؤولين');
    }
    await loadAll();
  }

  async function exportScope() {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/exports/studio-scope`, {
      method: 'POST',
      token,
      body: { includePdf: true, includeSignatures: true },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التصدير');

    const md = (res.data as any)?.markdownAttachment;
    const pdf = (res.data as any)?.pdfAttachment;
    const pdfError = (res.data as any)?.pdfError;

    const apiBase = getApiBase();
    const mdLink = md?.id ? `${apiBase}/attachments/${encodeURIComponent(md.id)}/download` : '';
    const pdfLink = pdf?.id ? `${apiBase}/attachments/${encodeURIComponent(pdf.id)}/download` : '';

    setStatusMsg(
      `تم التصدير.\n` +
        (mdLink ? `Markdown: ${md.originalName || md.id}` : '') +
        (pdfLink ? ` | PDF: ${pdf.originalName || pdf.id}` : '') +
        (pdfError ? ` | ملاحظة PDF: ${pdfError}` : ''),
    );

    await loadAll();
  }

  async function regenerateExperienceBlueprint() {
    setStatusMsg('');
    setErrorMsg('');

    const res = await apiRequest<any>(`/competitions/${encodeURIComponent(id)}/experience-blueprint/regenerate`, {
      method: 'POST',
      token,
      body: {},
    });

    if (!res.ok) return setErrorMsg(res.error || 'فشل إعادة توليد مخطط التجربة');
    setStatusMsg('تم إعادة توليد مخطط تجربة الزائر وبرنامج الفعالية');
    await loadAll();
  }

  async function refreshObligations() {
    setStatusMsg('');
    setErrorMsg('');

    const res = await apiRequest<any>(`/obligations/refresh/competition/${encodeURIComponent(id)}`, {
      method: 'POST',
      token,
      body: {},
    });

    if (!res.ok) return setErrorMsg(res.error || 'فشل تحديث الالتزامات');
    setStatusMsg(`تم تحديث الالتزامات: ${(res.data as any)?.upserted || 0} | تذكيرات مجدولة: ${(res.data as any)?.remindersScheduled || 0}`);
    await loadAll();
  }

  async function patchObligation(obligationId: string, patch: any) {
    const res = await apiRequest<any>(`/obligations/${encodeURIComponent(obligationId)}`, {
      method: 'PATCH',
      token,
      body: patch,
    });
    if (!res.ok) {
      setErrorMsg(res.error || 'فشل تحديث التزام');
      return;
    }
    await loadAll();
    setStatusMsg('تم تحديث التزام');
  }

  const grouped = useMemo(() => {
    const g: Record<string, Requirement[]> = {};
    for (const r of requirements) {
      (g[r.category] ||= []).push(r);
    }
    return g;
  }, [requirements]);

  const compliance = useMemo(() => {
    const arr = (item?.metaJson?.analysis?.complianceMatrix || []) as any[];
    const by: Record<string, any[]> = {};
    for (const x of arr) {
      const k = String(x.topicLabelAr || x.topicKey || 'أخرى');
      (by[k] ||= []).push(x);
    }
    return { arr, by };
  }, [item]);

  const obligationsByType = useMemo(() => {
    const by: Record<string, Obligation[]> = {};
    for (const o of obligations) {
      const k = String(o.type || 'compliance');
      (by[k] ||= []).push(o);
    }
    return by;
  }, [obligations]);

  const opportunity = useMemo(() => (item?.metaJson?.analysis?.opportunity || null) as any, [item]);

  const scheduleByDay = useMemo(() => {
    const by: Record<string, ExperiencePlan['scheduleItems']> = {};
    for (const it of experiencePlan?.scheduleItems || []) {
      const k = String(it.dayIndex);
      (by[k] ||= []).push(it);
    }
    return by;
  }, [experiencePlan]);


  return (
    <AppShell
      title={item?.titleAr || 'تفاصيل المنافسة'}
      subtitle={`الحالة: ${item?.status || '—'} | ID: ${id}`}
      badge={`بنود: ${requirements.length} | التزامات: ${obligations.length}`}
      actions={
        <>
          <button className="btn" onClick={loadAll} disabled={loading}>
            {loading ? '...' : 'تحديث'}
          </button>
        </>
      }
    >
      {statusMsg ? (
        <div className="notice success" style={{ whiteSpace: 'pre-wrap' }}>
          {statusMsg}
        </div>
      ) : null}
      {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>رفع كراسة المنافسة</div>
        <form className="row" onSubmit={uploadFile} style={{ gap: 12, alignItems: 'center' }}>
          <input id="rfp_file" type="file" accept="application/pdf" />
          <button className="btn" type="submit">
            رفع
          </button>
        </form>
        <div className="muted">بعد الرفع: اختر المرفق ثم اضغط تحليل. التحليل يعمل عبر Worker ويحوّل الكراسة إلى بنود نطاق الاستوديو.</div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>المرفقات</div>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <select value={selectedAttachmentId} onChange={(e) => setSelectedAttachmentId(e.target.value)} style={{ minWidth: 360 }}>
            <option value="">اختر مرفق الكراسة</option>
            {attachments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.originalName} ({a.id})
              </option>
            ))}
          </select>
          <button className="btn" onClick={analyze}>
            تحليل
          </button>
          <button className="btn btn-ghost" onClick={exportScope}>
            تصدير نطاق الاستوديو
          </button>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {attachments.map((a) => (
            <div key={a.id} className="notice">
              <div style={{ fontWeight: 900 }}>{a.originalName}</div>
              <div className="muted">
                {a.id} {a.mimeType ? `| ${a.mimeType}` : ''}
              </div>
            </div>
          ))}
          {!attachments.length ? <div className="muted">لا توجد مرفقات بعد</div> : null}
        </div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>توزيع المسؤولين على مستوى الخانة</div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => void recommendOwners(false)} disabled={!staffUsers.length}>
              توليد توصيات
            </button>
            <button className="btn" onClick={() => void recommendOwners(true)} disabled={!staffUsers.length}>
              توليد وتطبيق
            </button>
          </div>
        </div>
        <div className="muted">اختر مسؤول واحد نهائي لكل خانة من خانات دانة الأربع. هذا المسؤول يظهر تلقائيًا في ملف التصدير.</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {(
            [
              { key: 'general_scope', label: 'النطاق العام بشكل مختصر' },
              { key: 'event_architecture', label: 'التصميم المعماري للفعالية' },
              { key: 'graphic_design', label: 'التصميم الجرافيكي (مطبوعات + رقمي)' },
              { key: 'overall_direction', label: 'التوجه العام (المسارات وتقسيم الفعاليات)' },
            ] as const
          ).map((c) => (
            <div key={c.key} className="card stack" style={{ gap: 8 }}>
              <div style={{ fontWeight: 800 }}>{c.label}</div>
              <select value={categoryOwners[c.key] || ''} onChange={(e) => void setOwner(c.key, e.target.value)} style={{ minWidth: 260 }}>
                <option value="">اختر المسؤول النهائي</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.displayName || u.email || u.id) as any}
                  </option>
                ))}
              </select>
              <div className="muted">
                المسؤول الحالي:{' '}
                {categoryOwners[c.key]
                  ? staffUsers.find((x) => x.id === categoryOwners[c.key])?.displayName || staffUsers.find((x) => x.id === categoryOwners[c.key])?.email || categoryOwners[c.key]
                  : 'غير محدد'}
              </div>
            </div>
          ))}
        </div>
        {!staffUsers.length ? <div className="muted">لا يوجد كتالوج موظفين متاح. تأكد أن المستخدمين لديهم Memberships على نفس المنظمة.</div> : null}

        {ownerRecs.length ? (
          <div className="card stack" style={{ gap: 10 }}>
            <div style={{ fontWeight: 900 }}>توصيات المسؤولين (Wave32)</div>
            <div className="muted">التوصية تعتمد على المهارات في ملف الموظف + سجل الإنجاز داخل النظام + العبء الحالي (التزامات مفتوحة).</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10 }}>
              {ownerRecs.map((r) => {
                const u = r.recommendedUserId ? staffUsers.find((x) => x.id === r.recommendedUserId) : null;
                return (
                  <div key={r.category} className="notice">
                    <div style={{ fontWeight: 900 }}>{r.category}</div>
                    <div className="muted">المرشح: {u?.displayName || u?.email || r.recommendedUserId || '—'} | الدرجة: {Number(r.score || 0).toFixed(2)}</div>
                    <ul style={{ margin: 0, paddingInlineStart: 18 }} className="stack">
                      {(r.reasonsAr || []).slice(0, 4).map((x, i) => (
                        <li key={i} className="muted">{x}</li>
                      ))}
                    </ul>
                    <div className="muted">تفصيل: مهارات {Number(r.breakdown?.skillMatch || 0).toFixed(2)} | خبرة {Number(r.breakdown?.experience || 0).toFixed(2)} | عبء {Number(r.breakdown?.workload || 0).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>بنود المنافسة المصنفة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {Object.entries(grouped).map(([cat, rs]) => (
            <div key={cat} className="card stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 900 }}>{cat}</div>
                <div className="badge">{rs.length}</div>
              </div>
              <ol className="stack" style={{ margin: 0, paddingInlineStart: 18, gap: 6 }}>
                {rs.slice(0, 15).map((r) => (
                  <li key={r.id}>
                    <div style={{ fontWeight: 700 }}>{r.textAr}</div>
                    <div className="muted">
                      {r.discipline} | {r.inStudioScope ? 'ضمن الاستوديو' : 'خارج النطاق'}
                      {r.sourceRefJson?.page != null ? ` | ص${r.sourceRefJson.page}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
              {rs.length > 15 ? <div className="muted">عرض أول 15 بند فقط</div> : null}
            </div>
          ))}
        </div>
        {!requirements.length ? <div className="muted">لا توجد بنود بعد. ارفع الكراسة ثم اضغط تحليل.</div> : null}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>مصفوفة الامتثال (سلامة/استدامة/تراخيص)</div>
        <div className="muted">هذه عناصر امتثال تم التقاطها تلقائيًا من نص الكراسة، ومربوطة بمرجع الصفحة قدر الإمكان.</div>
        {!compliance.arr.length ? (
          <div className="muted">لا توجد عناصر امتثال مسجلة بعد. شغّل التحليل على كراسة PDF.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10 }}>
            {Object.entries(compliance.by).map(([label, arr]) => (
              <div key={label} className="card stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 900 }}>{label}</div>
                  <div className="badge">{arr.length}</div>
                </div>
                <ol className="stack" style={{ margin: 0, paddingInlineStart: 18, gap: 6 }}>
                  {(arr as any[]).slice(0, 12).map((x, idx) => (
                    <li key={`${label}_${idx}`}>
                      <div style={{ fontWeight: 700 }}>{String(x.textAr || '').trim()}</div>
                      <div className="muted">{x.page != null ? `ص${x.page}` : '—'}</div>
                    </li>
                  ))}
                </ol>
                {(arr as any[]).length > 12 ? <div className="muted">عرض أول 12 عنصر</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>خطة تجربة الزائر التشغيلية (Wave32)</div>
          <button className="btn" onClick={regenerateExperienceBlueprint}>
            إعادة توليد الخطة
          </button>
        </div>
        <div className="muted">
          تم تحويل مخطط تجربة الزائر من Json إلى جداول تشغيلية: مناطق Zones + جدول فعاليات Schedule + رحلة زائر Journey + مؤشرات طوابير QueueMetrics.
          هذا يسهل التقارير والمقارنة بين المنافسات.
        </div>

        {opportunity ? (
          <div className="notice">
            <div style={{ fontWeight: 900 }}>تصنيف الفرصة</div>
            <div className="muted">
              القطاعات: {Array.isArray(opportunity.sectorCodes) ? opportunity.sectorCodes.join('، ') : '—'} {' | '}الثقة: {typeof opportunity.confidence === 'number' ? opportunity.confidence.toFixed(2) : '—'}
            </div>
            <div className="muted">تقدير الجمهور: {opportunity.audienceEstimate?.min ?? '—'} إلى {opportunity.audienceEstimate?.max ?? '—'} | {opportunity.audienceEstimate?.rationaleAr || ''}</div>
          </div>
        ) : null}

        {!experiencePlan || (!experiencePlan.zones.length && !experiencePlan.scheduleItems.length) ? (
          <div className="muted">لا توجد خطة تشغيلية بعد. شغّل التحليل أو اضغط إعادة توليد.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
            <div className="card stack" style={{ gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Zones المناطق</div>
              <ol style={{ margin: 0, paddingInlineStart: 18 }} className="stack">
                {(experiencePlan.zones || []).slice(0, 18).map((z) => (
                  <li key={z.id}>
                    <div style={{ fontWeight: 800 }}>{z.nameAr}</div>
                    <div className="muted">{z.kind} | {z.code}{z.notesAr ? ` | ${z.notesAr}` : ''}</div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card stack" style={{ gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Schedule جدول الفعاليات</div>
              {Object.entries(scheduleByDay).slice(0, 4).map(([day, arr]) => (
                <div key={day} className="notice">
                  <div style={{ fontWeight: 900 }}>اليوم {day}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18 }} className="stack">
                    {(arr || []).slice(0, 10).map((s) => (
                      <li key={s.id}>
                        <div style={{ fontWeight: 800 }}>{s.startTime} - {s.endTime} | {s.titleAr}</div>
                        <div className="muted">{s.zoneCode || '—'}{s.notesAr ? ` | ${s.notesAr}` : ''}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="card stack" style={{ gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Journey رحلة الزائر</div>
              <ol style={{ margin: 0, paddingInlineStart: 18 }} className="stack">
                {(experiencePlan.journeySteps || []).slice(0, 12).map((s) => (
                  <li key={s.id}>
                    <div style={{ fontWeight: 800 }}>{s.titleAr}</div>
                    <div className="muted">{s.zoneCode || '—'} | الهدف: {s.experienceGoalAr}</div>
                    <div className="muted">قياس: {s.measurementHintAr}</div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card stack" style={{ gap: 8 }}>
              <div style={{ fontWeight: 900 }}>QueueMetrics مؤشرات الطوابير</div>
              <div className="muted">افتراضات أولية قابلة للتعديل لاحقًا حسب الكراسة والحجم الفعلي.</div>
              <ol style={{ margin: 0, paddingInlineStart: 18 }} className="stack">
                {(experiencePlan.queueMetrics || []).slice(0, 12).map((m) => (
                  <li key={m.id}>
                    <div style={{ fontWeight: 800 }}>{m.metricType}{m.zoneCode ? ` | ${m.zoneCode}` : ''}</div>
                    <div className="muted">هدف انتظار: {m.targetWaitMinutes ?? '—'} دقيقة | ذروة: {m.peakFactor ?? '—'} | إقامة: {m.avgDwellMinutes ?? '—'} دقيقة</div>
                    {m.notesAr ? <div className="muted">{m.notesAr}</div> : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>

<section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>الالتزامات (Wave29)</div>
          <button className="btn" onClick={refreshObligations}>
            تحويل الامتثال إلى التزامات + تذكيرات
          </button>
        </div>
        <div className="muted">
          الالتزام هو عنصر قابل للإسناد والمتابعة: مالك، موعد، حالة، تذكيرات. يتم توليده تلقائيًا من الامتثال بعد التحليل ويمكنك تحديثه هنا.
        </div>

        {!obligations.length ? (
          <div className="muted">لا توجد التزامات بعد. شغّل التحليل أو اضغط زر التحويل.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 12 }}>
            {Object.entries(obligationsByType).map(([t, arr]) => (
              <div key={t} className="card stack" style={{ gap: 10 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 900 }}>{t}</div>
                  <div className="badge">{arr.length}</div>
                </div>
                {(arr as Obligation[]).slice(0, 20).map((o) => {
                  const next = nextReminder(o.reminders);
                  return (
                    <div key={o.id} className="notice">
                      <div style={{ fontWeight: 900 }}>{o.titleAr}</div>
                      {o.descriptionAr ? <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{o.descriptionAr}</div> : null}
                      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                        <label className="muted">الحالة</label>
                        <select value={o.status} onChange={(e) => void patchObligation(o.id, { status: e.target.value })}>
                          <option value="open">مفتوح</option>
                          <option value="in_progress">قيد التنفيذ</option>
                          <option value="done">مكتمل</option>
                          <option value="waived">مستثنى</option>
                          <option value="overdue">متأخر</option>
                        </select>

                        <label className="muted">المالك</label>
                        <select value={o.ownerUserId || ''} onChange={(e) => void patchObligation(o.id, { ownerUserId: e.target.value || null })}>
                          <option value="">غير محدد</option>
                          {staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {(u.displayName || u.email || u.id) as any}
                            </option>
                          ))}
                        </select>

                        <label className="muted">الموعد</label>
                        <input
                          type="date"
                          value={fmtDate(o.dueAt)}
                          onChange={(e) => void patchObligation(o.id, { dueAt: e.target.value ? new Date(e.target.value + 'T09:00:00.000Z').toISOString() : null })}
                        />
                      </div>
                      <div className="muted" style={{ marginTop: 8 }}>
                        تذكيرات: {(o.reminders || []).length} | التالي: {next ? `${new Date(next.remindAt).toISOString().slice(0, 16).replace('T', ' ')} (${next.channel})` : '—'}
                        {o.workflowExecutionId ? ` | سير عمل: ${o.workflowExecutionId}` : ''}
                      </div>
                    </div>
                  );
                })}
                {(arr as Obligation[]).length > 20 ? <div className="muted">عرض أول 20 التزام فقط</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>توجيه</div>
        <div className="muted">لتشغيل تحليل PDF والرادار والالتزامات: شغّل Redis + Worker واضبط WORKER_TOKEN وRADAR_CONNECTORS وOBLIGATIONS_QUEUE.</div>
      </section>
    </AppShell>
  );
}
