import { markdownToHtml } from './markdown';
import type { GovTemplateMeta, PdfBuildOptions } from './types';

type Theme = { primary: string; accent: string };

function resolveRecipientKind(meta: GovTemplateMeta): NonNullable<GovTemplateMeta['recipientKind']> {
  return meta.recipientKind ?? 'auto';
}

function getTheme(meta: GovTemplateMeta): Theme {
  const k = resolveRecipientKind(meta);
  switch (k) {
    case 'heritage_authority':
      return { primary: '#0B2E4A', accent: '#C9A227' };
    case 'municipality':
      return { primary: '#0E5A2A', accent: '#A7C957' };
    case 'museum':
      return { primary: '#4A2B1B', accent: '#D6A77A' };
    case 'season':
      return { primary: '#3F2E56', accent: '#A78BFA' };
    case 'tourism_destination':
      return { primary: '#006D77', accent: '#83C5BE' };
    case 'private':
      return { primary: '#111827', accent: '#9CA3AF' };
    case 'ngo':
      return { primary: '#14532D', accent: '#86EFAC' };
    case 'government':
    case 'semi_government':
    case 'auto':
    default:
      return { primary: '#0B2E4A', accent: '#0EA5E9' };
  }
}

function escHtml(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildGovHtml(meta: GovTemplateMeta, bodyHtml: string, opts: { addSignaturePage: boolean }) {
  const theme = getTheme(meta);
  const title = escHtml(meta.reportTitleAr);
  const subtitle = escHtml(meta.reportSubtitleAr || '');
  const org = escHtml(meta.orgNameAr || 'الجهة');
  const recipient = escHtml(meta.recipientNameAr || 'الجهة المستلمة');
  const version = escHtml(meta.versionLabel || 'v1');
  const status = escHtml(meta.approvals?.statusAr || 'قيد المراجعة');
  const confidentiality = escHtml(meta.confidentialityLabelAr || 'سري داخلي');
  const generatedAt = meta.generatedAtIso ? new Date(meta.generatedAtIso).toLocaleString('ar-SA') : '';
  const docId = escHtml(meta.documentId || '');

  const signerRows = (meta.approvals?.signers?.length ? meta.approvals.signers : [
    { nameAr: 'المعتمد', roleAr: 'لجنة الاعتماد', statusAr: status, signedAtIso: meta.approvals?.decidedAtIso },
  ]).map((s) => {
    const role = escHtml(s.roleAr || '');
    const st = escHtml(s.statusAr || '');
    const at = s.signedAtIso ? new Date(s.signedAtIso).toLocaleString('ar-SA') : '';
    return `<tr><td>${escHtml(s.nameAr)}</td><td>${role}</td><td>${st}</td><td>${escHtml(at)}</td></tr>`;
  }).join('');

  const signaturePage = opts.addSignaturePage ? `
    <div class="page-break"></div>
    <section class="card">
      <h2>التوقيعات والاعتمادات</h2>
      <table class="table">
        <thead><tr><th>الاسم</th><th>الدور</th><th>الحالة</th><th>التاريخ</th></tr></thead>
        <tbody>${signerRows}</tbody>
      </table>
      ${meta.verificationUrl ? `<div class="muted">رابط التحقق: ${escHtml(meta.verificationUrl)}</div>` : ''}
    </section>
  ` : '';

  const qr = meta.qrPngDataUrl ? `<img class="qr" src="${meta.qrPngDataUrl}" alt="QR"/>` : '';

  const coverPage = `
    <section class="cover">
      <div class="cover-top" style="background:${theme.primary}">
        <div class="cover-issuer">${org}</div>
        <div class="cover-conf">${confidentiality} • ${version} • ${escHtml(generatedAt)}</div>
      </div>
      <div class="cover-accent" style="background:${theme.accent}"></div>
      <div class="cover-body">
        <div class="cover-to">إلى: <strong>${recipient}</strong></div>
        <div class="cover-from">من: <strong>${org}</strong></div>
        <h1 class="cover-title">${title}</h1>
        ${subtitle ? `<div class="cover-subtitle">${subtitle}</div>` : ''}
        <div class="cover-meta">
          ${meta.projectNameAr ? `<span>المشروع: ${escHtml(meta.projectNameAr)}</span>` : ''}
          ${meta.experienceTitleAr ? `<span>التجربة: ${escHtml(meta.experienceTitleAr)}</span>` : ''}
          ${docId ? `<span>معرّف الوثيقة: ${docId}</span>` : ''}
          <span>الحالة: ${status}</span>
        </div>
        <div class="cover-qr">${qr}</div>
        ${meta.verificationUrl ? `<div class="muted">رابط التحقق: ${escHtml(meta.verificationUrl)}</div>` : ''}
      </div>
    </section>
  `;

  const verificationNote = escHtml(meta.verificationNoteAr || 'للتحقق: استخدم الرابط/QR لمراجعة البيانات الرسمية ومطابقة المرفقات وملف manifest داخل Bundle.');
  const verificationPage = `
    <section class="verify">
      <h2>صفحة التحقق</h2>
      <div class="verify-grid">
        <div>
          ${docId ? `<div><strong>معرّف الوثيقة</strong>: ${docId}</div>` : ''}
          ${meta.verificationCode ? `<div><strong>رمز التحقق</strong>: ${escHtml(meta.verificationCode)}</div>` : ''}
          ${meta.approvals?.approvalId ? `<div><strong>معرّف الاعتماد</strong>: ${escHtml(meta.approvals.approvalId)}</div>` : ''}
          ${meta.verificationUrl ? `<div><strong>رابط التحقق</strong>: ${escHtml(meta.verificationUrl)}</div>` : ''}
          <div class="muted" style="margin-top:10px">${verificationNote}</div>
        </div>
        <div class="verify-qr">${qr}</div>
      </div>
    </section>
  `;

  return `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        @page { margin: 18mm 16mm 18mm 16mm; }
        body { font-family: Arial, "Noto Naskh Arabic", "Noto Sans Arabic", sans-serif; direction: rtl; }
        .header { border-bottom: 2px solid ${theme.primary}; padding-bottom: 8px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end; }
        .org { font-weight: 700; color:${theme.primary}; font-size: 16px; }
        .meta { color:#444; font-size: 12px; text-align:left; direction:ltr; }
        h1 { color:${theme.primary}; margin: 0 0 6px 0; font-size: 26px; }
        .subtitle { color:#444; margin:0 0 10px 0; }
        .badges { color:#666; font-size: 12px; margin-bottom: 8px; }
        .card { border:1px solid #e5e5e5; border-radius:10px; padding:14px; margin: 10px 0; }
        .cover { border:1px solid #e5e5e5; border-radius:14px; overflow:hidden; }
        .cover-top { color:#fff; padding:14px 16px; display:flex; justify-content:space-between; align-items:flex-end; }
        .cover-issuer { font-weight: 800; font-size: 16px; }
        .cover-conf { font-size: 11px; opacity: 0.95; direction:ltr; text-align:left; }
        .cover-accent { height: 6px; }
        .cover-body { padding:18px 16px; }
        .cover-to { font-size: 14px; color:#111; margin-bottom:4px; }
        .cover-from { font-size: 13px; color:#333; margin-bottom: 14px; }
        .cover-title { margin: 0 0 6px 0; font-size: 30px; color:${theme.primary}; }
        .cover-subtitle { color:#444; margin:0 0 12px 0; }
        .cover-meta { color:#666; font-size: 12px; display:flex; gap:10px; flex-wrap:wrap; margin: 10px 0 14px; }
        .cover-qr { margin-top: 6px; }
        .verify { border:1px solid #e5e5e5; border-radius:14px; padding:16px; }
        .verify-grid { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .verify-qr { width: 110px; }
        .muted { color:#666; font-size: 12px; }
        .footer { position: fixed; bottom: 8mm; left: 16mm; right: 16mm; font-size: 10px; color:#666; display:flex; justify-content:space-between; }
        .page-break { page-break-before: always; }
        .table { width:100%; border-collapse: collapse; font-size: 12px; }
        .table th, .table td { border:1px solid #ddd; padding:8px; }
        .table th { background:#f7f7f7; }
        .qr { width: 90px; height: 90px; }
        .content { font-size: 14px; line-height: 1.8; }
        .content ul { padding-right: 20px; }
        .content code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
      </style>
    </head>
    <body>
      ${coverPage}
      <div class="page-break"></div>
      ${verificationPage}
      <div class="page-break"></div>

      <div class="header">
        <div>
          <div class="org">${org}</div>
        </div>
        <div class="meta">${confidentiality} • ${version} • ${escHtml(generatedAt)}</div>
      </div>

      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      <div class="badges">الحالة: ${status}</div>
      ${qr}

      <div class="card content">${bodyHtml}</div>

      ${signaturePage}

      <div class="footer">
        <div>${confidentiality}</div>
        <div>${version}</div>
      </div>
    </body>
  </html>`;
}

async function htmlToPdf(html: string, pageSize: 'A4' | 'Letter' = 'A4') {
  const executablePath = process.env.CHROME_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error('CHROME_EXECUTABLE_PATH غير مضبوط. يلزم وجود Chromium/Chrome لتوليد PDF عبر headless browser.');
  }
  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: pageSize, printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function buildPdfFromMarkdown(markdown: string, opts: PdfBuildOptions): Promise<Buffer> {
  const meta = opts.templateMeta;
  const bodyHtml = markdownToHtml(markdown || '');
  const html = buildGovHtml(meta, bodyHtml, { addSignaturePage: opts.addSignaturePage !== false });
  return htmlToPdf(html, opts.pageSize || 'A4');
}
