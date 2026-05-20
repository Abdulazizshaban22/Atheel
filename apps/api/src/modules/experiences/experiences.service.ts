import { Injectable } from '@nestjs/common';
import { QueryExperiencesDto } from './dto/query-experiences.dto';
import { computeRouteStopScore } from '@madar/shared';
import { TwinService } from '../twin/twin.service';
import { ExperiencesApplicationService } from './experiences.application-service';
import { randomUUID } from 'node:crypto';
import { simulateTwinFlow, type TwinEdgeKind, type TwinGraph, type TwinNodeKind } from '@madar/twin-kernel';
import { ExperiencesRepository } from './experiences.repository';
import { PrismaService } from '@madar/db';
import { throwIfProdDbError } from '../../common/db-fallback';
import type { ExperienceRecord, ExperienceSimulationInput, TwinExperienceServiceFacade } from './experience-core.types';

type TwinNodeLike = {
  id: string;
  nameAr?: string | null;
  kind?: string | null;
  capacity?: number | null;
  dwellTimeSecondsAvg?: number | null;
  metadataJson?: { waitMs?: number } | null;
};

type TwinEdgeLike = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  walkMs?: number | null;
  probability?: number | null;
  kind?: string | null;
};

type ExperiencePrismaGraphFacade = PrismaService & {
  twinNode: { findMany(args: Record<string, unknown>): Promise<TwinNodeLike[]> };
  twinEdge: { findMany(args: Record<string, unknown>): Promise<TwinEdgeLike[]> };
};

const TWIN_NODE_KINDS: readonly TwinNodeKind[] = ['entry', 'exit', 'exhibit', 'activity', 'service', 'rest', 'corridor', 'staff_only', 'hazard'];
const TWIN_EDGE_KINDS: readonly TwinEdgeKind[] = ['path', 'stairs', 'elevator', 'queue_lane', 'restricted'];

@Injectable()
export class ExperiencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twin: TwinService,
    private readonly application: ExperiencesApplicationService,
    private readonly repository: ExperiencesRepository,
  ) {}

  async findAll(query: QueryExperiencesDto = {}) {
    return this.repository.findMany(query);
  }

  async findOne(id: string) {
    return this.repository.findById(id);
  }

  simulateRouteScore() {
    return {
      score: computeRouteStopScore({
        interestMatch: 0.85, distanceFit: 0.70, timeFit: 0.90,
        culturalPriority: 0.95, antiCongestion: 0.55, contentQuality: 0.80,
      }),
      formula: '0.35*interest + 0.20*distance + 0.15*time + 0.10*culturalPriority + 0.10*antiCongestion + 0.10*contentQuality',
    };
  }

  async simulateExperience(experienceId: string, input: ExperienceSimulationInput = {}) {
    const experience = await this.findOne(experienceId);
    const ensured = experience.twinId ? null : await this.application.ensureTwin(experienceId);
    const twinId = experience.twinId || ensured?.twin?.id || ensured?.experience?.twinId;
    if (!twinId) throw new Error('لا يوجد Twin مرتبط بهذه التجربة');

    const runId = `sim_${randomUUID().slice(0, 10)}`;
    const { nodes, edges } = await this.loadTwinGraphRecords(twinId);

    const entryNodeId = Array.isArray(input.entryNodeIds) && input.entryNodeIds.length ? String(input.entryNodeIds[0]) : String(nodes[0]?.id || 'start');
    const graph: TwinGraph = {
      nodes: nodes.map((node) => ({
        id: String(node.id),
        nameAr: String(node.nameAr || 'محطة'),
        kind: this.normalizeNodeKind(node.kind),
        capacity: Number(node.capacity || 1) || 1,
        dwellTimeSecondsAvg: Number(node.dwellTimeSecondsAvg || this.resolveWaitMs(node) || 60),
      })),
      edges: edges.map((edge) => ({
        id: String(edge.id),
        fromNodeId: String(edge.fromNodeId),
        toNodeId: String(edge.toNodeId),
        kind: this.normalizeEdgeKind(edge.kind),
        distanceMeters: Math.max(1, Number(edge.walkMs || 1)),
        travelTimeSeconds: Math.max(1, Number(edge.walkMs || 1)),
        capacityPerMinute: Math.max(1, Number(edge.probability || 1)),
      })),
    };

    const profile = {
      durationMinutes: Math.max(1, Number(input.maxSteps || 60)),
      stepSeconds: Math.max(1, Number(input.stepTimeoutMs || 5)),
      arrivalsPerMinute: Math.max(1, Number(input.agents || 12)),
      startNodeId: entryNodeId,
    };

    const seed = this.hashSeed(String(input.seed || 'atheel'));
    const result = simulateTwinFlow({ runId, twinId, graph, profile, seed });
    return { runId, twinId, experienceId, profile, result };
  }

  async buildBlueprint(id: string, body: Record<string, unknown> = {}) {
    const twinFacade = this.twin as unknown as TwinExperienceServiceFacade;
    return twinFacade.buildExperienceBlueprint?.(id, body) || { id, blueprint: body };
  }

  async updateJourney(id: string, body: Record<string, unknown> = {}) {
    const twinFacade = this.twin as unknown as TwinExperienceServiceFacade;
    return twinFacade.updateExperienceJourney?.(id, body) || { id, journey: body };
  }

  async getTouchpoints(id: string) {
    const twinFacade = this.twin as unknown as TwinExperienceServiceFacade;
    return twinFacade.getExperienceTouchpoints?.(id) || { id, touchpoints: [] };
  }

  async simulateTriggers(id: string, body: Record<string, unknown> = {}) {
    const twinFacade = this.twin as unknown as TwinExperienceServiceFacade;
    return twinFacade.simulateExperienceTriggers?.(id, body) || { id, simulation: body };
  }

  private async loadTwinGraphRecords(twinId: string): Promise<{ nodes: TwinNodeLike[]; edges: TwinEdgeLike[] }> {
    try {
      const prisma = this.prisma as ExperiencePrismaGraphFacade;
      const [nodes, edges] = await Promise.all([
        prisma.twinNode.findMany({ where: { twinId } }),
        prisma.twinEdge.findMany({ where: { twinId } }),
      ]);
      return { nodes, edges };
    } catch (err) {
      throwIfProdDbError(err, 'ExperiencesService.simulateExperience.graph');
      return {
        nodes: this.dataStore.listTwinNodes(twinId),
        edges: this.dataStore.listTwinEdges(twinId),
      };
    }
  }

  private normalizeNodeKind(kind?: string | null): TwinNodeKind {
    return (TWIN_NODE_KINDS.find((value) => value === kind) || 'activity') as TwinNodeKind;
  }

  private normalizeEdgeKind(kind?: string | null): TwinEdgeKind {
    return (TWIN_EDGE_KINDS.find((value) => value === kind) || 'path') as TwinEdgeKind;
  }

  private resolveWaitMs(node: TwinNodeLike) {
    return Number(node.metadataJson?.waitMs || 0);
  }

  private hashSeed(seed: string) {
    return Array.from(seed).reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
  }
}
