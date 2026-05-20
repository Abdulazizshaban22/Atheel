import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { riskScore } from '@madar/innovation-kernel';
import {
  InspirationAssetRecord,
  RiskRecord,
  TwinNodeRecord,
  TwinRecord,
  TwinSimulationRecord,
import { randomUUID } from 'node:crypto';
import { throwIfProdDbError } from '../../common/db-fallback';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

const TEMPLATES = [
  {
    code: 'crowd_congestion',
    category: 'operations',
    titleAr: 'ازدحام وتكدس في المسار',
    descriptionAr: 'ارتفاع الانتظار أو تجاوز الطاقة الاستيعابية في نقاط محددة يؤدي إلى تدهور التجربة ومخاطر سلامة.',
  },
  {
    code: 'heritage_sensitivity',
    category: 'heritage',
    titleAr: 'حساسية تراثية تتطلب حماية',
    descriptionAr: 'تلامس مباشر أو تصوير/سلوك غير مناسب في موقع تراثي حساس.',
  },
  {
    code: 'compliance_gaps',
    category: 'compliance',
    titleAr: 'نقص امتثال أو توثيق',
    descriptionAr: 'غياب بيانات المصدر والترخيص أو نموذج التوثيق للأصول قبل العرض.',
  },
] as const;

type RiskLevel = RiskRecord['level'];
type RiskCategory = RiskRecord['category'];
type RiskStatus = RiskRecord['status'];
type RiskWhere = {
  organizationId?: string;
  projectId?: string;
  experienceId?: string;
  twinId?: string;
};

type RiskDbRecord = RiskRecord & Record<string, unknown>;
type DbTwinRecord = Pick<TwinRecord, 'id' | 'organizationId' | 'projectId'> & Record<string, unknown>;
type DbTwinNodeRecord = Pick<TwinNodeRecord, 'kind' | 'capacity'> & Record<string, unknown>;
type DbTwinSimulationRecord = Pick<TwinSimulationRecord, 'id' | 'resultJson' | 'status' | 'updatedAt'> & Record<string, unknown>;
type DbInspirationAssetRecord = Pick<InspirationAssetRecord, 'notesAr'> & Record<string, unknown>;

interface RisksPrismaFacade {
  risk: {
    findMany(args: { where: RiskWhere; orderBy: { updatedAt: 'desc' }; take: number }): Promise<RiskDbRecord[]>;
    create(args: { data: Record<string, unknown> }): Promise<RiskDbRecord>;
  };
  twin: {
    findUnique(args: { where: { id: string } }): Promise<DbTwinRecord | null>;
  };
  twinNode: {
    findMany(args: { where: { twinId: string } }): Promise<DbTwinNodeRecord[]>;
  };
  twinSimulationRun: {
    findUnique(args: { where: { id: string } }): Promise<DbTwinSimulationRecord | null>;
    findFirst(args: { where: { twinId: string; status: 'completed' }; orderBy: { updatedAt: 'desc' } }): Promise<DbTwinSimulationRecord | null>;
  };
  inspirationAsset: {
    count(args: { where: { organizationId: string; notesAr: null } }): Promise<number>;
  };
}

@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  listTemplates() {
    return { items: TEMPLATES };
  }

  async listRegister(params?: { organizationId?: string; projectId?: string; experienceId?: string; twinId?: string }) {
    const where: RiskWhere = {
      organizationId: params?.organizationId || undefined,
      projectId: params?.projectId || undefined,
      experienceId: params?.experienceId || undefined,
      twinId: params?.twinId || undefined,
    };

    try {
      const items = await this.prismaClient.risk.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200 });
      return { returned: items.length, items };
    } catch (err) {
      throwIfProdDbError(err, 'RisksService.listRegister');
      const items = await this.prisma.risk.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
      return { returned: items.length, items: items.slice(0, 200) };
    }
  }

  async createRisk(input: Partial<RiskRecord>) {
    const now = new Date().toISOString();
    const likelihood = Math.max(1, Math.min(5, Number(input.likelihood1to5 || 3)));
    const impact = Math.max(1, Math.min(5, Number(input.impact1to5 || 3)));
    const score = likelihood * impact;
    const level = normalizeRiskLevel(score >= 16 ? 'high' : score >= 9 ? 'medium' : 'low');

    const row: RiskRecord = {
      id: uid('risk'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      experienceId: input.experienceId,
      twinId: input.twinId,
      category: normalizeRiskCategory(input.category),
      titleAr: input.titleAr || 'مخاطر تشغيلية',
      descriptionAr: input.descriptionAr,
      likelihood1to5: likelihood,
      impact1to5: impact,
      score,
      level,
      mitigationAr: input.mitigationAr,
      ownerAr: input.ownerAr,
      status: normalizeRiskStatus(input.status),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await this.prismaClient.risk.create({
        data: {
          id: row.id,
          organizationId: row.organizationId || null,
          projectId: row.projectId || null,
          experienceId: row.experienceId || null,
          twinId: row.twinId || null,
          category: row.category,
          titleAr: row.titleAr,
          descriptionAr: row.descriptionAr || null,
          likelihood1to5: row.likelihood1to5,
          impact1to5: row.impact1to5,
          score: row.score,
          level: row.level,
          mitigationAr: row.mitigationAr || null,
          ownerAr: row.ownerAr || null,
          status: row.status,
        },
      });
      return { ok: true, risk: created };
    } catch (err) {
      throwIfProdDbError(err, 'RisksService.createRisk');
      await this.prisma.risk.create({ data: row);
      return { ok: true, risk: row, note: 'fallback_in_memory' };
    }
  }

  async assessTwin(input: { twinId: string; simulationRunId?: string; projectId?: string; experienceId?: string; organizationId?: string }) {
    try {
      const twin = await this.prismaClient.twin.findUnique({ where: { id: input.twinId } });
      if (!twin) throw new NotFoundException('Twin not found');

      const nodes = await this.prismaClient.twinNode.findMany({ where: { twinId: input.twinId } });
      const hazardNodes = nodes.filter((node) => node.kind === 'hazard').length;

      let sim: DbTwinSimulationRecord | null = null;
      if (input.simulationRunId) {
        sim = await this.prismaClient.twinSimulationRun.findUnique({ where: { id: input.simulationRunId } });
      }
      if (!sim) {
        sim = await this.prismaClient.twinSimulationRun.findFirst({
          where: { twinId: input.twinId, status: 'completed' },
          orderBy: { updatedAt: 'desc' },
        });
      }

      const result = sim ? safeJson(sim.resultJson) : null;
      const kpis = readKpiBag(result);
      const congestionScore = Number(kpis.congestionScore0to100 || 0) || 0;
      const peakOcc = Math.max(0, ...nodes.map((node) => Number(node.capacity || 0)));

      const orgId = input.organizationId || twin.organizationId || undefined;
      const missingDocumentation = orgId
        ? await this.prismaClient.inspirationAsset.count({ where: { organizationId: orgId, notesAr: null } })
        : 0;

      const auto = riskScore({
        congestionScore,
        hazardNodes,
        closedNodes: 0,
        complianceMissing: missingDocumentation,
        crowdPeakOccupancy: peakOcc,
      });

      const now = new Date().toISOString();
      const risk: RiskRecord = {
        id: `risk_${randomUUID().slice(0, 10)}`,
        organizationId: orgId,
        projectId: input.projectId || twin.projectId || undefined,
        experienceId: input.experienceId,
        twinId: input.twinId,
        category: 'operations',
        titleAr: 'تقييم آلي للمخاطر بناءً على المحاكاة',
        descriptionAr: `مؤشر ازدحام=${congestionScore}/100، نقاط خطر=${hazardNodes}، نقص توثيق=${missingDocumentation}`,
        likelihood1to5: auto.level === 'high' ? 4 : auto.level === 'medium' ? 3 : 2,
        impact1to5: auto.level === 'high' ? 4 : auto.level === 'medium' ? 3 : 2,
        score: Math.round((auto.score / 10) * 25),
        level: normalizeRiskLevel(auto.level),
        mitigationAr: auto.level === 'high'
          ? 'أعد توزيع المحطات، زِد عرض المسار أو ضع دخول دفعات، وأكمل توثيق المصادر قبل اعتماد العرض.'
          : 'تابع القياس وأكمل توثيق الأصول مع نقاط تخفيف بسيطة.',
        ownerAr: 'مشرف التشغيل',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      const created = await this.prismaClient.risk.create({
        data: {
          id: risk.id,
          organizationId: risk.organizationId || null,
          projectId: risk.projectId || null,
          experienceId: risk.experienceId || null,
          twinId: risk.twinId || null,
          category: 'operations',
          titleAr: risk.titleAr,
          descriptionAr: risk.descriptionAr || null,
          likelihood1to5: risk.likelihood1to5,
          impact1to5: risk.impact1to5,
          score: risk.score,
          level: risk.level,
          mitigationAr: risk.mitigationAr || null,
          ownerAr: risk.ownerAr || null,
          status: 'open',
        },
      });

      return { ok: true, auto, risk: created, simulationRunId: sim?.id };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwIfProdDbError(err, 'RisksService.assessTwin');

      const twin = await this.prisma.twin.findUnique({ where: { id: input.twinId } });
      if (!twin) throw new NotFoundException('Twin not found');

      const nodes = await this.prisma.twinNode.findMany({ where: { twinId: input.twinId } });
      const hazardNodes = nodes.filter((node) => node.kind === 'hazard').length;

      let sim = input.simulationRunId ? await this.prisma.twinSimulationRun.findUnique({ where: { id: input.simulationRunId } }) : null;
      if (!sim) {
        sim = this.store
          .listTwinSimulations()
          .filter((candidate) => candidate.twinId === input.twinId)
          .find((candidate) => candidate.status === 'completed') || null;
      }

      const result = sim ? safeJson(sim.resultJson) : null;
      const kpis = readKpiBag(result);
      const congestionScore = Number(kpis.congestionScore0to100 || 0) || 0;
      const peakOcc = Math.max(0, ...nodes.map((node) => Number(node.capacity || 0)));
      const missingCitation = await this.prisma.inspirationAsset.findMany({}).filter((asset) => !asset.citationId).length;

      const auto = riskScore({
        congestionScore,
        hazardNodes,
        closedNodes: 0,
        complianceMissing: missingCitation,
        crowdPeakOccupancy: peakOcc,
      });

      const now = new Date().toISOString();
      const risk: RiskRecord = {
        id: uid('risk'),
        organizationId: input.organizationId,
        projectId: input.projectId,
        experienceId: input.experienceId,
        twinId: input.twinId,
        category: 'operations',
        titleAr: 'تقييم آلي للمخاطر بناءً على المحاكاة',
        descriptionAr: `مؤشر ازدحام=${congestionScore}/100، نقاط خطر=${hazardNodes}، نقص توثيق=${missingCitation}`,
        likelihood1to5: auto.level === 'high' ? 4 : auto.level === 'medium' ? 3 : 2,
        impact1to5: auto.level === 'high' ? 4 : auto.level === 'medium' ? 3 : 2,
        score: Math.round((auto.score / 10) * 25),
        level: normalizeRiskLevel(auto.level),
        mitigationAr: auto.level === 'high'
          ? 'أعد توزيع المحطات، زِد عرض المسار أو ضع دخول دفعات، وأكمل توثيق المصادر قبل اعتماد العرض.'
          : 'تابع القياس وأكمل توثيق الأصول مع نقاط تخفيف بسيطة.',
        ownerAr: 'مشرف التشغيل',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      await this.prisma.risk.create({ data: risk);
      return { ok: true, auto, risk, simulationRunId: sim?.id, note: 'fallback_in_memory' };
    }
  }

  private get prismaClient(): RisksPrismaFacade {
    return this.prisma as unknown as RisksPrismaFacade;
  }
}

function normalizeRiskLevel(value: string | undefined): RiskLevel {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}

function normalizeRiskCategory(value: string | undefined): RiskCategory {
  return value === 'safety' || value === 'heritage' || value === 'operations' || value === 'reputation' || value === 'compliance'
    ? value
    : 'operations';
}

function normalizeRiskStatus(value: string | undefined): RiskStatus {
  return value === 'mitigating' || value === 'closed' || value === 'open' ? value : 'open';
}

function readKpiBag(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  if (!record.kpis || typeof record.kpis !== 'object') return {};
  return record.kpis as Record<string, unknown>;
}

function safeJson(value?: string | null) {
  try {
    return JSON.parse(value || 'null') as unknown;
  } catch {
    return null;
  }
}
