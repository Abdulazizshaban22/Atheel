
import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StudioService {
  private readonly concepts: any[] = [];

  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  generateConcept(dto: any) {
    const item = {
      id: `stc_${randomUUID().slice(0,8)}`,
      projectId: dto?.projectId,
      organizationId: dto?.organizationId,
      title: 'طبقات الذاكرة الحية',
      territories: ['الهوية المكانية', 'الانغماس الحسي', 'الأثر الباقي'],
      promise: 'تجربة تجعل الزائر يشعر أن المكان يتكلم لا أنه يُعرض فقط.',
      audiences: Array.isArray(dto?.audiences) ? dto.audiences : ['زوار الثقافة', 'العائلات', 'الضيوف الدوليون'],
      constraints: Array.isArray(dto?.constraints) ? dto.constraints : [],
      createdAt: new Date().toISOString(),
    };
    this.concepts.unshift(item);
    return { ok: true, item };
  }

  composeNarrative(dto: any) {
    return {
      ok: true,
      narrative: {
        masterNarrative: `ينطلق ${dto?.conceptTitle || 'المشروع'} من فكرة أن المكان ليس وعاءً للحدث، بل شخصية تُقاد التجربة من داخلها.`,
        voice: 'ثقافية واضحة، هادئة، واثقة، غير متكلفة',
        storyArc: ['وصول', 'اكتشاف', 'تصاعد', 'ذروة', 'خاتمة', 'إرث'],
        signageTone: 'إرشادي شاعري منضبط',
        placeIdentity: dto?.placeIdentity || 'هوية مكانية أصيلة',
      },
    };
  }

  buildExperienceBlueprint(dto: any) {
    const zones = Array.isArray(dto?.zones) && dto.zones.length ? dto.zones : ['بوابة الوصول','المشهد التمهيدي','القلب التجريبي','الخاتمة'];
    const touchpoints = Array.isArray(dto?.touchpoints) && dto.touchpoints.length ? dto.touchpoints : ['لافتة', 'صوت', 'تفاعل رقمي', 'مضيف'];
    return {
      ok: true,
      blueprint: {
        title: dto?.title || 'Creative Studio Blueprint',
        phases: zones.map((z: string, i: number) => ({ order: i + 1, zone: z, intendedEmotion: i === 0 ? 'ترقب' : i === zones.length - 1 ? 'رضا' : 'انغماس' })),
        touchpoints,
        operationalHooks: ['crowd watch', 'narrative cue', 'photo moment', 'local commerce point'],
      },
    };
  }

  createAssetPack(dto: any) {
    return {
      ok: true,
      pack: {
        heroVisualPrompt: `مشهد بطابع ثقافي سعودي مع طبقات ضوء ومواد أصيلة يترجم مفهوم ${dto?.conceptTitle || 'الهوية الحية'}`,
        channels: Array.isArray(dto?.channels) ? dto.channels : ['onsite', 'social', 'wayfinding', 'board'],
        assets: ['hero copy set', 'wayfinding kit', 'social caption set', 'exhibit labels', 'board visual summary'],
      },
    };
  }

  checkConsistency(dto: any) {
    const artifacts = Array.isArray(dto?.artifacts) ? dto.artifacts : [];
    const score = Math.max(62, 92 - Math.max(0, artifacts.length - 4) * 3);
    return {
      ok: true,
      score,
      verdict: score >= 80 ? 'aligned' : 'needs_refinement',
      findings: [
        'السرد الرئيسي متماسك لكنه يحتاج تمييزًا أوضح بين لغة الإرشاد ولغة الإلهام.',
        'هناك فرصة لرفع حضور الهوية المكانية في المخرجات البصرية.',
      ],
    };
  }

  getCreativeBoard(projectId: string) {
    const concept = this.concepts.find((x) => x.projectId === projectId) || null;
    const jobs = await this.prisma.asyncJob.findMany({ kind: 'studio_refresh', entityId: projectId });
    return {
      ok: true,
      projectId,
      concept,
      jobs: jobs.slice(0,10),
      board: {
        pillars: ['الهوية', 'السرد', 'التجربة', 'التشغيل', 'الأثر'],
        recommendedDeliverables: ['concept sheet', 'narrative map', 'experience blueprint', 'asset pack', 'consistency report'],
      },
    };
  }

  refreshCreativeBoard(projectId: string, dto: any) {
    const id = `job_studio_${randomUUID().slice(0,8)}`;
    const now = new Date().toISOString();
    const queueMode = this.queue.getMode().mode === 'redis' ? 'redis' : 'sync';
    const payload = { projectId, ...dto };
    if (queueMode === 'sync') {
      const preview = this.getCreativeBoard(projectId);
      await this.prisma.asyncJob.upsert({ id, kind: 'studio_refresh', entityType: 'project', entityId: projectId, organizationId: dto?.organizationId, projectId: dto?.projectId || projectId, status: 'completed', queueMode, payload, result: preview as any, createdAt: now, updatedAt: now });
      return { ok: true, jobId: id, board: preview, mode: 'sync_inline' };
    }
    await this.prisma.asyncJob.upsert({ id, kind: 'studio_refresh', entityType: 'project', entityId: projectId, organizationId: dto?.organizationId, projectId: dto?.projectId || projectId, status: 'queued', queueMode, payload, createdAt: now, updatedAt: now });
    void this.queue.enqueueStudioRefresh({ jobId: id, projectId, organizationId: dto?.organizationId, payload: dto }).catch(() => undefined);
    return { ok: true, jobId: id, mode: 'queued_worker' };
  }

  processCreativeBoardJob(jobId: string) {
    const rec = await this.prisma.asyncJob.findUnique({ where: { id: jobId } });
    if (!rec || rec.kind !== 'studio_refresh') return { ok: false, reason: 'job_not_found' };
    const projectId = String((rec.payload as any)?.projectId || rec.entityId || '');
    await this.prisma.asyncJob.upsert({ ...rec, status: 'running', updatedAt: new Date().toISOString() });
    try {
      const preview = this.getCreativeBoard(projectId);
      const completed = { ...rec, status: 'completed' as const, result: preview as any, updatedAt: new Date().toISOString() };
      await this.prisma.asyncJob.upsert(completed);
      return { ok: true, job: completed };
    } catch (error: any) {
      const failed = { ...rec, status: 'failed' as const, result: { error: String(error?.message || error || 'failed') }, updatedAt: new Date().toISOString() };
      await this.prisma.asyncJob.upsert(failed);
      return { ok: false, job: failed };
    }
  }
}
