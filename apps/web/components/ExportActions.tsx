'use client';

import { useMemo, useState } from 'react';
import { apiRequest, getApiBase } from '../lib/api';

type ExportJob = {
  id: string;
  status: string;
  result?: {
    pptxAttachmentId?: string;
    pdfAttachmentIds?: string[];
    bundleAttachmentId?: string;
  };
  error?: string;
};

async function downloadAttachment(attachmentId: string, filenameHint: string) {
  const url = `${getApiBase()}/exports/download/${encodeURIComponent(attachmentId)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`فشل التحميل: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filenameHint;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2500);
}

export function ExportActions({ approvalPacketId }: { approvalPacketId: string }) {
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const hasArtifacts = useMemo(() => {
    return Boolean(job?.result?.bundleAttachmentId || job?.result?.pptxAttachmentId || (job?.result?.pdfAttachmentIds || []).length);
  }, [job]);

  async function run() {
    setErr(null);
    setLoading(true);
    try {
      const resp = await apiRequest<any>(`/exports/approval-packets/${approvalPacketId}/generate`, {
        method: 'POST',
        body: {
          async: false,
          includePptx: true,
          includePdf: true,
          includeBundleZip: true,
          includeSignatures: true,
          pageSize: 'A4',
        },
      });
      if (!resp.ok) throw new Error(resp.error || 'فشل توليد الحزمة');
      const j = (resp.data as any)?.job;
      setJob(j || null);
    } catch (e: any) {
      setErr(e?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <h3 style={{ margin: 0 }}>تصدير الحزمة الرسمية</h3>
      <div className="muted">
        توليد ملفات فعلية PDF و PPTX ثم ربطها كمرفقات داخل المنصة، مع حزمة ZIP جاهزة للإرسال.
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={run} disabled={loading}>
          {loading ? 'جاري التوليد...' : 'توليد Wave12 الآن'}
        </button>
        {job?.status ? <span className="badge">الحالة: {job.status}</span> : null}
        {job?.error ? <span className="badge" style={{ background: '#ffecec', color: '#b20000' }}>خطأ: {job.error}</span> : null}
      </div>

      {err ? <div className="notice" style={{ borderColor: '#ffcccc' }}>{err}</div> : null}

      {hasArtifacts ? (
        <div className="stack">
          <div className="muted">الملفات المتولدة</div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {job?.result?.bundleAttachmentId ? (
              <button className="btn" onClick={() => downloadAttachment(job.result!.bundleAttachmentId!, `ATHEEL_${approvalPacketId}_DeliveryBundle.zip`)}>
                تحميل الحزمة ZIP
              </button>
            ) : null}
            {job?.result?.pptxAttachmentId ? (
              <button className="btn" onClick={() => downloadAttachment(job.result!.pptxAttachmentId!, `ATHEEL_${approvalPacketId}_EventDeck.pptx`)}>
                تحميل العرض PPTX
              </button>
            ) : null}
            {(job?.result?.pdfAttachmentIds || []).map((id, idx) => (
              <button key={id} className="btn" onClick={() => downloadAttachment(id, `ATHEEL_${approvalPacketId}_Doc_${idx + 1}.pdf`)}>
                تحميل PDF {idx + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
