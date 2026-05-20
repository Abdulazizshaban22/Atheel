import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID, createHash } from 'crypto';
import { QueueService } from '../queue/queue.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AiService } from '../ai/ai.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { ApprovalPacketsService } from '../approval-packets/approval-packets.service';
import { simulateTwinFlow, validateGraph, topKNodesByDegree } from '@madar/twin-kernel';

function nowIso() { return new Date().toISOString(); }

@Injectable()
export class TwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeService,
    private readonly ai: AiService,
    private readonly approvals: ApprovalsService,
    private readonly workflows: WorkflowsService,
    private readonly packets: ApprovalPacketsService,
  ) {}

  listTwins(params?: { organizationId?: string; projectId?: string }) {
    let rows = await this.prisma.twin.findMany({});
    if (params?.organizationId) rows = rows.filter((t) => t.organizationId === params.organizationId);
    if (params?.projectId) rows = rows.filter((t) => t.projectId === params.projectId);
    return { items: rows, total: rows.length };
  }

  async createTwin(body: Partial<TwinRecord>) {
    const id = body.id || `twin_${randomUUID().slice(0, 10)}`;
    const t: TwinRecord = {
      id,
      organizationId: body.organizationId,
      projectId: body.projectId,
      kind: (body.kind as any) || 'venue',
      nameAr: body.nameAr || 'Twin جديد',
      status: (body.status as any) || 'draft',
      coordinateSystem: (body.coordinateSystem as any) || 'local_xy',
      bboxJson: body.bboxJson || JSON.stringify({}),
      metadata: body.metadata || { source: 'manual' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.prisma.twin.upsert(t);
    await this.safePrismaUpsert('twin', {
      where: { id: t.id },
      update: {
        organizationId: t.organizationId ?? null,
        projectId: t.projectId ?? null,
        kind: t.kind,
        nameAr: t.nameAr,
        status: t.status,
        coordinateSystem: t.coordinateSystem,
        bboxJson: t.bboxJson,
        metadata: (t.metadata as Record<string, unknown>) ?? null,
      },
      create: {
        id: t.id,
        organizationId: t.organizationId ?? null,
        projectId: t.projectId ?? null,
        kind: t.kind,
        nameAr: t.nameAr,
        status: t.status,
        coordinateSystem: t.coordinateSystem,
        bboxJson: t.bboxJson,
        metadata: (t.metadata as Record<string, unknown>) ?? null,
      },
    });

    this.realtime.emit('twin.updated', { twinId: t.id, status: t.status, nameAr: t.nameAr, ts: nowIso() });
    return { ok: true, twin: t };
  }

  getTwin(id: string) {
    const t = await this.prisma.twin.findUnique({ where: { id: id } });
    if (!t) throw new NotFoundException('Twin not found');
    const nodes = await this.prisma.twinNode.findMany({ where: { twinId: id } });
    const edges = await this.prisma.twinEdge.findMany({ where: { twinId: id } });
    const layers = await this.prisma.twinLayer.findMany({ where: { twinId: id } });
    return {
      twin: t,
      graph: { nodesCount: nodes.length, edgesCount: edges.length },
      layersCount: layers.length,
      noteAr: 'الـ Twin يمثل نموذج تشغيل رقمي للموقع/التجربة: عقد Nodes + مسارات Edges + طبقات Layer للأصول (GeoJSON/glTF/3D Tiles) + محاكاة تدفق الزوار + Telemetry.'
    };
  }

  async updateTwin(id: string, patch: Partial<TwinRecord>) {
    const t = await this.prisma.twin.findUnique({ where: { id: id } });
    if (!t) throw new NotFoundException('Twin not found');
    const merged: TwinRecord = { ...t, ...patch, id: t.id, updatedAt: nowIso() };
    await this.prisma.twin.upsert(merged);
    await this.safePrismaUpsert('twin', {
      where: { id: merged.id },
      update: {
        nameAr: merged.nameAr,
        status: merged.status,
        kind: merged.kind,
        coordinateSystem: merged.coordinateSystem,
        bboxJson: merged.bboxJson,
        metadata: (merged.metadata as Record<string, unknown>) ?? null,
      },
      create: {
        id: merged.id,
        organizationId: merged.organizationId ?? null,
        projectId: merged.projectId ?? null,
        kind: merged.kind,
        nameAr: merged.nameAr,
        status: merged.status,
        coordinateSystem: merged.coordinateSystem,
        bboxJson: merged.bboxJson,
        metadata: (merged.metadata as Record<string, unknown>) ?? null,
      }
    });

    this.realtime.emit('twin.updated', { twinId: merged.id, status: merged.status, nameAr: merged.nameAr, ts: nowIso() });
    return { ok: true, twin: merged };
  }

  async addNode(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const id = body.id || `tn_${randomUUID().slice(0, 10)}`;
    const node: TwinNodeRecord = {
      id,
      twinId,
      nameAr: body.nameAr || 'محطة',
      kind: (body.kind as any) || 'exhibit',
      capacity: Number(body.capacity ?? 50),
      dwellTimeSecondsAvg: Number(body.dwellTimeSecondsAvg ?? 180),
      posJson: body.posJson || JSON.stringify(body.pos || {}),
      tags: body.tags || [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await this.prisma.twinNode.upsert(node);

    await this.safePrismaUpsert('twinNode', {
      where: { id: node.id },
      update: {
        twinId: node.twinId,
        nameAr: node.nameAr,
        kind: node.kind,
        capacity: node.capacity,
        dwellTimeSecondsAvg: node.dwellTimeSecondsAvg,
        posJson: node.posJson,
        tags: node.tags,
      },
      create: {
        id: node.id,
        twinId: node.twinId,
        nameAr: node.nameAr,
        kind: node.kind,
        capacity: node.capacity,
        dwellTimeSecondsAvg: node.dwellTimeSecondsAvg,
        posJson: node.posJson,
        tags: node.tags,
      }
    });

    this.realtime.emit('twin.updated', { twinId, change: 'node.upsert', nodeId: node.id, ts: nowIso() });
    return { ok: true, node };
  }

  async addEdge(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const id = body.id || `te_${randomUUID().slice(0, 10)}`;
    const edge: TwinEdgeRecord = {
      id,
      twinId,
      fromNodeId: String(body.fromNodeId || ''),
      toNodeId: String(body.toNodeId || ''),
      kind: (body.kind as any) || 'path',
      distanceMeters: Number(body.distanceMeters ?? 20),
      travelTimeSeconds: Number(body.travelTimeSeconds ?? 25),
      oneWay: Boolean(body.oneWay ?? false),
      widthMeters: body.widthMeters != null ? Number(body.widthMeters) : undefined,
      capacityPerMinute: body.capacityPerMinute != null ? Number(body.capacityPerMinute) : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await this.prisma.twinEdge.upsert(edge);

    await this.safePrismaUpsert('twinEdge', {
      where: { id: edge.id },
      update: {
        twinId: edge.twinId,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        kind: edge.kind,
        distanceMeters: edge.distanceMeters,
        travelTimeSeconds: edge.travelTimeSeconds,
        oneWay: edge.oneWay,
        widthMeters: edge.widthMeters ?? null,
        capacityPerMinute: edge.capacityPerMinute ?? null,
      },
      create: {
        id: edge.id,
        twinId: edge.twinId,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        kind: edge.kind,
        distanceMeters: edge.distanceMeters,
        travelTimeSeconds: edge.travelTimeSeconds,
        oneWay: edge.oneWay,
        widthMeters: edge.widthMeters ?? null,
        capacityPerMinute: edge.capacityPerMinute ?? null,
      },
    });

    this.realtime.emit('twin.updated', { twinId, change: 'edge.upsert', edgeId: edge.id, ts: nowIso() });
    return { ok: true, edge };
  }

  getGraph(twinId: string) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const nodes = await this.prisma.twinNode.findMany({ where: { twinId: twinId } }).map((n) => ({
      id: n.id,
      nameAr: n.nameAr,
      kind: n.kind,
      capacity: n.capacity,
      dwellTimeSecondsAvg: n.dwellTimeSecondsAvg,
      pos: safeJson(n.posJson),
      tags: n.tags,
    }));

    const edges = await this.prisma.twinEdge.findMany({ where: { twinId: twinId } }).map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      kind: e.kind,
      distanceMeters: e.distanceMeters,
      travelTimeSeconds: e.travelTimeSeconds,
      oneWay: e.oneWay,
      widthMeters: e.widthMeters,
      capacityPerMinute: e.capacityPerMinute,
    }));

    const graph = { nodes, edges };
    const validation = validateGraph(graph as any);
    const hubs = topKNodesByDegree(graph as any, 6);

    return {
      twin: t,
      graph,
      validation,
      quickInsights: {
        hubs: hubs.map((h) => ({ nodeId: h.node.id, nameAr: h.node.nameAr, degree: h.degree })),
        noteAr: 'هذه مؤشرات أولية لمراكز الازدحام المحتملة بناءً على درجة العقدة (عدد الاتصالات).'
      }
    };
  }

  async addLayer(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const id = body.id || `tl_${randomUUID().slice(0, 10)}`;
    const layer: TwinLayerRecord = {
      id,
      twinId,
      nameAr: body.nameAr || 'طبقة',
      kind: (body.kind as any) || 'geojson',
      uri: body.uri || '',
      contentType: body.contentType || undefined,
      metadata: body.metadata || {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.prisma.twinLayer.upsert(layer);

    await this.safePrismaUpsert('twinLayer', {
      where: { id: layer.id },
      update: {
        twinId: layer.twinId,
        nameAr: layer.nameAr,
        kind: layer.kind,
        uri: layer.uri,
        contentType: layer.contentType ?? null,
        metadata: (layer.metadata as Record<string, unknown>) ?? null,
      },
      create: {
        id: layer.id,
        twinId: layer.twinId,
        nameAr: layer.nameAr,
        kind: layer.kind,
        uri: layer.uri,
        contentType: layer.contentType ?? null,
        metadata: (layer.metadata as Record<string, unknown>) ?? null,
      }
    });

    this.realtime.emit('twin.updated', { twinId, change: 'layer.upsert', layerId: layer.id, ts: nowIso() });
    return { ok: true, layer };
  }

  listLayers(twinId: string) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');
    const items = await this.prisma.twinLayer.findMany({ where: { twinId: twinId } });
    return {
      items,
      noteAr: 'الطبقات تدعم روابط لأصول GeoJSON أو glTF أو 3D Tiles. glTF معيار من Khronos، و3D Tiles معيار OGC للبث/التحميل التدريجي لبيانات 3D الجغرافية.'
    };
  }

  // Wave33: Import competition operational experience plan into Twin graph (Nodes/Edges/Layers)
  async importFromCompetitionPlan(twinId: string, competitionId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    // Read operational tables (best-effort from Prisma)
    const zones = await (this.prisma as Record<string, unknown>).competitionZone.findMany({ where: { competitionId }, orderBy: [{ kind: 'asc' }, { code: 'asc' }] }).catch(() => []);
    const journey = await (this.prisma as Record<string, unknown>).competitionJourneyStep.findMany({ where: { competitionId }, orderBy: [{ stepOrder: 'asc' }] }).catch(() => []);
    const metrics = await (this.prisma as Record<string, unknown>).competitionQueueMetric.findMany({ where: { competitionId } }).catch(() => []);

    if (!Array.isArray(zones) || !zones.length) {
      return { ok: false, error: 'no_zones', noteAr: 'لا توجد جداول Zones. شغّل تحليل المنافسة Wave32 أولًا.' };
    }

    const dwellByZone: Record<string, number> = {};
    for (const m of metrics || []) {
      const z = String((m as Record<string, unknown>).zoneCode || '');
      const dwellMin = Number((m as Record<string, unknown>).avgDwellMinutes || 0);
      if (z && dwellMin) dwellByZone[z] = Math.max(dwellByZone[z] || 0, dwellMin * 60);
    }

    const kindMap: Record<string, unknown> = {
      entry: 'entry', exit: 'exit', stage: 'activity', exhibit: 'exhibit', activity: 'activity', food: 'service',
      kids: 'activity', tournament: 'activity', rest: 'rest', services: 'service',
    };

    const makeId = (prefix: string, key: string) => {
      const h = createHash('sha1').update(`${twinId}:${prefix}:${key}`).digest('hex').slice(0, 10);
      return `${prefix}_${h}`;
    };

    // Upsert nodes
    const nodeByZone: Record<string, string> = {};
    let createdNodes = 0;
    for (const z of zones) {
      const code = String((z as Record<string, unknown>).code || '');
      const nameAr = String((z as Record<string, unknown>).nameAr || code || 'منطقة');
      const kind = kindMap[String((z as Record<string, unknown>).kind || 'exhibit')] || 'exhibit';
      const cap = Number((z as Record<string, unknown>).capacityEstimate || 50);
      const dwell = Number(dwellByZone[code] || 180);
      const nodeId = makeId('tn', code);
      nodeByZone[code] = nodeId;

      await this.addNode(twinId, {
        id: nodeId,
        nameAr,
        kind,
        capacity: Math.max(1, cap),
        dwellTimeSecondsAvg: Math.max(10, dwell),
        tags: ['imported', 'competition', code],
      });
      createdNodes += 1;
    }

    // Upsert edges based on journey order (zoneCode sequence)
    const seq = (journey || []).map((s: any) => String(s.zoneCode || '')).filter(Boolean);
    let createdEdges = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      const fromCode = seq[i];
      const toCode = seq[i + 1];
      const fromNodeId = nodeByZone[fromCode];
      const toNodeId = nodeByZone[toCode];
      if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue;

      const edgeId = makeId('te', `${fromCode}->${toCode}`);
      await this.addEdge(twinId, {
        id: edgeId,
        fromNodeId,
        toNodeId,
        kind: 'path',
        travelTimeSeconds: Number(body?.defaultTravelTimeSeconds ?? 25),
        distanceMeters: Number(body?.defaultDistanceMeters ?? 20),
      });
      createdEdges += 1;
    }

    // Add layer linking back to the competition plan (acts as a live reference)
    const layerId = makeId('tl', `competition:${competitionId}`);
    await this.addLayer(twinId, {
      id: layerId,
      nameAr: 'مرجع خطة التجربة (Competition Experience Plan)',
      kind: 'link',
      uri: `/competitions/${competitionId}?tab=experience`,
      contentType: 'text/html',
      metadata: { competitionId, source: 'competition_plan', importedAt: nowIso() },
    });

    // Update Twin metadata linkage
    await this.updateTwin(twinId, {
      metadata: { ...(t.metadata as Record<string, unknown>), importedFrom: { competitionId, ts: nowIso(), zones: zones.length, journeySteps: journey.length } },
    } as any);

    return {
      ok: true,
      twinId,
      competitionId,
      imported: { zones: zones.length, journeySteps: journey.length, nodesUpserted: createdNodes, edgesUpserted: createdEdges },
      next: [
        'شغّل محاكاة baseline ثم multi-scenarios',
        'أضف Telemetry حقيقية عبر IoT/ingest لمعايرة النموذج',
        'نفّذ /twin/:id/agents/optimize لإخراج خطة تحسين',
      ],
    };
  }


  async createSimulation(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const runId = body.runId || `tsim_${randomUUID().slice(0, 10)}`;
    const profile = {
      durationMinutes: Number(body.durationMinutes ?? 60),
      stepSeconds: Number(body.stepSeconds ?? 5),
      arrivalsPerMinute: Number(body.arrivalsPerMinute ?? 22),
      startNodeId: String(body.startNodeId || await this.prisma.twinNode.findMany({ where: { twinId: twinId } })[0]?.id || ''),
      routeNodeIds: Array.isArray(body.routeNodeIds) ? body.routeNodeIds.map(String) : undefined,
      shortestPathBias: body.shortestPathBias != null ? Number(body.shortestPathBias) : 0.65,
      allowRevisit: Boolean(body.allowRevisit ?? false),
    };

    if (!profile.startNodeId) throw new NotFoundException('startNodeId is required (add nodes first)');

    const rec: TwinSimulationRecord = {
      id: runId,
      twinId,
      status: 'queued',
      profileJson: JSON.stringify(profile),
      resultJson: JSON.stringify({}),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.prisma.twinSimulationRun.upsert(rec);

    this.realtime.emit('twin.simulation.enqueued', { runId, twinId, ts: nowIso() });
    return { ok: true, simulation: rec, profile };
  }

  listSimulations(params?: { twinId?: string; limit?: number }) {
    let rows = await this.prisma.twinSimulationRun.findMany({});
    if (params?.twinId) rows = rows.filter((r) => r.twinId === params.twinId);
    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    return { items: rows.slice(0, limit), total: rows.length };
  }

  getSimulation(runId: string) {
    const r = await this.prisma.twinSimulationRun.findUnique({ where: { id: runId } });
    if (!r) throw new NotFoundException('Simulation run not found');
    return { simulation: r, profile: safeJson(r.profileJson), result: safeJson(r.resultJson) };
  }

  async runSimulation(runId: string, body: any) {
    const rec = await this.prisma.twinSimulationRun.findUnique({ where: { id: runId } });
    if (!rec) throw new NotFoundException('Simulation run not found');

    const graph = this.getGraph(rec.twinId).graph;
    const profile = { ...safeJson(rec.profileJson), ...body };

    await this.prisma.twinSimulationRun.upsert({ ...rec, status: 'running', updatedAt: nowIso() });
    this.realtime.emit('twin.simulation.running', { runId, twinId: rec.twinId, ts: nowIso() });

    const result = simulateTwinFlow({ runId, twinId: rec.twinId, graph: graph as any, profile });

    const updated: TwinSimulationRecord = { ...rec, status: 'completed', resultJson: JSON.stringify(result), updatedAt: nowIso() };
    await this.prisma.twinSimulationRun.upsert(updated);

    await this.safePrismaUpsert('twinSimulationRun', {
      where: { id: updated.id },
      update: {
        twinId: updated.twinId,
        status: updated.status,
        profileJson: updated.profileJson,
        resultJson: updated.resultJson,
      },
      create: {
        id: updated.id,
        twinId: updated.twinId,
        status: updated.status,
        profileJson: updated.profileJson,
        resultJson: updated.resultJson,
      }
    });

    this.realtime.emit('twin.simulation.completed', { runId, twinId: rec.twinId, kpis: result.kpis, ts: nowIso() });

    // Wave10: auto-create approval packet + enqueue governance workflow
    const pipeline = await this.createApprovalAndEnqueueWorkflow({
      twinId: rec.twinId,
      simulationRunId: runId,
      simulationResult: result,
      scenarioKey: body?.scenarioKey || 'baseline',
    });

    return { ok: true, result, pipeline };
  }

  /** Run multiple simulation scenarios (batch arrivals, closing station, reverse direction, A/B narrative). */
  async runSimulationMulti(runId: string, body: any) {
    const rec = await this.prisma.twinSimulationRun.findUnique({ where: { id: runId } });
    if (!rec) throw new NotFoundException('Simulation run not found');
    const graph0 = this.getGraph(rec.twinId).graph;
    const baseProfile = { ...safeJson(rec.profileJson), ...(body?.baselineOverrides || {}) };

    const scenarios: any[] = Array.isArray(body?.scenarios) ? body.scenarios : [];
    const baseline = simulateTwinFlow({ runId: `${runId}_baseline`, twinId: rec.twinId, graph: graph0 as any, profile: baseProfile, seed: 1337 });

    const results: any[] = [];
    for (const s of scenarios) {
      const key = String(s?.key || s?.type || 'scenario');
      const type = String(s?.type || 'custom');
      let graph = graph0 as any;
      let profile = { ...baseProfile };

      if (type === 'batch_arrivals') {
        // Represent bursts by overriding arrivalsPerMinute in windows.
        profile.arrivalBatches = s?.batches || [];
      }

      if (type === 'node_closed') {
        profile.closedNodeIds = Array.isArray(s?.closedNodeIds) ? s.closedNodeIds.map(String) : [];
      }

      if (type === 'reverse_direction') {
        profile.reverseEdges = true;
      }

      if (type === 'ab_narrative') {
        const a = Array.isArray(s?.variantA) ? s.variantA.map(String) : undefined;
        const b = Array.isArray(s?.variantB) ? s.variantB.map(String) : undefined;
        const ra = simulateTwinFlow({ runId: `${runId}_${key}_A`, twinId: rec.twinId, graph, profile: { ...profile, routeNodeIds: a }, seed: 201 });
        const rb = simulateTwinFlow({ runId: `${runId}_${key}_B`, twinId: rec.twinId, graph, profile: { ...profile, routeNodeIds: b }, seed: 202 });
        results.push({ key, type, variants: { A: ra, B: rb }, comparison: {
          deltaSatisfaction: (rb.kpis.predictedSatisfaction0to100 - ra.kpis.predictedSatisfaction0to100),
          deltaCongestion: (rb.kpis.congestionScore0to100 - ra.kpis.congestionScore0to100),
          deltaCompletion: (rb.kpis.completionRatePct - ra.kpis.completionRatePct),
        }});
        continue;
      }

      // Apply scenario effects on graph/profile at service layer (simple but effective)
      graph = this.applyScenarioToGraph(graph0 as any, profile);
      const r = simulateTwinFlow({ runId: `${runId}_${key}`, twinId: rec.twinId, graph, profile, seed: Number(s?.seed ?? 1337) });
      results.push({ key, type, result: r, noteAr: s?.noteAr });
    }

    const bundle = { baseline, scenarios: results, generatedAt: nowIso() };
    const updated: TwinSimulationRecord = { ...rec, status: 'completed', resultJson: JSON.stringify(bundle), updatedAt: nowIso() };
    await this.prisma.twinSimulationRun.upsert(updated);

    this.realtime.emit('twin.simulation.completed', { runId, twinId: rec.twinId, kpis: baseline.kpis, multi: true, ts: nowIso() });

    const pipeline = await this.createApprovalAndEnqueueWorkflow({
      twinId: rec.twinId,
      simulationRunId: runId,
      simulationResult: bundle,
      scenarioKey: 'multi',
    });

    return { ok: true, bundle, pipeline };
  }

  private applyScenarioToGraph(graph: any, profile: any) {
    const closed = new Set<string>((profile.closedNodeIds || []).map(String));
    const reverseEdges = Boolean(profile.reverseEdges);
    const nodes = (graph.nodes || []).map((n: any) => {
      if (closed.has(n.id)) return { ...n, capacity: 0, kind: 'hazard', nameAr: `${n.nameAr} (مغلق)` };
      return n;
    });
    const edges0 = graph.edges || [];
    const edges = reverseEdges
      ? edges0.map((e: any) => ({ ...e, fromNodeId: e.toNodeId, toNodeId: e.fromNodeId }))
      : edges0;
    // Remove edges leading into closed nodes
    const filteredEdges = edges.filter((e: any) => !closed.has(e.toNodeId) && !closed.has(e.fromNodeId));
    return { nodes, edges: filteredEdges };
  }

  private async createApprovalAndEnqueueWorkflow(input: { twinId: string; simulationRunId: string; simulationResult: any; scenarioKey: string }) {
    const t = await this.prisma.twin.findUnique({ where: { id: input.twinId } });
    if (!t) return { ok: false, reason: 'twin_not_found' };

    const orgId = await this.tryResolveOrganizationId(t.organizationId, t.projectId);
    const entityType = (t.metadata as Record<string, unknown>)?.experienceId ? 'experience' : 'project';
    const entityId = (t.metadata as Record<string, unknown>)?.experienceId || t.projectId || t.id;

    // Wave11: generate formal Approval Packet + artifacts (deck/strategy/ops) and link them to ContentItems
    let packetRes: any = null;
    try {
      packetRes = await this.packets.generate({
        organizationId: orgId,
        projectId: t.projectId || undefined,
        experienceId: (t.metadata as Record<string, unknown>)?.experienceId,
        twinId: t.id,
        simulationRunId: input.simulationRunId,
        scenarioKey: input.scenarioKey,
      } as any);
    } catch {
      packetRes = null;
    }

    const approval = await this.approvals.create({
      organizationId: orgId,
      entityType: entityType as any,
      entityId,
      title: `اعتماد نتائج محاكاة التوأم الرقمي: ${t.nameAr}`,
      dueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      payloadSnapshot: {
        twinId: t.id,
        twinNameAr: t.nameAr,
        projectId: t.projectId,
        simulationRunId: input.simulationRunId,
        scenarioKey: input.scenarioKey,
        result: input.simulationResult,
        approvalPacketId: packetRes?.packet?.id || null,
        generatedContentIds: packetRes?.artifacts?.contentItems?.map((c: any) => c.id) || [],
      },
    } as any);

    // auto-submit for review
    try { await this.approvals.submit(approval.id); } catch { /* ignore */ }

    // Enqueue governance workflow execution
    const templateId = 'wf_events_approval_governance_approval_required';
    const wf = await this.workflows.enqueueExecution({
      templateId,
      organizationId: orgId,
      projectId: t.projectId,
      priority: input.scenarioKey === 'multi' ? 'high' : 'normal',
      inputs: {
        organizationId: orgId,
        projectId: t.projectId,
        brief: `اعتماد نتائج محاكاة Twin (${input.scenarioKey}) للتجربة/الموقع: ${t.nameAr}`,
        metadata: { approvalId: approval.id, twinId: t.id, simulationRunId: input.simulationRunId },
      },
      autoStart: false,
      hasKnowledge: true,
      hasApprovalActor: true,
    } as any);

    return {
      ok: true,
      approvalId: approval.id,
      workflow: wf,
      approvalPacketId: packetRes?.packet?.id || null,
      generatedContentIds: packetRes?.artifacts?.contentItems?.map((c: any) => c.id) || [],
    };
  }

  private async tryResolveOrganizationId(orgId?: string, projectId?: string) {
    if (orgId) return orgId;
    if (!projectId) return 'org_demo_1';
    try {
      const prj = await this.prisma.project.findUnique({ where: { id: projectId } });
      return prj?.organizationId || 'org_demo_1';
    } catch {
      const prj = await this.prisma.project.findUnique({ where: { id: projectId } });
      return prj?.organizationId || 'org_demo_1';
    }
  }

  async enqueueSimulation(runId: string) {
    const rec = await this.prisma.twinSimulationRun.findUnique({ where: { id: runId } });
    if (!rec) throw new NotFoundException('Simulation run not found');
    const res = await this.queue.enqueueTwinSimulation(runId);
    return { ok: true, queue: this.queue.getMode(), enqueued: res };
  }



  // Wave33: 3D AI helper (metadata-based). It does not parse geometry; it helps teams label and place assets.
  async analyzeLayersAi(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');
    const layers = await this.prisma.twinLayer.findMany({ where: { twinId: twinId } });
    const nodes = await this.prisma.twinNode.findMany({ where: { twinId: twinId } }).slice(0, 40);

    const objective = body.objective || 'تحليل طبقات الأصول في التوأم واقتراح تصنيف وتسميات وتوزيع على المحطات وتقليل التعارضات';

    const prompt = [
      'أنت مساعد تصميم وتشغيل للتوأم الرقمي.',
      'المطلوب: تحليل بيانات الطبقات Layers (روابط glTF و3D Tiles وGeoJSON) واقتراح:',
      '1) تصنيف كل طبقة: ما هي وماذا تمثل',
      '2) توصية tags عربية موحدة لكل طبقة',
      '3) توصية ربط الطبقات بمحطات Nodes (إذا كان مناسبًا)',
      '4) مخاطر تقنية: روابط مكسورة، حجم بيانات، أداء تحميل، وقياس جودة',
      '',
      'Twin:',
      JSON.stringify({ id: t.id, nameAr: t.nameAr, coordinateSystem: t.coordinateSystem }, null, 2),
      '',
      'Layers:',
      JSON.stringify(layers, null, 2),
      '',
      'Nodes (sample):',
      JSON.stringify(nodes, null, 2),
      '',
      'الهدف:',
      String(objective),
      '',
      'اكتب الناتج كقائمة منظمة: طبقة-طبقة مع توصيات قصيرة عملية.',
    ].join('\n');

    const llm = await this.ai.chat({
      organizationId: t.organizationId,
      providerId: body.providerId,
      messages: [
        { role: 'system', content: 'أنت مساعد عربي دقيق. لا تختلق حقائق. التزم بمقترحات قابلة للتنفيذ.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 1200,
    } as any);

    return { ok: true, twinId, layersCount: layers.length, output: llm.output, provider: llm.provider, usage: llm.usage };
  }

  async ingestTelemetry(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const id = body.id || `tel_${randomUUID().slice(0, 10)}`;
    const rec: TwinTelemetryRecord = {
      id,
      twinId,
      ts: body.ts || nowIso(),
      kind: (body.kind as any) || 'manual_note',
      nodeId: body.nodeId,
      value: body.value != null ? Number(body.value) : undefined,
      payload: body.payload || undefined,
      createdAt: nowIso(),
    };
    await this.prisma.twinTelemetryEvent.create({ data: rec);

    await this.safePrismaCreate('twinTelemetryEvent', {
      id: rec.id,
      twinId: rec.twinId,
      ts: new Date(rec.ts),
      kind: rec.kind,
      nodeId: rec.nodeId ?? null,
      value: rec.value ?? null,
      payload: (rec.payload as any) ?? null,
    });

    this.realtime.emit('twin.telemetry', { twinId, kind: rec.kind, nodeId: rec.nodeId, value: rec.value, ts: rec.ts });
    return { ok: true, event: rec };
  }

  listTelemetry(twinId: string, opts?: { limit?: number }) {
    const limit = Math.max(1, Math.min(500, opts?.limit ?? 80));
    const rows = await this.prisma.twinTelemetryEvent.findMany({ where: { twinId: twinId } }).slice(0, limit);
    return { items: rows, total: rows.length };
  }

  async optimizeTwin(twinId: string, body: any) {
    const t = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const latestSim = this.store
      .listTwinSimulations()
      .filter((r) => r.twinId === twinId && r.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    const graph = this.getGraph(twinId).graph;
    const telemetry = await this.prisma.twinTelemetryEvent.findMany({ where: { twinId: twinId } }).slice(0, 80);

    const objective = body.objective || 'اقتراح تحسينات لتقليل الازدحام ورفع رضا الزوار دون الإخلال بالسردية الثقافية';

    const contextBundle = {
      twin: { id: t.id, nameAr: t.nameAr, kind: t.kind, coordinateSystem: t.coordinateSystem },
      graphSummary: { nodes: graph.nodes.length, edges: graph.edges.length },
      hubs: topKNodesByDegree(graph as any, 6).map((h) => ({ nodeId: h.node.id, nameAr: h.node.nameAr, degree: h.degree })),
      latestSimulation: latestSim ? safeJson(latestSim.resultJson) : null,
      telemetryPreview: telemetry,
    };

    const combinedObjective = `${objective}

سياق Twin (JSON):
${JSON.stringify(contextBundle, null, 2)}

مطلوب: اقترح 8 تحسينات عملية مقسمة إلى:
1) تعديل Nodes (سعات/زمن توقف/محطات)
2) تعديل Edges (اتجاه/عرض/زمن انتقال)
3) تعديلات تشغيلية (جدولة/طاقم/إشارات)
4) تعديلات سردية (ترتيب القصة دون تكدس)
ثم أعطني خطة تجربة A/B للاختبار ومحاكاة جديدة تقارن Before/After.
`;

    const agent = await this.ai.runAgent({
      organizationId: t.organizationId,
      projectId: t.projectId,
      objective: combinedObjective,
      runDraft: true,
      requiresApproval: true,
    } as any);

    return {
      ok: true,
      twin: t,
      latestSimulationId: latestSim?.id,
      agent,
      noteAr: 'هذه توصيات أولية من الوكيل. الأفضل تطبيقها كـ تغييرات على Nodes/Edges ثم إعادة محاكاة فورًا.'
    };
  }


  async createScenario(twinId: string, body: any = {}) {
    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');
    const scenarioKey = String(body.scenarioKey || body.name || `scenario_${randomUUID().slice(0, 6)}`);
    const profile = {
      durationMinutes: Number(body.durationMinutes ?? 75),
      stepSeconds: Number(body.stepSeconds ?? 5),
      arrivalsPerMinute: Number(body.arrivalsPerMinute ?? 28),
      startNodeId: String(body.startNodeId || await this.prisma.twinNode.findMany({ where: { twinId: twinId } })[0]?.id || ''),
      routeNodeIds: Array.isArray(body.routeNodeIds) ? body.routeNodeIds.map(String) : undefined,
      shortestPathBias: body.shortestPathBias != null ? Number(body.shortestPathBias) : 0.72,
      allowRevisit: Boolean(body.allowRevisit ?? false),
      metadata: {
        scenarioKey,
        crowdProfile: body.crowdProfile || 'baseline',
        heritageSensitivity: Number(body.heritageSensitivity ?? 0.6),
      },
    };
    const simulation = await this.createSimulation(twinId, { ...profile, runId: body.runId || `tsim_${randomUUID().slice(0, 10)}` });
    return { ok: true, scenarioKey, simulation, profile };
  }

  async simulateFlowLite(twinId: string, body: any = {}) {
    const nodes = await this.prisma.twinNode.findMany({ where: { twinId: twinId } });
    if (!nodes.length) throw new NotFoundException('Twin graph has no nodes');
    const simulation = await this.createScenario(twinId, body);
    const nestedSimulation = simulation?.simulation as { simulation?: { id?: string }; id?: string; runId?: string } | undefined;
    const runId = nestedSimulation?.simulation?.id || nestedSimulation?.id || nestedSimulation?.runId;
    const executed = await this.runSimulation(String(runId), { scenarioKey: simulation.scenarioKey, ...body });
    const kpis = (executed as any)?.result?.kpis || {};
    const heritageSensitivity = Number(body.heritageSensitivity ?? 0.6);
    const loadThresholds = this.getLoadThresholds(twinId);
    return {
      ok: true,
      twinId,
      scenarioKey: simulation.scenarioKey,
      kpis,
      heritageRisk: Math.min(100, Math.round(((Number(kpis?.avgOccupancyPct || 45) / 100) * 55 + heritageSensitivity * 45))),
      loadThresholds: loadThresholds.thresholds,
      recommendationAr: Number(kpis?.avgOccupancyPct || 0) > 75
        ? 'يوصى بإعادة توزيع التدفق أو تقليل الذروة في بعض العقد.'
        : 'التدفق مقبول مبدئيًا مع استمرار المراقبة.',
      result: executed,
    };
  }

  getLoadThresholds(twinId: string) {
    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');
    const thresholds = await this.prisma.twinNode.findMany({ where: { twinId: twinId } }).map((node) => {
      const baseCapacity = Math.max(1, Number(node.capacity || 1));
      const comfort = Math.max(1, Math.round(baseCapacity * 0.65));
      const caution = Math.max(comfort + 1, Math.round(baseCapacity * 0.85));
      const critical = Math.max(caution + 1, baseCapacity);
      return {
        nodeId: node.id,
        nameAr: node.nameAr,
        comfortOccupancy: comfort,
        cautionOccupancy: caution,
        criticalOccupancy: critical,
        dwellTimeSecondsAvg: node.dwellTimeSecondsAvg,
      };
    });
    return { ok: true, twinId, thresholds };
  }

  getScenarioResults(twinId: string, opts: { limit?: number } = {}) {
    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');
    const limit = Math.max(1, Math.min(100, Number(opts?.limit || 20)));
    const items = await this.prisma.twinSimulationRun.findMany({})
      .filter((x) => x.twinId === twinId)
      .slice(0, limit)
      .map((row) => {
        const profile = safeJson(row.profileJson);
        const result = safeJson(row.resultJson);
        return {
          id: row.id,
          status: row.status,
          scenarioKey: profile?.metadata?.scenarioKey || profile?.scenarioKey || 'baseline',
          arrivalsPerMinute: profile?.arrivalsPerMinute || null,
          durationMinutes: profile?.durationMinutes || null,
          avgOccupancyPct: result?.kpis?.avgOccupancyPct || null,
          completedAt: row.updatedAt,
        };
      });
    return { ok: true, twinId, total: items.length, items };
  }


  private async safePrismaUpsert(modelName: string, args: unknown) {
    try {
      const model = (this.prisma as any)?.[modelName];
      if (model?.upsert) await model.upsert(args as any);
    } catch {
      // ignore until migrations applied
    }
  }

  private async safePrismaCreate(modelName: string, data: unknown) {
    try {
      const model = (this.prisma as any)?.[modelName];
      if (model?.create) await model.create({ data });
    } catch {
      // ignore until migrations applied
    }
  }

  async simulateCrowd(twinId: string, body: any = {}) {
    const result = await this.simulateFlowLite(twinId, body);
    const occupancy = Number(result?.kpis?.avgOccupancyPct || 0);
    const comfort = occupancy < 55 ? 'good' : occupancy < 75 ? 'watch' : 'stress';
    return {
      ok: true,
      twinId,
      comfort,
      crowdPressureScore: Math.min(100, Math.round(occupancy * 1.1)),
      recommendationAr: comfort === 'stress' ? 'أعد توزيع المدخلات على مسارات متعددة وقلّل الذروة خلال أول 20 دقيقة.' : 'الضغط مقبول مع مراقبة العقد الأعلى حملاً.',
      base: result,
    };
  }

  async simulateHeritageLoad(twinId: string, body: any = {}) {
    const flow = await this.simulateFlowLite(twinId, body);
    const occupancy = Number(flow?.kpis?.avgOccupancyPct || 45);
    const humidity = Number(body.humidityStress ?? 0.35);
    const touch = Number(body.touchIntensity ?? 0.4);
    const lighting = Number(body.lightingStress ?? 0.3);
    const stress = Math.min(100, Math.round(occupancy * 0.45 + humidity * 25 + touch * 20 + lighting * 10));
    return {
      ok: true,
      twinId,
      heritageStressScore: stress,
      posture: stress >= 75 ? 'critical' : stress >= 55 ? 'caution' : 'acceptable',
      recommendationAr: stress >= 75 ? 'خفّض كثافة المرور وقلل نقاط اللمس المباشر فورًا.' : 'الوضع مقبول مبدئيًا مع رصد مستمر لعوامل البيئة.',
      base: flow,
    };
  }

  async simulateExperienceOutcome(twinId: string, body: any = {}) {
    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');
    const graph = this.getGraph(twinId).graph;
    const nodes = graph.nodes.length || 1;
    const dwell = graph.nodes.reduce((sum: number, n: any) => sum + Number(n.dwellTimeSecondsAvg || 0), 0) / nodes;
    const transitions = Math.max(1, graph.edges.length);
    const narrativeContinuity = Math.max(45, Math.min(96, 88 - Math.abs(nodes - transitions) * 4));
    const fatigueRisk = Math.max(8, Math.min(92, Math.round((dwell / 60) * 7 + nodes * 3)));
    return {
      ok: true,
      twinId,
      outcome: {
        narrativeContinuity,
        fatigueRisk,
        interactionDensity: Math.round((transitions / nodes) * 100),
      },
      recommendationAr: fatigueRisk > 65 ? 'اختصر مسارًا واحدًا أو أضف محطة هدوء قبل الذروة.' : 'التجربة متوازنة مبدئيًا ويمكن اختبار نسختين A/B للسرد.',
    };
  }

  getRiskZones(twinId: string) {
    const thresholds = this.getLoadThresholds(twinId).thresholds;
    return {
      ok: true,
      twinId,
      items: thresholds.map((t: any) => ({
        nodeId: t.nodeId,
        nameAr: t.nameAr,
        riskZone: t.criticalOccupancy <= 20 ? 'red' : t.criticalOccupancy <= 40 ? 'amber' : 'green',
        criticalOccupancy: t.criticalOccupancy,
      })),
    };
  }

  getDecisionSummary(twinId: string) {
    const scenarios = this.getScenarioResults(twinId, { limit: 10 }).items;
    const latest = scenarios[0] || null;
    return {
      ok: true,
      twinId,
      latest,
      summaryAr: latest && Number(latest.avgOccupancyPct || 0) > 75
        ? 'الوضع يتطلب معالجة اختناقات المسار قبل الإطلاق.'
        : 'لا توجد مؤشرات حرجة ظاهرة في آخر المحاكاة.',
      nextBestActions: [
        'شغّل simulate-heritage-load إذا كان الأصل حساسًا',
        'قارن سيناريو ذروة مرتفعة مع ذروة موزعة',
        'اربط النتيجة ببوابة Stage Gate قبل الاعتماد النهائي',
      ],
    };
  }

  refreshDecisionSummary(twinId: string, dto: any) {
    const twin = await this.prisma.twin.findUnique({ where: { id: twinId } });
    if (!twin) throw new NotFoundException('Twin not found');
    const id = `job_twin_${randomUUID().slice(0,8)}`;
    const now = nowIso();
    const queueMode = this.queue.getMode().mode === 'redis' ? 'redis' : 'sync';
    const payload = { twinId, ...dto };
    await this.prisma.asyncJob.upsert({
      id, kind: 'twin_simulation', entityType: 'twin', entityId: twinId, organizationId: dto?.organizationId || twin.organizationId, projectId: dto?.projectId || twin.projectId,
      status: queueMode === 'redis' ? 'queued' : 'completed', queueMode, payload, createdAt: now, updatedAt: now,
    });
    if (queueMode === 'sync') {
      const summary = this.getDecisionSummary(twinId);
      await this.prisma.asyncJob.upsert({
        id, kind: 'twin_simulation', entityType: 'twin', entityId: twinId, organizationId: dto?.organizationId || twin.organizationId, projectId: dto?.projectId || twin.projectId,
        status: 'completed', queueMode, payload, result: summary, createdAt: now, updatedAt: nowIso(),
      });
      return { ok: true, jobId: id, summary, mode: 'sync_inline' };
    }
    void this.queue.enqueueTwinDecision({ jobId: id, twinId, organizationId: dto?.organizationId || twin.organizationId, projectId: dto?.projectId || twin.projectId, payload: dto }).catch(() => undefined);
    return { ok: true, jobId: id, mode: 'queued_worker' };
  }

  processDecisionSummaryJob(jobId: string) {
    const rec = await this.prisma.asyncJob.findUnique({ where: { id: jobId } });
    if (!rec || rec.kind !== 'twin_simulation') return { ok: false, reason: 'job_not_found' };
    const twinId = String((rec.payload as any)?.twinId || rec.entityId || '');
    if (!twinId) return { ok: false, reason: 'missing_twin_id' };
    await this.prisma.asyncJob.upsert({ ...rec, status: 'running', updatedAt: nowIso() });
    try {
      const summary = this.getDecisionSummary(twinId);
      const completed = { ...rec, status: 'completed' as const, result: summary, updatedAt: nowIso() };
      await this.prisma.asyncJob.upsert(completed);
      return { ok: true, job: completed };
    } catch (error: any) {
      const failed = { ...rec, status: 'failed' as const, result: { error: String(error?.message || error || 'failed') }, updatedAt: nowIso() };
      await this.prisma.asyncJob.upsert(failed);
      return { ok: false, job: failed };
    }
  }
}

function safeJson(s?: string) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}
