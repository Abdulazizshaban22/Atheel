'use client';

import { useMemo, useRef, useState } from 'react';
import { getApiBase } from '../lib/api';

type VerifyResponse = any;

type VerifyMode = 'quick' | 'forensic';
type TableFilter = 'all' | 'mismatched' | 'missing' | 'extra';

type RowKind = 'matched' | 'mismatched' | 'missing' | 'extra';

type VerifyRow = {
  kind: RowKind;
  name: string;
  expectedSha256?: string;
  actualSha256?: string;
  expectedSizeBytes?: number;
  actualSizeBytes?: number;
};

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '0 بايت';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function nowStamp() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function shortHash(x?: string) {
  const s = String(x || '');
  if (s.length <= 16) return s;
  return `${s.slice(0, 10)}…${s.slice(-6)}`;
}

function csvEscape(v: any) {
  const s = String(v ?? '');
  if (/[\r\n",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function VerifyBundleClient({ expectedPacketId }: { expectedPacketId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<VerifyResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState<VerifyMode>('quick');
  const [filter, setFilter] = useState<TableFilter>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ملاحظة: الخادم هو مصدر الحقيقة. هذا الحد للواجهة فقط لإرشاد المستخدم.
  const maxZipBytesHint = 120 * 1024 * 1024;

  const status = useMemo(() => {
    if (!res) return null;
    if (res.status === 'match') return { label: 'مطابق', cls: 'badge success' };
    if (res.status === 'mismatch') return { label: 'غير مطابق', cls: 'badge danger' };
    return { label: 'غير صالح', cls: 'badge warning' };
  }, [res]);

  const fileTooLarge = useMemo(() => {
    if (!file) return false;
    return file.size > maxZipBytesHint;
  }, [file]);

  const rows: VerifyRow[] = useMemo(() => {
    if (!res) return [];

    const map = new Map<string, VerifyRow>();

    const resFiles = Array.isArray(res.files) ? res.files : [];
    for (const f of resFiles) {
      if (!f?.name) continue;
      const name = String(f.name);
      const match = !!f.match;
      const expectedSha256 = f.expectedSha256 ? String(f.expectedSha256) : undefined;
      const actualSha256 = f.actualSha256 ? String(f.actualSha256) : undefined;

      let kind: RowKind = match ? 'matched' : 'mismatched';
      // في بعض الحالات قد يمثل الملف مفقودا (لا يوجد actualSha256)
      if (!actualSha256 && !match) kind = 'missing';

      map.set(name, {
        kind,
        name,
        expectedSha256,
        actualSha256,
        expectedSizeBytes: Number.isFinite(f.expectedSizeBytes) ? Number(f.expectedSizeBytes) : undefined,
        actualSizeBytes: Number.isFinite(f.actualSizeBytes) ? Number(f.actualSizeBytes) : undefined,
      });
    }

    const missing = Array.isArray(res.missingFiles) ? res.missingFiles : [];
    for (const n of missing) {
      const name = String(n);
      const existing = map.get(name);
      if (!existing) {
        map.set(name, { kind: 'missing', name });
      } else {
        map.set(name, { ...existing, kind: 'missing' });
      }
    }

    const extra = Array.isArray(res.extraFiles) ? res.extraFiles : [];
    for (const n of extra) {
      const name = String(n);
      if (!map.has(name)) map.set(name, { kind: 'extra', name });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [res]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.kind === filter);
  }, [rows, filter]);

  function pickFile() {
    inputRef.current?.click();
  }

  function setPicked(f: File | null) {
    setFile(f);
    setRes(null);
    setErr(null);
    setFilter('all');
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0] || null;
    if (f) setPicked(f);
  }

  function downloadReportCsv() {
    if (!res) return;

    const name = `atheel_verify_report_${expectedPacketId}_${filter}_${nowStamp()}.csv`;

    const header = [
      'معرف_الوثيقة',
      'نتيجة_التحقق',
      'تاريخ_التحقق',
      'بصمة_ZIP_SHA256',
      'رمز_التحقق',
      'الفئة',
      'الملف',
      'بصمة_متوقعة_SHA256',
      'بصمة_فعلية_SHA256',
      'حجم_متوقع_بايت',
      'حجم_فعلي_بايت',
    ];

    const verifiedAt = res.verifiedAt ?? '';
    const zipSha256 = res.zipSha256 ?? '';
    const vcode = res?.manifest?.verificationCode ?? '';

    const statusAr = res.status === 'match' ? 'مطابق' : res.status === 'mismatch' ? 'غير مطابق' : 'غير صالح';

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(','));

    const useRows = filteredRows;
    for (const r of useRows) {
      const kindAr = r.kind === 'matched' ? 'مطابق' : r.kind === 'mismatched' ? 'غير مطابق' : r.kind === 'missing' ? 'مفقود' : 'زائد';
      const row = [
        expectedPacketId,
        statusAr,
        verifiedAt,
        zipSha256,
        vcode,
        kindAr,
        r.name,
        r.expectedSha256 ?? '',
        r.actualSha256 ?? '',
        Number.isFinite(r.expectedSizeBytes) ? String(r.expectedSizeBytes) : '',
        Number.isFinite(r.actualSizeBytes) ? String(r.actualSizeBytes) : '',
      ];
      lines.push(row.map(csvEscape).join(','));
    }

    // BOM لتحسين فتح CSV في Excel مع العربية
    const content = `\ufeff${lines.join('\r\n')}`;
    downloadText(name, content, 'text/csv;charset=utf-8');
  }

  async function runVerify() {
    if (!file) return;
    if (fileTooLarge) {
      setErr(`حجم الملف أكبر من الحد الإرشادي (${formatBytes(maxZipBytesHint)}).`);
      return;
    }
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const url = `${getApiBase()}/verification/bundles/verify?expectedPacketId=${encodeURIComponent(expectedPacketId)}`;
      const r = await fetch(url, { method: 'POST', body: fd });
      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setErr((data && (data.message || data.error)) || `HTTP ${r.status}`);
        setBusy(false);
        return;
      }

      setRes(data);
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  }

  const summary = res?.summary || {};

  return (
    <section className="card stack">
      <h3 style={{ margin: 0 }}>التحقق من الحزمة الرسمية</h3>
      <div className="muted">
        اختر نمط التحقق المناسب. التحقق السريع يعرض النتيجة والملخص فقط، بينما التحقق التدقيقي يعرض تفاصيل الملفات مع تصفية وتصدير CSV.
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button
          className={`btn ${mode === 'quick' ? 'btn-secondary' : ''}`}
          type="button"
          onClick={() => setMode('quick')}
          disabled={busy}
        >
          تحقق سريع
        </button>
        <button
          className={`btn ${mode === 'forensic' ? 'btn-secondary' : ''}`}
          type="button"
          onClick={() => setMode('forensic')}
          disabled={busy}
        >
          تحقق تدقيقي
        </button>
        {status ? <span className={status.cls}>{status.label}</span> : null}
      </div>

      <div
        className={`dropzone ${drag ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onClick={pickFile}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') pickFile();
        }}
      >
        <div className="stack" style={{ gap: 6 }}>
          <b>اسحب وأفلت ملف ZIP هنا، أو اضغط للاختيار</b>
          <div className="muted">الحد الإرشادي للحجم: {formatBytes(maxZipBytesHint)} (قد يختلف حسب إعدادات المنصة)</div>
        </div>
      </div>

      <input
        ref={inputRef}
        style={{ display: 'none' }}
        type="file"
        accept=".zip,application/zip"
        onChange={(e) => setPicked(e.target.files?.[0] || null)}
      />

      {file ? (
        <div className="notice">
          <b>الملف المختار</b>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono">{file.name}</span>
            <span className={`badge ${fileTooLarge ? 'danger' : ''}`}>{formatBytes(file.size)}</span>
          </div>
          {fileTooLarge ? (
            <div className="muted" style={{ marginTop: 8 }}>
              الملف يتجاوز الحد الإرشادي. قد يرفضه الخادم.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" disabled={!file || busy} onClick={runVerify} type="button">
          {busy ? 'جاري التحقق...' : 'بدء التحقق'}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => setPicked(null)} type="button">
          مسح الاختيار
        </button>
      </div>

      {err ? <div className="notice error">{err}</div> : null}

      {res ? (
        <div className="stack">
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <span className="badge">مطابق: {summary.matched ?? '-'}</span>
            <span className={`badge ${Number(summary.mismatched || 0) > 0 ? 'danger' : ''}`}>غير مطابق: {summary.mismatched ?? '-'}</span>
            <span className={`badge ${Number(summary.missing || 0) > 0 ? 'danger' : ''}`}>مفقود: {summary.missing ?? '-'}</span>
            <span className={`badge ${Number(summary.extra || 0) > 0 ? 'warning' : ''}`}>زائد: {summary.extra ?? '-'}</span>
          </div>

          <div className="notice">
            <b>بصمة ملف ZIP</b>
            <div className="mono" style={{ marginTop: 6 }}>{res.zipSha256}</div>
            {res?.manifest?.verificationCode ? (
              <div className="muted" style={{ marginTop: 8 }}>
                رمز التحقق داخل الحزمة: <span className="mono">{res.manifest.verificationCode}</span>
              </div>
            ) : null}
          </div>

          {mode === 'quick' ? (
            <div className="notice">
              <b>نتيجة سريعة</b>
              <div className="muted" style={{ marginTop: 8 }}>
                لعرض تفاصيل الملفات والتصفية وتصدير CSV، اختر تحقق تدقيقي.
              </div>
            </div>
          ) : (
            <>
              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <button className={`btn ${filter === 'all' ? 'btn-secondary' : ''}`} type="button" onClick={() => setFilter('all')}>
                  كل النتائج
                </button>
                <button className={`btn ${filter === 'mismatched' ? 'btn-secondary' : ''}`} type="button" onClick={() => setFilter('mismatched')}>
                  غير مطابق فقط
                </button>
                <button className={`btn ${filter === 'missing' ? 'btn-secondary' : ''}`} type="button" onClick={() => setFilter('missing')}>
                  مفقود فقط
                </button>
                <button className={`btn ${filter === 'extra' ? 'btn-secondary' : ''}`} type="button" onClick={() => setFilter('extra')}>
                  زائد فقط
                </button>
              </div>

              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" type="button" onClick={downloadReportCsv}>
                  تصدير CSV
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    const name = `atheel_verify_report_${expectedPacketId}_${nowStamp()}.json`;
                    downloadText(name, JSON.stringify(res, null, 2), 'application/json;charset=utf-8');
                  }}
                >
                  تحميل JSON
                </button>
              </div>

              {filteredRows.length === 0 ? (
                <div className="notice">لا توجد نتائج ضمن هذا الفلتر</div>
              ) : (
                <div style={{ overflow: 'auto' }} className="notice">
                  <b>تفاصيل الملفات</b>
                  <div className="muted" style={{ marginTop: 6 }}>
                    يعرض الجدول نتائج التحقق لكل ملف. يمكن تصفية النتائج من الأعلى وتصدير CSV للمراجعة.
                  </div>
                  <div style={{ marginTop: 12, overflow: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">الملف</th>
                          <th scope="col">الحالة</th>
                          <th scope="col">البصمة المتوقعة</th>
                          <th scope="col">البصمة الفعلية</th>
                          <th scope="col">الحجم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r) => {
                          const label = r.kind === 'matched' ? 'مطابق' : r.kind === 'mismatched' ? 'غير مطابق' : r.kind === 'missing' ? 'مفقود' : 'زائد';
                          const cls = r.kind === 'matched' ? 'badge success' : r.kind === 'extra' ? 'badge warning' : 'badge danger';
                          const size = Number.isFinite(r.actualSizeBytes)
                            ? formatBytes(Number(r.actualSizeBytes))
                            : (Number.isFinite(r.expectedSizeBytes) ? formatBytes(Number(r.expectedSizeBytes)) : '—');

                          return (
                            <tr key={`${r.kind}:${r.name}`}>
                              <td className="mono">{r.name}</td>
                              <td><span className={cls}>{label}</span></td>
                              <td className="mono">{r.expectedSha256 ? shortHash(r.expectedSha256) : '—'}</td>
                              <td className="mono">{r.actualSha256 ? shortHash(r.actualSha256) : '—'}</td>
                              <td className="mono">{size}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
