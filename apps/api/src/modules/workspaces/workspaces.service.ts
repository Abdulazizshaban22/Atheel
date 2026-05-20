import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function interpolate(template: string, vars: Record<string, unknown>) {
  return String(template || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

function normalizeText(v: unknown) {
  return String(v ?? '').trim().toLowerCase();
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query?: { organizationId?: string; status?: string; q?: string }) {
    const q = normalizeText(query?.q);
    return await this.prisma.workspace.findMany({}).filter((x) =>
      (!query?.organizationId || x.organizationId === query.organizationId) &&
      (!query?.status || x.status === query.status) &&
      (!q || x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q))
    );
  }

  getById(id: string) {
    const row = await this.prisma.workspace.findUnique({ where: { id: id } });
    if (!row) throw new NotFoundException('Workspace not found');
    const prompts = await this.prisma.promptTemplate.findMany().filter((p) => p.workspaceId === id && p.isActive);
    return { ...row, promptTemplatesCount: prompts.length, activePrompts: prompts.map((p) => ({ id: p.id, code: p.code, name: p.name, modelClass: p.modelClass, version: p.version })) };
  }

  create(body: any, user?: RequestUser) {
    const now = new Date().toISOString();
    const row = await this.prisma.workspace.create({ data: {
      id: uid('ws'),
      organizationId: body.organizationId,
      code: String(body.code || `WS-${Date.now()}`),
      name: String(body.name || 'New Workspace'),
      description: body.description ? String(body.description) : undefined,
      status: body.status || 'draft',
      defaultLanguage: body.defaultLanguage === 'en' ? 'en' : 'ar',
      settings: body.settings || { timezone: 'Asia/Riyadh', currency: 'SAR' },
      aiRoutingPolicy: body.aiRoutingPolicy || { defaultModelClass: 'balanced' },
      ragPolicy: body.ragPolicy || { topK: 5, minScore: 0.08 },
      guardrails: body.guardrails || { requireReviewForPublish: true },
      createdByUserId: user?.sub,
      createdAt: now,
      updatedAt: now,
    });
    return row;
  }

  update(id: string, body: any) {
    return await this.prisma.workspace.update({ where: { id: id }, data: {
      code: body.code,
      name: body.name,
      description: body.description,
      status: body.status,
      defaultLanguage: body.defaultLanguage,
      settings: body.settings,
      aiRoutingPolicy: body.aiRoutingPolicy,
      ragPolicy: body.ragPolicy,
      guardrails: body.guardrails,
    });
  }

  listPromptTemplates(query?: { workspaceId?: string; organizationId?: string; q?: string; activeOnly?: boolean }) {
    const q = normalizeText(query?.q);
    return await this.prisma.promptTemplate.findMany().filter((x) =>
      (!query?.workspaceId || x.workspaceId === query.workspaceId) &&
      (!query?.organizationId || x.organizationId === query.organizationId) &&
      (!query?.activeOnly || x.isActive) &&
      (!q || x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q) || x.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  createPromptTemplate(body: any, user?: RequestUser) {
    const now = new Date().toISOString();
    return await this.prisma.promptTemplate.create({ data: {
      id: uid('pt'),
      workspaceId: body.workspaceId,
      organizationId: body.organizationId,
      code: String(body.code || `template_${Date.now()}`),
      name: String(body.name || 'Prompt Template'),
      description: body.description ? String(body.description) : undefined,
      templateBody: String(body.templateBody || ''),
      inputSchema: body.inputSchema || undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      modelClass: body.modelClass === 'reasoning' ? 'reasoning' : body.modelClass === 'fast' ? 'fast' : 'balanced',
      isActive: body.isActive !== false,
      version: Number.isFinite(Number(body.version)) ? Number(body.version) : 1,
      createdByUserId: user?.sub,
      createdAt: now,
      updatedAt: now,
    });
  }

  updatePromptTemplate(id: string, body: any) {
    return await this.prisma.promptTemplate.update({ where: { id: id }, data: {
      code: body.code,
      name: body.name,
      description: body.description,
      templateBody: body.templateBody,
      inputSchema: body.inputSchema,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      modelClass: body.modelClass,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      version: Number.isFinite(Number(body.version)) ? Number(body.version) : undefined,
      workspaceId: body.workspaceId,
      organizationId: body.organizationId,
    });
  }

  renderTemplate(body: any) {
    const template = body.templateId ? await this.prisma.promptTemplate.findUnique({ where: { id: String(body.templateId } })) : this.listPromptTemplates({ q: body.code, activeOnly: true })[0];
    if (!template) throw new NotFoundException('Prompt template not found');
    const variables = (body.variables && typeof body.variables === 'object') ? body.variables : {};
    const rendered = interpolate(template.templateBody, variables);
    const unresolved = Array.from(new Set((template.templateBody.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || []).map((x) => x.replace(/[{}\s]/g, ''))))
      .filter((k) => variables[k] == null);
    return {
      template: { id: template.id, code: template.code, name: template.name, modelClass: template.modelClass, version: template.version },
      rendered,
      unresolvedVariables: unresolved,
      meta: {
        lengthChars: rendered.length,
        placeholdersMissingCount: unresolved.length,
        suggestedRuntime: unresolved.length ? 'manual_fix' : 'llm_ready',
      }
    };
  }

  simulateModelRouting(body: any) {
    const objective = String(body.objective || '');
    const complexity = String(body.complexity || 'standard');
    const requiresCitations = Boolean(body.requiresCitations);
    const latencySensitive = Boolean(body.latencySensitive);
    const tokenBudget = Number(body.tokenBudget || 1500);
    const low = objective.toLowerCase();

    let selected: 'fast' | 'balanced' | 'reasoning' = 'balanced';
    if (complexity === 'advanced' || requiresCitations || /حوكم|اعتماد|مخاطر|تحليل|reason/.test(low)) selected = 'reasoning';
    if (latencySensitive && !requiresCitations && complexity === 'starter') selected = 'fast';
    if (tokenBudget < 700 && !requiresCitations) selected = selected === 'reasoning' ? 'balanced' : selected;

    const alternatives = ['fast', 'balanced', 'reasoning'] as const;
    return {
      input: { objective, complexity, requiresCitations, latencySensitive, tokenBudget },
      selectedModelClass: selected,
      scorecard: alternatives.map((m) => ({
        modelClass: m,
        qualityScore: m === 'reasoning' ? 92 : m === 'balanced' ? 82 : 68,
        latencyScore: m === 'fast' ? 93 : m === 'balanced' ? 78 : 54,
        costScore: m === 'fast' ? 95 : m === 'balanced' ? 78 : 45,
        fitnessScore: Math.round(
          (m === selected ? 88 : (m === 'reasoning' && requiresCitations ? 80 : (m === 'fast' && latencySensitive ? 79 : 70)))
        ),
      })),
      rationaleAr: selected === 'reasoning'
        ? 'تم اختيار فئة reasoning لأن المهمة أعلى تعقيدًا أو تحتاج حوكمة/تسبيب/استشهادات.'
        : selected === 'fast'
          ? 'تم اختيار فئة fast لأن الطلب حساس للزمن وتعقيده منخفض.'
          : 'تم اختيار فئة balanced كحل متوازن بين الجودة والسرعة والتكلفة.'
    };
  }
}
