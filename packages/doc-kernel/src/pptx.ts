import PptxGenJS from 'pptxgenjs';
import { markdownToSlides } from './markdown';
import type { GovTemplateMeta, PptxBuildOptions, SlideSpec } from './types';

type Theme = { primary: string; accent: string; textOnPrimary: string };
type RecipientKind = NonNullable<GovTemplateMeta['recipientKind']>;
type PptxInstance = InstanceType<typeof PptxGenJS>;
type SlideLike = ReturnType<PptxInstance['addSlide']>;
type SlideWithMeta = SlideLike & { __meta?: GovTemplateMeta };

type TextBlockOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  color?: string;
  align?: 'right' | 'left' | 'center';
  bold?: boolean;
  valign?: 'top' | 'mid' | 'bottom';
};

function resolveRecipientKind(meta: GovTemplateMeta): RecipientKind {
  return meta.recipientKind ?? 'auto';
}

function getTheme(meta: GovTemplateMeta): Theme {
  const kind = resolveRecipientKind(meta);
  switch (kind) {
    case 'heritage_authority': return { primary: '0B2E4A', accent: 'C9A227', textOnPrimary: 'FFFFFF' };
    case 'municipality': return { primary: '0E5A2A', accent: 'A7C957', textOnPrimary: 'FFFFFF' };
    case 'museum': return { primary: '4A2B1B', accent: 'D6A77A', textOnPrimary: 'FFFFFF' };
    case 'season': return { primary: '3F2E56', accent: 'A78BFA', textOnPrimary: 'FFFFFF' };
    case 'tourism_destination': return { primary: '006D77', accent: '83C5BE', textOnPrimary: 'FFFFFF' };
    case 'private': return { primary: '1F2937', accent: '9CA3AF', textOnPrimary: 'FFFFFF' };
    case 'ngo': return { primary: '14532D', accent: '86EFAC', textOnPrimary: 'FFFFFF' };
    case 'semi_government':
    case 'government':
    case 'auto':
    default:
      return { primary: '0B2E4A', accent: '0EA5E9', textOnPrimary: 'FFFFFF' };
  }
}

function safe(input?: string): string {
  return (input || '').toString();
}

function rememberMeta(slide: SlideLike, meta: GovTemplateMeta): SlideWithMeta {
  const typed = slide as SlideWithMeta;
  typed.__meta = meta;
  return typed;
}

function readMeta(slide: SlideWithMeta, fallback?: GovTemplateMeta): GovTemplateMeta {
  return fallback ?? slide.__meta ?? { reportTitleAr: 'وثيقة' };
}

function addText(slide: SlideLike, text: string, options: TextBlockOptions): void {
  slide.addText(text, options as Record<string, unknown>);
}

function addFooter(slide: SlideLike, meta: GovTemplateMeta): void {
  const footer = [
    meta.confidentialityLabelAr || 'سري داخلي',
    meta.versionLabel || 'v1',
    meta.generatedAtIso ? new Date(meta.generatedAtIso).toLocaleString('ar-SA') : undefined,
  ].filter(Boolean).join(' • ');
  addText(slide, footer, { x: 0.3, y: 7.1, w: 12.7, h: 0.3, fontSize: 10, color: '666666', align: 'right' });
}

function addHeader(slide: SlideLike, meta: GovTemplateMeta): void {
  const theme = getTheme(meta);
  slide.addShape(PptxGenJS.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.55, fill: { color: theme.primary }, line: { color: theme.primary } });
  addText(slide, meta.orgNameAr || 'الجهة المُصدرة', { x: 0.3, y: 0.08, w: 12.7, h: 0.4, fontSize: 14, bold: true, color: theme.textOnPrimary, align: 'right' });
}

function addBullets(slide: SlideLike, bullets: string[]): void {
  const lines = bullets.slice(0, 10).map((item) => `• ${item}`);
  addText(slide, lines.join('\n'), { x: 0.6, y: 1.4, w: 12.1, h: 5.5, fontSize: 18, color: '222222', align: 'right', valign: 'top' });
}

function addTitle(slide: SlideLike, title: string, meta?: GovTemplateMeta): void {
  const theme = getTheme(readMeta(slide as SlideWithMeta, meta));
  addText(slide, title, { x: 0.6, y: 0.8, w: 12.1, h: 0.6, fontSize: 28, bold: true, color: theme.primary, align: 'right' });
}

