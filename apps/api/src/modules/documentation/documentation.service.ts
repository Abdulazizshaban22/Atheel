import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

const RULES = [
  { code: 'has_title', messageAr: 'يجب توفير عنوان واضح للأصل' },
  { code: 'has_source', messageAr: 'يجب ربط الأصل بمصدر موثوق أو تعريف المصدر' },
  { code: 'has_url', messageAr: 'يجب توفير رابط أو مرجع وصول للأصل' },
  { code: 'has_citation', messageAr: 'يجب وجود Citation ID لتثبيت المرجع داخل الملفات الرسمية' },
  { code: 'has_notes', messageAr: 'يوصى بإضافة ملاحظة سياقية قصيرة لتسهيل إعادة الاستخدام' },
];

@Injectable()
export class DocumentationService {
  constructor(private readonly prisma: PrismaService) {}

  rules() {
    return {
      contextAr: 'قواعد توثيق داخلية مستوحاة من أدلة وزارة الثقافة للتوثيق والأرشفة الرقمية، لضمان الاتساق قبل بناء سردية أو عرض.',
      items: RULES,
    };
  }

  listChecks(entityType?: string, entityId?: string) {
    const items = await this.prisma.documentationCheck.findMany({ where: { entityType, entityId } });
    return { returned: items.length, items: items.slice(0, 200) };
  }

  validateInspirationAsset(input: { assetId?: string; titleAr?: string; url?: string; sourceId?: string; citationId?: string; notesAr?: string }) {
    let asset = null as any;
    if (input.assetId) {
      asset = await this.prisma.inspirationAsset.findMany().find((a) => a.id === input.assetId) || null;
    }
    const model = asset || input;

    const issues: DocumentationCheckRecord['issues'] = [];
    if (!model?.titleAr) issues.push({ code: 'has_title', messageAr: RULES.find((r) => r.code === 'has_title')!.messageAr });
    if (!model?.sourceId) issues.push({ code: 'has_source', messageAr: RULES.find((r) => r.code === 'has_source')!.messageAr });
    if (!model?.url) issues.push({ code: 'has_url', messageAr: RULES.find((r) => r.code === 'has_url')!.messageAr });
    if (!model?.citationId) issues.push({ code: 'has_citation', messageAr: RULES.find((r) => r.code === 'has_citation')!.messageAr });
    if (!model?.notesAr) issues.push({ code: 'has_notes', messageAr: RULES.find((r) => r.code === 'has_notes')!.messageAr });

    const status: DocumentationCheckRecord['status'] = issues.length ? 'needs_fix' : 'pass';
    const row: DocumentationCheckRecord = {
      id: uid('docchk'),
      entityType: 'inspiration_asset',
      entityId: model?.id || input.assetId || 'unknown',
      status,
      issues,
      createdAt: new Date().toISOString(),
    };
    await this.prisma.documentationCheck.create({ data: row);

    return { ok: status === 'pass', check: row };
  }

  routesInventory() {
    try {
      const preferred = path.join(process.cwd(), '.artifacts', 'audit', 'api-routes-inventory.json');
      const legacy = path.join(process.cwd(), 'docs', 'api-routes-inventory.json');
      const target = fs.existsSync(preferred) ? preferred : legacy;
      if (!fs.existsSync(target)) return { ok: false, message: 'routes inventory not found' };
      const raw = fs.readFileSync(target, 'utf8');
      const json = JSON.parse(raw);
      return { ok: true, count: Array.isArray(json) ? json.length : 0, items: json };
    } catch {
      return { ok: false, message: 'failed to read routes inventory' };
    }
  }
}
