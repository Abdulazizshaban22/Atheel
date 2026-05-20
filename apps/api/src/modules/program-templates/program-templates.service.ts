import { Injectable, NotFoundException } from '@nestjs/common';
import { generateCulturalWorkflowCatalog, findWorkflowTemplate, instantiateWorkflow } from '@madar/workflow-kernel';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class ProgramTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const items = await this.prisma.programTemplate.findMany({});
    return { returned: items.length, items: items.slice(0, 200) };
  }

  get(id: string) {
    const tpl = await this.prisma.programTemplate.findMany({}).find((x) => x.id === id);
    if (!tpl) throw new NotFoundException('Template not found');
    return { ...tpl, manifest: safeJson(tpl.manifestJson) };
  }

  previewLink(ideaId?: string) {
    if (!ideaId) return { ok: false, reasonAr: 'ضع ideaId' };
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: ideaId } });
    if (!idea) return { ok: false, reasonAr: 'Idea غير موجودة' };
    return { ok: true, recommendation: `حوّل فكرة ${idea.titleAr} إلى برنامج عبر /program-templates/generate` };
  }

  generateFromIdea(input: { ideaId: string; organizationId?: string; domain?: string }) {
    const idea = await this.prisma.ideaVault.findUnique({ where: { id: input.ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');

    const now = new Date().toISOString();
    const code = `TPL-${idea.id.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Choose a compact set of workflows for the program: research, narrative, approval, delivery.
    const catalog = generateCulturalWorkflowCatalog();
    const pick = (contains: string) => catalog.find((t) => t.code.includes(contains))?.id;
    const selected = [pick('research'), pick('narrative'), pick('approval'), pick('delivery')].filter(Boolean) as string[];

    const manifest = {
      sourceIdeaId: idea.id,
      titleAr: idea.titleAr,
      oneLinerAr: idea.oneLinerAr,
      domain: input.domain || idea.domain,
      workflowTemplateIds: selected,
      deliverablesAr: idea.deliverablesAr,
      kpisAr: idea.kpisAr,
      risksAr: idea.risksAr,
      generatedAt: now,
    };

    const tpl: ProgramTemplateRecord = {
      id: uid('ptpl'),
      organizationId: input.organizationId || idea.organizationId,
      code,
      nameAr: `قالب برنامج: ${idea.titleAr}`,
      domain: input.domain || idea.domain,
      manifestJson: JSON.stringify(manifest),
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.programTemplate.create({ data: tpl);
    return { ok: true, template: tpl, manifest, selectedWorkflows: selected };
  }

  instantiateTemplate(templateId: string, input: { projectId?: string; organizationId?: string }) {
    const tpl = await this.prisma.programTemplate.findMany({}).find((x) => x.id === templateId);
    if (!tpl) throw new NotFoundException('Template not found');

    const manifest = safeJson(tpl.manifestJson) || {};
    const now = new Date().toISOString();

    const prog: ProgramRecord = {
      id: uid('prog'),
      organizationId: input.organizationId || tpl.organizationId,
      code: `PRG-${Date.now().toString(36).toUpperCase()}`,
      nameAr: tpl.nameAr,
      description: 'برنامج مولد تلقائياً من قالب ثقافي داخل أثيل',
      status: 'draft',
      strategicValueScore: 70,
      readinessScore: 25,
      portfolioValueSar: undefined,
      metadata: { templateId, manifest },
      projectIds: input.projectId ? [input.projectId] : [],
      workflowInstanceIds: [],
      createdByUserId: 'system',
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.program.create({ data: prog);

    const wfInstances: WorkflowInstanceRecord[] = [];
    for (const tId of (manifest.workflowTemplateIds || []) as string[]) {
      const wt = findWorkflowTemplate(tId);
      if (!wt) continue;
      const instance = instantiateWorkflow({ templateId: wt.id, organizationId: prog.organizationId, projectId: input.projectId, parameters: { language: 'ar', audienceSegment: ideaAudience(manifest) } });
      const row: WorkflowInstanceRecord = {
        id: uid('wfi'),
        templateId: wt.id,
        code: instance.code,
        nameAr: instance.nameAr,
        organizationId: prog.organizationId,
        projectId: input.projectId,
        status: 'active',
        parameters: instance.parameters as any,
        createdAt: now,
        updatedAt: now,
        createdByUserId: 'system',
      };
      await this.prisma.workflowInstance.create({ data: row);
      wfInstances.push(row);
      prog.workflowInstanceIds.push(row.id);
    }

    await this.prisma.program.update({ where: { id: prog.id }, data: { workflowInstanceIds: prog.workflowInstanceIds, readinessScore: 40 });

    return { ok: true, program: prog, workflowInstances: wfInstances };
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s || 'null');
  } catch {
    return null;
  }
}

function ideaAudience(manifest: any) {
  const a = (manifest.audienceAr || '').toString();
  if (!a) return 'public';
  if (a.includes('طلاب')) return 'students';
  if (a.includes('خبراء')) return 'experts';
  if (a.includes('عائلات')) return 'families';
  return 'public';
}