function addVerificationSlide(pptx: PptxGenJS, meta: GovTemplateMeta): void {
  const slide = rememberMeta(pptx.addSlide(), meta);
  addHeader(slide, meta);
  addTitle(slide, 'صفحة التحقق', meta);
  const lines = [
    meta.documentId ? `معرّف الوثيقة: ${meta.documentId}` : undefined,
    meta.verificationCode ? `رمز التحقق: ${meta.verificationCode}` : undefined,
    meta.approvals?.approvalId ? `معرّف الاعتماد: ${meta.approvals.approvalId}` : undefined,
    meta.verificationUrl ? `رابط التحقق: ${meta.verificationUrl}` : undefined,
  ].filter((line): line is string => Boolean(line));
  addText(slide, lines.join('\n'), { x: 0.8, y: 1.6, w: 8.2, h: 2.2, fontSize: 16, color: '222222', align: 'right', valign: 'top' });
  const note = meta.verificationNoteAr || 'للتحقق: استخدم الرابط/QR لمراجعة البيانات الرسمية ومطابقة المرفقات وملف manifest داخل Bundle.';
  addText(slide, note, { x: 0.8, y: 3.9, w: 12, h: 1, fontSize: 12, color: '555555', align: 'right', valign: 'top' });
  if (meta.qrPngDataUrl) {
    try { slide.addImage({ data: meta.qrPngDataUrl, x: 10.2, y: 1.6, w: 2.6, h: 2.6 }); } catch {}
  }
  addFooter(slide, meta);
}

function addUnifiedCover(slide: SlideLike, meta: GovTemplateMeta, coverTitle: string): void {
  const theme = getTheme(meta);
  slide.addShape(PptxGenJS.ShapeType.rect, { x: 0, y: 0.55, w: 13.33, h: 0.08, fill: { color: theme.accent }, line: { color: theme.accent } });
  addText(slide, `إلى: ${meta.recipientNameAr || 'جهة مستلمة'}`, { x: 0.6, y: 1.2, w: 12.1, h: 0.5, fontSize: 16, color: '444444', align: 'right' });
  addText(slide, `من: ${meta.orgNameAr || 'الجهة المُصدرة'}`, { x: 0.6, y: 1.65, w: 12.1, h: 0.5, fontSize: 14, color: '666666', align: 'right' });
  addText(slide, coverTitle, { x: 0.6, y: 2.35, w: 12.1, h: 1, fontSize: 44, bold: true, color: theme.primary, align: 'right' });
  addText(slide, safe(meta.reportSubtitleAr), { x: 0.6, y: 3.35, w: 12.1, h: 0.7, fontSize: 18, color: '444444', align: 'right' });
  const metaLine = [
    meta.projectNameAr ? `المشروع: ${meta.projectNameAr}` : undefined,
    meta.experienceTitleAr ? `التجربة: ${meta.experienceTitleAr}` : undefined,
    meta.approvals?.statusAr ? `الحالة: ${meta.approvals.statusAr}` : undefined,
    meta.documentId ? `ID: ${meta.documentId}` : undefined,
  ].filter((line): line is string => Boolean(line)).join(' • ');
  addText(slide, metaLine, { x: 0.6, y: 4.15, w: 12.1, h: 0.6, fontSize: 14, color: '666666', align: 'right' });
}

function addSignatureSlide(pptx: PptxGenJS, meta: GovTemplateMeta): void {
  const slide = rememberMeta(pptx.addSlide(), meta);
  addHeader(slide, meta);
  addTitle(slide, 'التوقيعات والاعتمادات', meta);
  const signers = meta.approvals?.signers?.length ? meta.approvals.signers : [{ nameAr: 'المعتمد', roleAr: 'لجنة الاعتماد', statusAr: meta.approvals?.statusAr || 'قيد المراجعة' }];
  const lines = signers.map((signer) => `• ${signer.nameAr}${signer.roleAr ? ` — ${signer.roleAr}` : ''}${signer.statusAr ? ` — ${signer.statusAr}` : ''}${signer.signedAtIso ? ` — ${new Date(signer.signedAtIso).toLocaleString('ar-SA')}` : ''}`);
  addText(slide, lines.join('\n'), { x: 0.8, y: 1.6, w: 11.8, h: 5.2, fontSize: 18, align: 'right', valign: 'top' });
  if (meta.verificationUrl) addText(slide, `التحقق: ${meta.verificationUrl}`, { x: 0.8, y: 6.6, w: 11.8, h: 0.4, fontSize: 12, color: '555555', align: 'right' });
  addFooter(slide, meta);
}

export async function buildPptxFromMarkdown(markdown: string, opts: PptxBuildOptions): Promise<Buffer> {
  const meta = opts.templateMeta;
  const parsed = markdownToSlides(markdown || '');
  const coverTitle = parsed.coverTitle || meta.reportTitleAr;
  const slides: SlideSpec[] = parsed.slides;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'ATHEEL';
  pptx.company = meta.orgNameAr || 'ATHEEL';
  pptx.subject = meta.reportTitleAr;
  const cover = rememberMeta(pptx.addSlide(), meta);
  addHeader(cover, meta);
  addUnifiedCover(cover, meta, coverTitle);
  addFooter(cover, meta);
  addVerificationSlide(pptx, meta);
  for (const slideSpec of slides.slice(0, 25)) {
    const slide = rememberMeta(pptx.addSlide(), meta);
    addHeader(slide, meta);
    addTitle(slide, slideSpec.title, meta);
    addBullets(slide, slideSpec.bullets);
    addFooter(slide, meta);
  }
  if (opts.addSignatureSlide !== false) addSignatureSlide(pptx, meta);
  const writer = pptx as unknown as { write(kind: 'nodebuffer'): Promise<Uint8Array | Buffer> };
  const output = await writer.write('nodebuffer');
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}
