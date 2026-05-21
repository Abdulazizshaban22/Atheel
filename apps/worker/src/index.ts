import { QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { request } from 'undici';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

// Optional OpenTelemetry bootstrap (no-op if OTEL_ENABLED is not true or deps are missing)
import './otel';

import { simulateTwinFlow } from '@madar/twin-kernel';
import { buildApprovalPacketSections } from '@madar/packet-kernel';
import { buildPptxFromMarkdown } from '@madar/doc-kernel';
import { impactScore, riskScore } from '@madar/innovation-kernel';

type ExecutionJob = {
  correlationId?: string | null;
  executionId: string;
  tick: {
    hasKnowledge?: boolean;
    hasApprovalActor?: boolean;
    autoApprove?: boolean;
    maxAutoSteps?: number;
  };
};

type EscalationJob = {
  correlationId?: string | null;
  kind?: 'workflow'|'approval'|'obligation';
  id?: string;
  executionId?: string; // legacy
  dueAt?: string;
};

type OutboxJob = {
  correlationId?: string | null;
  outboxId: string;
};

type ServiceOutboxJob = {
  correlationId?: string | null;
  serviceOutboxId: string;
};

type TwinSimJob = {
  correlationId?: string | null;
  runId: string;
};

type ExportJob = {
  correlationId?: string | null;
  exportJobId: string;
};

type PublishJob = {
  correlationId?: string | null;
  executionId?: string;
  stepId?: string;
  jobId?: string;
  projectId?: string;
  organizationId?: string;
};

type ReportJob = {
  correlationId?: string | null;
  executionId?: string;
  stepId?: string;
  jobId?: string;
  recommendationKind?: string;
  organizationId?: string;
  projectId?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

type CompetitionAnalyzeJob = {
  correlationId?: string | null;
  competitionId: string;
  attachmentId: string;
};

type RadarScanJob = {
  correlationId?: string | null;
  organizationId?: string | null;
};
type ObligationReminderJob = {
  correlationId?: string | null;
  obligationId: string;
  reminderId: string;
  remindAtIso?: string;
};


const QUEUE_NAME = process.env.QUEUE_NAME || 'atheel-workflow-executions';
const ESCALATION_QUEUE = process.env.ESCALATION_QUEUE || 'atheel-workflow-escalations';
const TWIN_SIM_QUEUE = process.env.TWIN_SIM_QUEUE || 'atheel-twin-simulations';
const EXPORT_QUEUE = process.env.EXPORT_QUEUE || 'atheel-exports';
const PUBLISH_QUEUE = process.env.PUBLISH_QUEUE || 'atheel-workflow-publish';
const REPORT_QUEUE = process.env.REPORT_QUEUE || 'atheel-workflow-report';
const COMPETITIONS_QUEUE = process.env.COMPETITIONS_QUEUE || 'atheel-competitions';
const RADAR_SCAN_QUEUE = process.env.RADAR_SCAN_QUEUE || 'atheel-radar-scan';
const OBLIGATIONS_QUEUE = process.env.OBLIGATIONS_QUEUE || 'atheel-obligations';
const OUTBOX_QUEUE = process.env.OUTBOX_QUEUE || 'atheel-outbox';
const SERVICE_OUTBOX_QUEUE = process.env.SERVICE_OUTBOX_QUEUE || 'atheel-service-outbox';

const REDIS_URL = (process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || '').toString().trim();
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_PREFIX = process.env.API_PREFIX || '/api';
function loadSecret(name: string) {
  const v = (process.env[name] || '').toString().trim();
  if (v) return v;
  const file = (process.env[`${name}_FILE`] || '').toString().trim();
  if (!file) return '';
  try {
    const data = require('node:fs').readFileSync(file, 'utf-8').toString().trim();
    if (data) process.env[name] = data;
    return data;
  } catch {
    return '';
  }
}

const WORKER_TOKEN = loadSecret('WORKER_TOKEN') || '';


function assertWorkerRuntimeReadiness() {
  const isProd = (process.env.NODE_ENV || '').toString().toLowerCase() === 'production';
  if (!isProd) return;
  if (!REDIS_URL) {
    throw new Error('Worker production requires REDIS_URL (or REDIS_CONNECTION_STRING).');
  }
  if (!WORKER_TOKEN) {
    throw new Error('Worker production requires WORKER_TOKEN.');
  }
}

assertWorkerRuntimeReadiness();
let ACTIVE_CORRELATION_ID = '';
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'runtime_artifacts';

function apiUrl(path: string) {
  const prefix = API_PREFIX.startsWith('/') ? API_PREFIX : `/${API_PREFIX}`;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${prefix}${p}`;
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const { body: resBody, statusCode } = await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} ${url}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text || '{}') as T;
}

async function getJsonWorker<T>(url: string): Promise<T> {
  const { body: resBody, statusCode } = await request(url, {
    method: 'GET',
    headers: { 'x-worker-token': WORKER_TOKEN, ...(ACTIVE_CORRELATION_ID ? { 'x-correlation-id': ACTIVE_CORRELATION_ID } : {}) },
  });
  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} ${url}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text || '{}') as T;
}

async function postJsonWorker<T>(url: string, body: any): Promise<T> {
  const corrFromBody = body && typeof body === 'object' ? String((body as any).correlationId || '') : '';
  if (corrFromBody) ACTIVE_CORRELATION_ID = corrFromBody;
  const { body: resBody, statusCode } = await request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-worker-token': WORKER_TOKEN,
      ...(ACTIVE_CORRELATION_ID ? { 'x-correlation-id': ACTIVE_CORRELATION_ID } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} ${url}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text || '{}') as T;
}


async function ensureDir(abs: string) {
  await fs.mkdir(abs, { recursive: true });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function writeArtifact(executionId: string, stepKey: string, fileName: string, buffer: Buffer) {
  const absDir = join(process.cwd(), ARTIFACTS_DIR, 'executions', executionId, stepKey);
  await ensureDir(absDir);
  const safe = safeName(fileName);
  const absPath = join(absDir, safe);
  await fs.writeFile(absPath, buffer);
  const relPath = `${ARTIFACTS_DIR}/executions/${executionId}/${stepKey}/${safe}`;
  return { absPath, storagePath: relPath, fileName: safe, sizeBytes: buffer.length };
}

async function writeJsonArtifact(executionId: string, stepKey: string, fileName: string, obj: any) {
  const buf = Buffer.from(JSON.stringify(obj, null, 2), 'utf8');
  return writeArtifact(executionId, stepKey, fileName, buf);
}

async function getExecution(executionId: string) {
  return getJson<any>(apiUrl(`/workflows/executions/${executionId}`));
}

async function getJson<T>(url: string): Promise<T> {
  const { body: resBody, statusCode } = await request(url, { method: 'GET' });
  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} ${url}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text || '{}') as T;
}


async function processAiDecisionJob(job: { jobId: string }) {
  return await postJsonWorker(apiUrl(`/ai/jobs/${job.jobId}/process`), {});
}

async function processTwinDecisionJob(job: { jobId: string }) {
  return await postJsonWorker(apiUrl(`/twin/jobs/${job.jobId}/process`), {});
}

async function processStudioRefreshJob(job: { jobId: string }) {
  return await postJsonWorker(apiUrl(`/studio/jobs/${job.jobId}/process`), {});
}

async function extractPdfPagesText(absPath: string) {
  // Prefer PDF.js (pdfjs-dist) for per-page extraction; fallback to pdf-parse.
  try {
    const mod: any = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdfjsLib: any = mod?.default || mod;
    const getDocument = pdfjsLib.getDocument || mod.getDocument;

    const data = new Uint8Array(await fs.readFile(absPath));
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    const numPages = Number(pdf.numPages || 0) || 0;
    const pages: Array<{ pageNumber: number; text: string }> = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: any[] = Array.isArray(content?.items) ? content.items : [];

      const words = items
        .map((it: any) => ({
          str: String(it?.str || '').trim(),
          x: Number(it?.transform?.[4] ?? 0),
          y: Number(it?.transform?.[5] ?? 0),
        }))
        .filter((w: any) => w.str);

      words.sort((a: any, b: any) => (b.y - a.y) || (a.x - b.x));

      const lines: string[] = [];
      let bucketY: number | null = null;
      let buf: string[] = [];

      const flush = () => {
        const s = buf.join(' ').replace(/\s+/g, ' ').trim();
        if (s) lines.push(s);
        buf = [];
      };

      for (const w of words) {
        const y = Math.round(w.y / 2) * 2;
        if (bucketY === null) bucketY = y;
        if (Math.abs(y - bucketY) > 3) {
          flush();
          bucketY = y;
        }
        buf.push(w.str);
      }
      flush();

      pages.push({ pageNumber: i, text: lines.join('\n') });
    }

    return { pages, info: { numPages } };
  } catch (e: any) {
    // Fallback: pdf-parse (single text). We'll send it as one page.
    const mod: any = await import('pdf-parse');
    const pdfParse = (mod?.default || mod?.PDFParse || mod) as any;
    const buf = await fs.readFile(absPath);
    const data = await pdfParse(buf);
    const t = String(data?.text || '');
    return { pages: [{ pageNumber: 1, text: t }], info: { numPages: data?.numpages || 1, fallback: 'pdf-parse' } };
  }
}

async function processCompetitionAnalyze(job: CompetitionAnalyzeJob) {
  const metaUrl = apiUrl(`/attachments/${job.attachmentId}/worker-meta`);
  const meta = await getJsonWorker<any>(metaUrl).catch(() => null);
  const item = meta?.item || meta;
  if (!item?.storagePath) throw new Error('Attachment storagePath missing');

  const absPath = join(process.cwd(), item.storagePath);
  const out = await extractPdfPagesText(absPath);

  const completeUrl = apiUrl(`/competitions/${job.competitionId}/analysis/complete`);
  return postJsonWorker<any>(completeUrl, {
    attachmentId: job.attachmentId,
    pages: out.pages,
    qualityHints: out.info,
  });
}

type RadarFinding = {
  titleAr: string;
  descriptionAr?: string | null;
  sourceTitle: string;
  sourceUrl: string;
  snippetAr?: string | null;
  metaJson: any;
  officialPriority: number;
  communityInterest: number;
  productionFeasibility: number;
  lossRisk: number;
};

function stripHtmlToText(html: string) {
  const s = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');

  return s
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function isCultural(text: string) {
  const t = (text || '').toLowerCase();
  const keys = ['مهرجان', 'كرنفال', 'فعالية', 'معرض', 'متحف', 'تراث', 'ثقاف', 'زائر', 'تجربة', 'جناح', 'بوث', 'مسرح', 'فعاليات', 'برنامج'];
  return keys.some((k) => t.includes(k.toLowerCase()));
}

async function fetchText(url: string, headers?: Record<string, string>) {
  const { body: resBody, statusCode } = await request(url, { method: 'GET', headers: headers || undefined });
  const html = await resBody.text();
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode}`);
  return html;
}

async function fetchJson(url: string, headers?: Record<string, string>) {
  const { body: resBody, statusCode } = await request(url, { method: 'GET', headers: headers || undefined });
  const text = await resBody.text();
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode} ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

function pickAfterLabel(text: string, label: string) {
  const re = new RegExp(label + "\\s*[:.،]*\\s*([^\\n;]+)", 'i');
  const m = re.exec(text);
  return m ? String(m[1] || '').trim() : '';
}

async function etimadVisitorConnector(maxItems = 12): Promise<RadarFinding[]> {
  // Official visitor pages (no generic HTML link harvesting)
  const base = 'https://tenders.etimad.sa';
  const listUrls = [
    `${base}/Tender/AllTendersForVisitor?PageNumber=1`,
    `${base}/Tender/AllTendersForVisitor?PageNumber=2`,
  ];

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const u of listUrls) {
    const html = await fetchText(u).catch(() => '');
    const re = /DetailsForVisitor\?STenderId=([^"'&\s]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const id = String(m[1] || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= maxItems) break;
    }
    if (ids.length >= maxItems) break;
  }

  const out: RadarFinding[] = [];
  for (const id of ids) {
    const detailsUrl = `${base}/Tender/DetailsForVisitor?STenderId=${encodeURIComponent(id)}`;
    const html = await fetchText(detailsUrl).catch(() => '');
    if (!html) continue;
    const txt = stripHtmlToText(html);

    const name = pickAfterLabel(txt, 'اسم المنافسة') || pickAfterLabel(txt, 'Tender Name') || '';
    const purpose = pickAfterLabel(txt, 'الغرض من المنافسة') || '';

    const inquiryDeadline =
      pickAfterLabel(txt, 'آخر موعد لإستلام الإستفسارات') ||
      pickAfterLabel(txt, 'اخر موعد لإستلام استفسارات الموردين') ||
      pickAfterLabel(txt, 'اخر موعد لإستلام استفسارات الموردين و إضافة الملحقات') ||
      '';
    const deadlineAt =
      pickAfterLabel(txt, 'آخر موعد لتقديم العروض') ||
      pickAfterLabel(txt, 'اخر موعد لإستلام العروض') ||
      pickAfterLabel(txt, 'اخر موعد لإستلام العروض, التاريخ') ||
      '';
    const openingAt =
      pickAfterLabel(txt, 'تاريخ ووقت فتح العروض') ||
      pickAfterLabel(txt, 'تاريخ ووقت فتح') ||
      '';

    let addendaCount: number | null = null;
    try {
      const mAdd = /(ملحقات|الملحقات)\s*[:.،]*\s*(\d+)/i.exec(txt);
      if (mAdd) addendaCount = Number(mAdd[2] || '0') || null;
    } catch {
      addendaCount = null;
    }


    const title = (name || purpose || '').trim();
    if (!title) continue;
    if (!isCultural(title + ' ' + purpose)) continue;

    const sourceKey = `etimad:${id}`;
    out.push({
      titleAr: title,
      descriptionAr: purpose || null,
      sourceTitle: 'Etimad Tenders (Visitor)',
      sourceUrl: detailsUrl,
      snippetAr: purpose ? purpose.slice(0, 160) : title.slice(0, 160),
      metaJson: { sourceKey, source: 'etimad', stenderId: id, url: detailsUrl, inquiryDeadlineAt: inquiryDeadline || null, deadlineAt: deadlineAt || null, openingAt: openingAt || null, addendaCount },
      officialPriority: 0.95,
      communityInterest: 0.55,
      productionFeasibility: 0.6,
      lossRisk: 0.35,
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

async function mocSupplierPortalConnector(): Promise<RadarFinding[]> {
  const urlAr = 'https://www.moc.gov.sa/ar/Modules/Pages/SupplierPortal/Competitions';
  const html = await fetchText(urlAr).catch(() => '');
  if (!html) return [];
  const txt = stripHtmlToText(html);

  // If no projects
  if (txt.includes('لا يوجد مشاريع')) return [];

  // Heuristic: find repeated blocks that contain locations / dates.
  const out: RadarFinding[] = [];
  const lines = txt.split(' ').join(' ').split(' . ').join(' ').split('  ').join(' ');

  // Try extracting any phrase after "المنافسات/المشاريع" that looks like a project name.
  // Fallback: we create one aggregated signal when parsing is uncertain.
  const title = 'فرص ومنافسات وزارة الثقافة (بوابة الموردين)';
  const sourceKey = `moc:supplier_portal:${new Date().toISOString().slice(0,10)}`;
  out.push({
    titleAr: title,
    descriptionAr: 'تم رصد تحديث في صفحة المنافسات/المشاريع ببوابة الموردين. راجع التفاصيل داخل البوابة.',
    sourceTitle: 'MoC Supplier Portal',
    sourceUrl: urlAr,
    snippetAr: null,
    metaJson: { sourceKey, source: 'moc', url: urlAr },
    officialPriority: 0.9,
    communityInterest: 0.5,
    productionFeasibility: 0.6,
    lossRisk: 0.3,
  });

  return out;
}

async function rcrcTendersConnector(maxItems = 10): Promise<RadarFinding[]> {
  const url = 'https://www.rcrc.gov.sa/en/tenders/';
  const html = await fetchText(url).catch(() => '');
  if (!html) return [];
  const txt = stripHtmlToText(html);

  // Extract tender titles heuristically
  const out: RadarFinding[] = [];
  const re = /(Tender\s*[:\-]\s*)([^\n]+?)(?=(Tender\s*[:\-])|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) {
    const title = String(m[2] || '').trim();
    if (!title) continue;
    if (!isCultural(title)) continue;
    const sourceKey = `rcrc:${title.toLowerCase().slice(0,120)}`;
    out.push({
      titleAr: title,
      descriptionAr: null,
      sourceTitle: 'RCRC Tenders',
      sourceUrl: url,
      snippetAr: title.slice(0, 160),
      metaJson: { sourceKey, source: 'rcrc', url },
      officialPriority: 0.9,
      communityInterest: 0.5,
      productionFeasibility: 0.6,
      lossRisk: 0.35,
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

function b64Key(input: string, maxLen = 48) {
  try {
    return Buffer.from(String(input || ''), 'utf8').toString('base64').replace(/=+$/g, '').slice(0, maxLen);
  } catch {
    return String(input || '').slice(0, maxLen);
  }
}

async function rcrcOpenDataConnector(maxItems = 10): Promise<RadarFinding[]> {
  // Use the official Opendatasoft Explore API (if relevant datasets exist)
  // We dynamically search datasets by keyword instead of hardcoding dataset IDs.
  const base = 'https://opendata.rcrc.gov.sa/api/explore/v2.1/catalog/datasets';
  const queries = ['tender', 'procurement', 'contract', 'competition'];

  const datasetMap = new Map<string, any>();
  for (const q of queries) {
    const url = `${base}?limit=25&offset=0&q=${encodeURIComponent(q)}`;
    const res = await getJson<any>(url).catch(() => null);
    const results: any[] = (res && (res.results || res.datasets)) || [];
    for (const d of results) {
      const id = String(d.dataset_id || d.datasetId || d.id || '').trim();
      if (!id) continue;
      datasetMap.set(id, d);
    }
  }

  // If search did not return, fallback to listing and filtering.
  if (datasetMap.size === 0) {
    const res = await getJson<any>(`${base}?limit=50&offset=0`).catch(() => null);
    const results: any[] = (res && (res.results || res.datasets)) || [];
    for (const d of results) {
      const id = String(d.dataset_id || d.datasetId || d.id || '').trim();
      if (!id) continue;
      const title = String(d?.metas?.default?.title || d?.metas?.title || d?.title || '').toLowerCase();
      const tags = Array.isArray(d?.metas?.default?.keywords) ? d.metas.default.keywords.join(' ').toLowerCase() : '';
      const hay = `${title} ${tags}`;
      if (queries.some((q) => hay.includes(q))) datasetMap.set(id, d);
    }
  }

  const datasetIds = Array.from(datasetMap.keys()).slice(0, 6);
  const out: RadarFinding[] = [];
  for (const datasetId of datasetIds) {
    const recUrl = `${base}/${encodeURIComponent(datasetId)}/records?limit=30`;
    const res = await getJson<any>(recUrl).catch(() => null);
    const rows: any[] = (res && (res.results || res.records)) || [];
    const datasetTitle = String(datasetMap.get(datasetId)?.metas?.default?.title || datasetMap.get(datasetId)?.title || datasetId);

    for (const r of rows) {
      // Opendatasoft v2.1 returns results with fields at root OR nested under 'record.fields'
      const fields = (r && (r.record?.fields || r.fields || r)) || {};
      const title = String(
        fields.title ||
          fields.name ||
          fields.tender ||
          fields.tender_name ||
          fields.project ||
          fields.project_name ||
          fields.subject ||
          fields.description ||
          ''
      ).trim();
      if (!title) continue;
      if (!isCultural(title)) continue;
      const sourceKey = `rcrc_od:${datasetId}:${b64Key(title, 40)}`;
      out.push({
        titleAr: title,
        descriptionAr: null,
        sourceTitle: `RCRC Open Data (${datasetTitle})`,
        sourceUrl: `https://opendata.rcrc.gov.sa/explore/dataset/${datasetId}/`,
        snippetAr: title.slice(0, 160),
        metaJson: { sourceKey, source: 'rcrc_opendata', datasetId, datasetTitle },
        officialPriority: 0.85,
        communityInterest: 0.45,
        productionFeasibility: 0.55,
        lossRisk: 0.25,
      });
      if (out.length >= maxItems) break;
    }
    if (out.length >= maxItems) break;
  }

  return out;
}

async function baladyTendersConnector(maxItems = 12): Promise<RadarFinding[]> {
  // Wave30: Prefer the official Balady open-data API (structured) when available.
  // Reference: Balady open data API integration document (momrah-services/open-data).
  // Fallback: parse the official tenders/procurement page.
  const openDataUrl = 'https://apiservices.balady.gov.sa/v1/momrah-services/open-data?items_per_page=50';
  const out: RadarFinding[] = [];
  const seen = new Set<string>();

  try {
    const data = await fetchJson(openDataUrl);
    const rows: any[] = data?.data?.result?.rows || data?.data?.result?.Rows || [];
    for (const r of rows) {
      const nid = String(r?.nid || '').trim();
      const title = String(r?.title || r?.Title || '').trim();
      const cat = String(r?.field_opendata_category || r?.category || '').trim();
      const changed = String(r?.changed || r?.changedAt || '').trim();
      const created = String(r?.created || '').trim();
      const files = Array.isArray(r?.field_file) ? r.field_file : Array.isArray(r?.files) ? r.files : [];
      const fileUrls = files.map((x: any) => String(x || '').trim()).filter(Boolean);

      if (!nid || !title) continue;

      // Only consider rows that smell like procurement/tenders/competitions.
      const tenderish = /منافس|مشتري|عطاء|توريد|تعاقد|tender|procurement|bid/i.test(`${title} ${cat}`);
      if (!tenderish) continue;

      // Cultural filter (our product focus).
      if (!isCultural(`${title} ${cat}`)) continue;

      const key = `balady_open_data:${nid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        titleAr: title,
        descriptionAr: cat || null,
        sourceTitle: 'Balady Open Data API',
        sourceUrl: openDataUrl,
        snippetAr: cat ? `${cat}`.slice(0, 160) : title.slice(0, 160),
        metaJson: {
          sourceKey: key,
          source: 'balady_open_data',
          url: 'https://balady.gov.sa/en/about-balady/tenders-and-procurement',
          changedAt: changed || null,
          createdAt: created || null,
          category: cat || null,
          attachments: fileUrls.map((u: string) => ({ url: u, name: null })),
        },
        officialPriority: 0.85,
        communityInterest: 0.45,
        productionFeasibility: 0.55,
        lossRisk: 0.25,
      });

      if (out.length >= maxItems) break;
    }
  } catch {
    // ignore and fallback
  }

  if (out.length > 0) return out;

  // Fallback: Official Balady tenders/procurement page (English). Parse deterministically.
  const url = 'https://balady.gov.sa/en/about-balady/tenders-and-procurement';
  const html = await fetchText(url).catch(() => '');
  if (!html) return [];
  const txt = stripHtmlToText(html);
  const lines = txt
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const idx = lines.findIndex((l) => /upcoming/i.test(l));
  const window = idx >= 0 ? lines.slice(idx, idx + 80) : lines;

  for (const l of window) {
    if (l.length < 12) continue;
    if (/privacy|terms|cookies|contact/i.test(l)) continue;
    if (/status|current|completed|upcoming/i.test(l)) continue;
    if (!isCultural(l)) continue;
    const key = b64Key(l, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    const sourceKey = `balady:${key}`;
    out.push({
      titleAr: l,
      descriptionAr: null,
      sourceTitle: 'Balady Tenders & Procurement',
      sourceUrl: url,
      snippetAr: l.slice(0, 160),
      metaJson: { sourceKey, source: 'balady', url },
      officialPriority: 0.8,
      communityInterest: 0.45,
      productionFeasibility: 0.55,
      lossRisk: 0.25,
    });
    if (out.length >= maxItems) break;
  }

  if (out.length === 0) {
    const sourceKey = `balady:page:${new Date().toISOString().slice(0, 10)}`;
    out.push({
      titleAr: 'فرص بلدي: منافسات ومشتريات (مؤشر رسمي)',
      descriptionAr: 'تم رصد صفحة بلدي للمنافسات والمشتريات. قد تتطلب الصفحة دخول/جلسة لعرض التفاصيل.',
      sourceTitle: 'Balady Tenders & Procurement',
      sourceUrl: url,
      snippetAr: null,
      metaJson: { sourceKey, source: 'balady', url, aggregated: true },
      officialPriority: 0.78,
      communityInterest: 0.4,
      productionFeasibility: 0.55,
      lossRisk: 0.2,
    });
  }

  return out;
}

async function etimadApiConnector(maxItems = 12): Promise<RadarFinding[]> {
  // Official Etimad Developer Portal exposes "Tenders Inquiry Service" as "Soon".
  // We support production integration by allowing the user to provide the live endpoint + token via env.
  const url = process.env.ETIMAD_TENDERS_API_URL || '';
  if (!url) return [];

  const token = process.env.ETIMAD_API_KEY || process.env.ETIMAD_BEARER || '';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (token) headers.authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  const { body: resBody, statusCode } = await request(url, { method: 'GET', headers });
  const text = await resBody.text();
  if (statusCode >= 400) return [];

  let data: any = null;
  try {
    data = JSON.parse(text || '{}');
  } catch {
    return [];
  }

  const items: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
  const out: RadarFinding[] = [];
  for (const it of items) {
    const name = String(it?.name || it?.title || it?.tenderName || it?.tender_name || '').trim();
    const desc = String(it?.description || it?.purpose || it?.tenderDescription || '').trim();
    const id = String(it?.id || it?.tenderId || it?.tender_id || name).trim();
    const fullTitle = (name || desc).trim();
    if (!fullTitle) continue;
    if (!isCultural(fullTitle + ' ' + desc)) continue;
    const sourceKey = `etimad_api:${b64Key(id || fullTitle, 40)}`;
    out.push({
      titleAr: fullTitle,
      descriptionAr: desc || null,
      sourceTitle: 'Etimad Tenders Inquiry API',
      sourceUrl: url,
      snippetAr: desc ? desc.slice(0, 160) : fullTitle.slice(0, 160),
      metaJson: { sourceKey, source: 'etimad_api', apiUrl: url, rawId: id },
      officialPriority: 0.98,
      communityInterest: 0.55,
      productionFeasibility: 0.65,
      lossRisk: 0.35,
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

async function ungmPublicConnector(maxItems = 10): Promise<RadarFinding[]> {
  const listUrl = 'https://www.ungm.org/public/notice';
  const html = await fetchText(listUrl).catch(() => '');
  if (!html) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  const re = /\/Public\/Notice\/(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = String(m[1] || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= maxItems) break;
  }

  const out: RadarFinding[] = [];
  for (const id of ids) {
    const url = `https://www.ungm.org/Public/Notice/${id}`;
    const h = await fetchText(url).catch(() => '');
    if (!h) continue;
    const txt = stripHtmlToText(h);
    
    
    // Try the first meaningful line (often the H1 title)
    const firstLine = txt.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
    const titleGuess = firstLine || txt.replace(/\n/g, ' ').split(' ').slice(0, 18).join(' ').trim();
    if (!titleGuess) continue;
    if (!isCultural(titleGuess)) continue;

    const sourceKey = `ungm:${id}`;
    out.push({
      titleAr: titleGuess,
      descriptionAr: null,
      sourceTitle: 'UNGM Public Notice',
      sourceUrl: url,
      snippetAr: titleGuess.slice(0, 160),
      metaJson: { sourceKey, source: 'ungm', noticeId: id, url },
      officialPriority: 0.7,
      communityInterest: 0.45,
      productionFeasibility: 0.55,
      lossRisk: 0.25,
    });
  }

  return out;
}

async function processRadarScan(job: RadarScanJob) {
  const connectors = (process.env.RADAR_CONNECTORS || 'etimad_api,etimad,moc,rcrc,rcrc_opendata,balady,ungm')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const findings: RadarFinding[] = [];

  for (const c of connectors) {
    try {
      if (c === 'etimad_api') findings.push(...(await etimadApiConnector()));
      else if (c === 'etimad') findings.push(...(await etimadVisitorConnector()));
      else if (c === 'moc') findings.push(...(await mocSupplierPortalConnector()));
      else if (c === 'rcrc') findings.push(...(await rcrcTendersConnector()));
      else if (c === 'rcrc_opendata') findings.push(...(await rcrcOpenDataConnector()));
      else if (c === 'balady') findings.push(...(await baladyTendersConnector()));
      else if (c === 'ungm') findings.push(...(await ungmPublicConnector()));
    } catch {
      // ignore
    }
    if (findings.length >= 40) break;
  }

  const ingestUrl = apiUrl('/radar/scan/ingest');
  return postJsonWorker<any>(ingestUrl, { organizationId: job.organizationId || null, items: findings.slice(0, 50) });
}

async function processObligationReminder(job: ObligationReminderJob) {
  const url = apiUrl(`/obligations/${job.obligationId}/reminders/${job.reminderId}/send`);
  return postJsonWorker<any>(url, { remindAtIso: job.remindAtIso || null });
}

async function processExecution(job: ExecutionJob) {
  const tickUrl = apiUrl(`/workflows/executions/${job.executionId}/tick`);

  // Wave07: execute a bounded loop per job to progress until waiting_input/completed/failed.
  const maxLoops = Number(process.env.WORKER_TICK_LOOPS || '3');
  let last: any = null;
  for (let i = 0; i < maxLoops; i++) {
    // Worker tick is a public endpoint but must be protected by X-Worker-Token.
    last = await postJsonWorker<any>(tickUrl, job.tick);
    const status = last?.execution?.status;
    if (!status) break;
    if (status === 'waiting_input' || status === 'completed' || status === 'failed' || status === 'paused') break;
  }
  return last;
}



async function processTwinSimulation(job: TwinSimJob) {
  const url = apiUrl(`/twin/simulations/${job.runId}/run`);
  const result = await postJson<any>(url, {});
  return result;
}

async function processEscalation(job: EscalationJob) {
  const kind = (job.kind || (job.executionId ? 'workflow' : 'workflow')) as any;
  const id = (job.id || job.executionId) as string;
  if (!id) throw new Error('missing escalation id');

  const url =
    kind === 'approval'
      ? apiUrl(`/escalations/approvals/${id}`)
      : kind === 'obligation'
        ? apiUrl(`/obligations/${id}/escalate`)
        : apiUrl(`/workflows/worker/executions/${id}/escalate`);

  const result = await postJsonWorker<any>(url, {});
  return result;
}

async function processOutbox(job: OutboxJob) {
  const url = apiUrl(`/outbox/${job.outboxId}/dispatch`);
  const result = await postJsonWorker<any>(url, {});
  return result;
}

async function processServiceOutbox(job: ServiceOutboxJob) {
  const url = apiUrl(`/service-outbox/${job.serviceOutboxId}/dispatch`);
  const result = await postJsonWorker<any>(url, {});
  return result;
}

async function processExport(job: ExportJob) {
  const url = apiUrl(`/exports/jobs/${job.exportJobId}/run`);
  const { body: resBody, statusCode } = await request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-worker-token': WORKER_TOKEN,
    },
    body: JSON.stringify({}),
  });
  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} ${url}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text || '{}');
}

async function processPublish(job: PublishJob, meta: { attempt: number; jobId?: string | number }) {
  const { execution } = await getExecution(job.executionId);
  const twinGraph = execution?.inputs?.twinGraph;
  const profile = execution?.inputs?.simulationProfile;

  const idempotencyKey = `publish_${job.executionId}_${job.stepId}`;

  if (!twinGraph || !profile) {
    const out = { delivery_bundle: { ok: true, noteAr: 'لا توجد بيانات Twin للتوليد الكامل؛ تم إخراج تسليم افتراضي.' } };
    return postJsonWorker<any>(apiUrl(`/workflows/executions/${job.executionId}/steps/${job.stepId}/complete`), {
      output: out,
      noteAr: 'اكتمل نشر افتراضي عبر العامل',
      idempotencyKey,
      attempt: meta.attempt,
      job: { queue: PUBLISH_QUEUE, jobId: meta.jobId },
    });
  }

  const sim = simulateTwinFlow({
    runId: `sim_${Math.random().toString(36).slice(2, 10)}`,
    twinId: String(execution?.inputs?.twinId || 'twin'),
    graph: twinGraph,
    profile,
    seed: Number(execution?.inputs?.seed ?? 1337),
  });

  const sections = buildApprovalPacketSections({
    titleAr: String(execution?.inputs?.packetTitleAr || 'حزمة اعتماد'),
    experienceTitleAr: String(execution?.inputs?.experienceTitleAr || 'التجربة'),
    twinNameAr: String(execution?.inputs?.twinNameAr || 'التوأم الرقمي'),
    scenarioKey: String(execution?.inputs?.scenarioKey || 'baseline'),
    scenarioNotesAr: String(execution?.inputs?.scenarioNotesAr || ''),
    generatedAtIso: new Date().toISOString(),
    kpis: {
      visitorsSimulated: sim.totals.visitorsSimulated,
      completedVisitors: sim.totals.completedVisitors,
      avgTotalTimeSeconds: sim.totals.avgTotalTimeSeconds,
      avgWaitSeconds: sim.totals.avgWaitSeconds,
      avgTravelSeconds: sim.totals.avgTravelSeconds,
      congestionScore0to100: sim.kpis.congestionScore0to100,
      completionRatePct: sim.kpis.completionRatePct,
      predictedSatisfaction0to100: sim.kpis.predictedSatisfaction0to100,
    },
    bottlenecks: sim.bottlenecks.map((b: any) => ({
      nodeId: b.nodeId,
      nameAr: b.nameAr,
      peakUtilizationPct: b.peakUtilizationPct,
      avgWaitSeconds: b.avgWaitSeconds,
    })),
    profile,
    citations: Array.isArray(execution?.inputs?.citations) ? execution?.inputs?.citations : [],
  } as any);

  const deckMd = (sections as any)?.artifacts?.eventDeckOutlineMarkdown || '# عرض';
  const pptxBuf = await buildPptxFromMarkdown(deckMd, {
    templateMeta: {
      orgNameAr: String(execution?.inputs?.orgNameAr || 'الجهة'),
      reportTitleAr: String(execution?.inputs?.packetTitleAr || 'حزمة اعتماد'),
      reportSubtitleAr: String(execution?.inputs?.experienceTitleAr || ''),
      versionLabel: 'v1',
      confidentialityLabelAr: 'سري داخلي',
      generatedAtIso: new Date().toISOString(),
      approvals: { statusAr: 'قيد المراجعة', signers: [] },
    },
  } as any);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const pptxFile = await writeArtifact(job.executionId, 'publish', `approval_deck_${stamp}.pptx`, pptxBuf);
  const simFile = await writeJsonArtifact(job.executionId, 'publish', `twin_simulation_${stamp}.json`, sim);
  const packetFile = await writeJsonArtifact(job.executionId, 'publish', `approval_packet_${stamp}.json`, sections);

  const out = {
    delivery_bundle: {
      twinSimulation: {
        summary: { totals: sim.totals, kpis: sim.kpis, bottlenecksCount: (sim.bottlenecks || []).length },
        file: { storagePath: simFile.storagePath, fileName: simFile.fileName, mimeType: 'application/json', sizeBytes: simFile.sizeBytes },
      },
      approvalPacket: {
        titleAr: String(execution?.inputs?.packetTitleAr || 'حزمة اعتماد'),
        file: { storagePath: packetFile.storagePath, fileName: packetFile.fileName, mimeType: 'application/json', sizeBytes: packetFile.sizeBytes },
      },
      pptx: {
        fileName: pptxFile.fileName,
        storagePath: pptxFile.storagePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sizeBytes: pptxFile.sizeBytes,
      },
      noteAr: 'تم توليد الحزمة وحفظها كملفات بدل Base64 داخل التنفيذ.',
    },
  };

  return postJsonWorker<any>(apiUrl(`/workflows/executions/${job.executionId}/steps/${job.stepId}/complete`), {
    output: out,
    noteAr: 'اكتمل النشر عبر العامل وتوليد الملفات',
    idempotencyKey,
    attempt: meta.attempt,
    job: { queue: PUBLISH_QUEUE, jobId: meta.jobId },
  });
}

async function processReport(job: ReportJob, meta: { attempt: number; jobId?: string | number }) {
  const { execution } = await getExecution(job.executionId);
  const idempotencyKey = `report_${job.executionId}_${job.stepId}`;

  const pub: any = execution?.outputs?.publish;
  let sim: any = pub?.delivery_bundle?.twinSimulation;

  // If publish stored simulation as a file, load it.
  const simPath = pub?.delivery_bundle?.twinSimulation?.file?.storagePath;
  if (simPath) {
    const abs = join(process.cwd(), simPath);
    const txt = await fs.readFile(abs, 'utf8');
    sim = JSON.parse(txt);
  }

  if (!sim || !sim.kpis) {
    const out = { run_metrics: { noteAr: 'لا توجد محاكاة مرتبطة؛ تم تسجيل مؤشرات افتراضية.' } };
    return postJsonWorker<any>(apiUrl(`/workflows/executions/${job.executionId}/steps/${job.stepId}/complete`), {
      output: out,
      noteAr: 'اكتمل تقرير افتراضي عبر العامل',
      idempotencyKey,
      attempt: meta.attempt,
      job: { queue: REPORT_QUEUE, jobId: meta.jobId },
    });
  }

  const impact = impactScore({
    completionRate: (sim.kpis.completionRatePct || 0) / 100,
    predictedSatisfaction: sim.kpis.predictedSatisfaction0to100 || 0,
    engagementMinutes: Math.max(1, (sim.totals.avgTotalTimeSeconds || 0) / 60),
    learningMoments: Number(execution?.inputs?.learningMoments ?? 4),
    shareIntent: Number(execution?.inputs?.shareIntent ?? 55),
    revisitIntent: Number(execution?.inputs?.revisitIntent ?? 60),
  });

  const risk = riskScore({
    congestionScore: sim.kpis.congestionScore0to100 || 0,
    hazardNodes: Number(execution?.inputs?.hazardNodes ?? 0),
    closedNodes: Array.isArray(execution?.inputs?.simulationProfile?.closedNodeIds) ? execution.inputs.simulationProfile.closedNodeIds.length : 0,
    complianceMissing: Number(execution?.inputs?.complianceMissing ?? 0),
    crowdPeakOccupancy: Math.max(...(sim.bottlenecks || []).map((b: any) => Number(b.peakOccupancy || 0)), 0),
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = await writeJsonArtifact(job.executionId, 'report', `run_metrics_${stamp}.json`, { impact, risk, simRef: simPath || 'inline' });

  const out = {
    run_metrics: {
      impact,
      risk,
      artifacts: {
        file: { storagePath: reportFile.storagePath, fileName: reportFile.fileName, mimeType: 'application/json', sizeBytes: reportFile.sizeBytes },
      },
      noteAr: 'تم حساب أثر ومخاطر اعتمادًا على نتائج المحاكاة (ومخرجات محفوظة كملف).',
    },
  };

  return postJsonWorker<any>(apiUrl(`/workflows/executions/${job.executionId}/steps/${job.stepId}/complete`), {
    output: out,
    noteAr: 'اكتمل التقرير عبر العامل',
    idempotencyKey,
    attempt: meta.attempt,
    job: { queue: REPORT_QUEUE, jobId: meta.jobId },
  });
}


async function bootstrap() {
  const effectiveRedisUrl = REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(effectiveRedisUrl, { maxRetriesPerRequest: null });

  // Queue events for observability
  const events = new QueueEvents(QUEUE_NAME, { connection });
  events.on('failed', ({ jobId, failedReason }) => {
    console.error('[QueueEvents] failed', { jobId, failedReason });
  });
  events.on('completed', ({ jobId }) => {
    console.log('[QueueEvents] completed', { jobId });
  });

  // Worker for executions
  const worker = new Worker<ExecutionJob>(
    QUEUE_NAME,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      const out = await processExecution(job.data);
      const ms = Date.now() - started;
      console.log('[Worker] execution processed', { executionId: job.data.executionId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY || '4'),
    },
  );

  worker.on('failed', (job, err) => {
    console.error('[Worker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for escalations
  const escalationWorker = new Worker<EscalationJob>(
    ESCALATION_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const out = await processEscalation(job.data);
      console.log('[Worker] escalation processed', { executionId: job.data.executionId });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.ESCALATION_CONCURRENCY || '2'),
    },
  );

  escalationWorker.on('failed', (job, err) => {
    console.error('[EscalationWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for outbox dispatch
  const outboxWorker = new Worker<OutboxJob>(
    OUTBOX_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const out = await processOutbox(job.data);
      console.log('[Worker] outbox dispatched', { outboxId: job.data.outboxId });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.OUTBOX_CONCURRENCY || '2'),
    },
  );

  outboxWorker.on('failed', (job, err) => {
    console.error('[OutboxWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for internal service-outbox dispatch
  const serviceOutboxWorker = new Worker<ServiceOutboxJob>(
    SERVICE_OUTBOX_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const out = await processServiceOutbox(job.data);
      console.log('[Worker] service-outbox dispatched', { serviceOutboxId: job.data.serviceOutboxId });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.SERVICE_OUTBOX_CONCURRENCY || '2'),
    },
  );

  serviceOutboxWorker.on('failed', (job, err) => {
    console.error('[ServiceOutboxWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for Twin simulations
  const twinEvents = new QueueEvents(TWIN_SIM_QUEUE, { connection });
  twinEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[TwinQueueEvents] failed', { jobId, failedReason });
  });
  twinEvents.on('completed', ({ jobId }) => {
    console.log('[TwinQueueEvents] completed', { jobId });
  });

  const twinSimWorker = new Worker<any>(
    TWIN_SIM_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      let out: any;
      if (job.name === 'decision_summary' || (job.data && job.data.jobId && job.data.twinId)) {
        out = await processTwinDecisionJob({ jobId: String(job.data.jobId) });
        const ms = Date.now() - started;
        console.log('[TwinWorker] decision summary processed', { jobId: job.data.jobId, twinId: job.data.twinId, ms });
        return out;
      }
      out = await processTwinSimulation(job.data);
      const ms = Date.now() - started;
      console.log('[TwinWorker] simulation processed', { runId: job.data.runId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.TWIN_SIM_CONCURRENCY || '2'),
    },
  );

  twinSimWorker.on('failed', (job, err) => {
    console.error('[TwinWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for exports
  const exportEvents = new QueueEvents(EXPORT_QUEUE, { connection });
  exportEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[ExportQueueEvents] failed', { jobId, failedReason });
  });
  exportEvents.on('completed', ({ jobId }) => {
    console.log('[ExportQueueEvents] completed', { jobId });
  });

  const exportWorker = new Worker<ExportJob>(
    EXPORT_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      const out = await processExport(job.data);
      const ms = Date.now() - started;
      console.log('[ExportWorker] export processed', { exportJobId: job.data.exportJobId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.EXPORT_CONCURRENCY || '1'),
    },
  );

  exportWorker.on('failed', (job, err) => {
    console.error('[ExportWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for Publish
  const publishEvents = new QueueEvents(PUBLISH_QUEUE, { connection });
  publishEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[PublishQueueEvents] failed', { jobId, failedReason });
  });
  publishEvents.on('completed', ({ jobId }) => {
    console.log('[PublishQueueEvents] completed', { jobId });
  });

  const publishWorker = new Worker<PublishJob>(
    PUBLISH_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      if (job.name === 'studio_refresh' || (job.data && job.data.jobId && job.data.projectId)) {
        const out = await processStudioRefreshJob({ jobId: String(job.data.jobId) });
        const ms = Date.now() - started;
        console.log('[PublishWorker] studio refresh processed', { jobId: job.data.jobId, projectId: job.data.projectId, ms });
        return out;
      }
      const out = await processPublish(job.data as any, { attempt: job.attemptsMade || 0, jobId: job.id });
      const ms = Date.now() - started;
      console.log('[PublishWorker] processed', { executionId: job.data.executionId, stepId: job.data.stepId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.PUBLISH_CONCURRENCY || '1'),
    },
  );

  publishWorker.on('failed', (job, err) => {
    console.error('[PublishWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for Report
  const reportEvents = new QueueEvents(REPORT_QUEUE, { connection });
  reportEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[ReportQueueEvents] failed', { jobId, failedReason });
  });
  reportEvents.on('completed', ({ jobId }) => {
    console.log('[ReportQueueEvents] completed', { jobId });
  });

  const reportWorker = new Worker<ReportJob>(
    REPORT_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      if (job.name === 'ai_decision' || (job.data && job.data.jobId && job.data.recommendationKind)) {
        const out = await processAiDecisionJob({ jobId: String(job.data.jobId) });
        const ms = Date.now() - started;
        console.log('[ReportWorker] ai decision processed', { jobId: job.data.jobId, kind: job.data.recommendationKind, ms });
        return out;
      }
      const out = await processReport(job.data as any, { attempt: job.attemptsMade || 0, jobId: job.id });
      const ms = Date.now() - started;
      console.log('[ReportWorker] processed', { executionId: job.data.executionId, stepId: job.data.stepId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.REPORT_CONCURRENCY || '1'),
    },
  );

  reportWorker.on('failed', (job, err) => {
    console.error('[ReportWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for Competitions (Wave26)
  const compEvents = new QueueEvents(COMPETITIONS_QUEUE, { connection });
  compEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[CompetitionsQueueEvents] failed', { jobId, failedReason });
  });
  compEvents.on('completed', ({ jobId }) => {
    console.log('[CompetitionsQueueEvents] completed', { jobId });
  });

  const competitionsWorker = new Worker<CompetitionAnalyzeJob>(
    COMPETITIONS_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      const out = await processCompetitionAnalyze(job.data);
      const ms = Date.now() - started;
      console.log('[CompetitionsWorker] analyzed', { competitionId: job.data.competitionId, attachmentId: job.data.attachmentId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.COMPETITIONS_CONCURRENCY || '1'),
    },
  );

  competitionsWorker.on('failed', (job, err) => {
    console.error('[CompetitionsWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for Radar scans (Wave26)
  const radarEvents = new QueueEvents(RADAR_SCAN_QUEUE, { connection });
  radarEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[RadarScanQueueEvents] failed', { jobId, failedReason });
  });
  radarEvents.on('completed', ({ jobId }) => {
    console.log('[RadarScanQueueEvents] completed', { jobId });
  });

  const radarScanWorker = new Worker<RadarScanJob>(
    RADAR_SCAN_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      const out = await processRadarScan(job.data);
      const ms = Date.now() - started;
      console.log('[RadarScanWorker] scanned', { organizationId: job.data.organizationId || null, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.RADAR_SCAN_CONCURRENCY || '1'),
    },
  );

  radarScanWorker.on('failed', (job, err) => {
    console.error('[RadarScanWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Worker for obligation reminders (Wave29)
  const oblEvents = new QueueEvents(OBLIGATIONS_QUEUE, { connection });
  oblEvents.on('failed', ({ jobId, failedReason }) => {
    console.error('[ObligationsQueueEvents] failed', { jobId, failedReason });
  });
  oblEvents.on('completed', ({ jobId }) => {
    console.log('[ObligationsQueueEvents] completed', { jobId });
  });

  const obligationsWorker = new Worker<ObligationReminderJob>(
    OBLIGATIONS_QUEUE,
    async (job) => {
      ACTIVE_CORRELATION_ID = String((job as any)?.data?.correlationId || '');
      const started = Date.now();
      const out = await processObligationReminder(job.data);
      const ms = Date.now() - started;
      console.log('[ObligationsWorker] reminded', { obligationId: job.data.obligationId, reminderId: job.data.reminderId, ms });
      return out;
    },
    {
      connection,
      concurrency: Number(process.env.OBLIGATIONS_CONCURRENCY || '1'),
    },
  );

  obligationsWorker.on('failed', (job, err) => {
    console.error('[ObligationsWorker] failed', { jobId: job?.id, err: err?.message });
  });

  // Optional: sanity health ping
  try {
    const health = await getJson<any>(apiUrl('/health'));
    console.log('[Worker] API health', health);
  } catch (e: any) {
    console.warn('[Worker] API health check failed (non-blocking)', e?.message);
  }

  console.log('[Worker] ready', { QUEUE_NAME, ESCALATION_QUEUE, TWIN_SIM_QUEUE, EXPORT_QUEUE, PUBLISH_QUEUE, REPORT_QUEUE, COMPETITIONS_QUEUE, RADAR_SCAN_QUEUE, OBLIGATIONS_QUEUE, OUTBOX_QUEUE, SERVICE_OUTBOX_QUEUE, REDIS_URL, API_BASE_URL, API_PREFIX, ARTIFACTS_DIR });
}

bootstrap().catch((err) => {
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
