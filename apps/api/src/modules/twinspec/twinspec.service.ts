import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID, createHash } from 'crypto';

import { buildCompileResult, type TwinSpecCompileResult, type TwinSpecConcept, type TwinSpecConstraint, type TwinSpecDocument, type TwinSpecLayer, type TwinSpecNarrative, type TwinSpecSourceRef } from '@madar/twinspec-kernel';
import type { SimulationProfile } from '@madar/twin-kernel';

import { TwinService } from '../twin/twin.service';
import { AiService } from '../ai/ai.service';
import { CreateTwinSpecDto } from './dto/create-twinspec.dto';
import { PublishTwinSpecDto } from './dto/publish-twinspec.dto';

function nowIso(){ return new Date().toISOString(); }
function sha256Hex(s: string){ return createHash('sha256').update(s).digest('hex'); }

function stableId(prefix: string, seed: string){
  const h = createHash('sha1').update(seed).digest('hex').slice(0, 10);
  return `${prefix}_${h}`;
}

function pickEntryNodeId(nodes: Array<{ id: string; kind: string }>): string {
  const entry = nodes.find((n) => n.kind === 'entry');
  return entry?.id || nodes[0]?.id || '';
}

@Injectable()
export class TwinSpecService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twin: TwinService,
    private readonly ai: AiService,
  ) {}

  list(params?: { twinId?: string; projectId?: string; organizationId?: string }) {
    const items = [] as any[]; /* Wave123: TwinSpec list from Prisma TODO */
    return { ok: true, count: items.length, items };
  }

  get(id: string) {
    const item = await this.prisma.twinSpec?.findUnique?.({ where: { id: id } }) /* Wave123: ensure TwinSpec model exists */;
    if (!item) throw new NotFoundException('TwinSpec not found');
    return { ok: true, item, spec: safeJson(item.specJson), scenarioPack: item.scenarioPackJson ? safeJson(item.scenarioPackJson) : null };
  }

  async createFromStudios(dto: CreateTwinSpecDto) {
    const t = await this.prisma.twin.findUnique({ where: { id: dto.twinId } });
    if (!t) throw new NotFoundException('Twin not found');

    const warnings: string[] = [];
    const sources: TwinSpecSourceRef[] = [];

    // --- Operational studio: experience plan tables (Competition)
    const zones = dto.competitionId ? await (this.prisma as Record<string, unknown>).competitionZone.findMany({ where: { competitionId: dto.competitionId }, orderBy: [{ kind: 'asc' }, { code: 'asc' }] }).catch(() => []) : [];
    const journey = dto.competitionId ? await (this.prisma as Record<string, unknown>).competitionJourneyStep.findMany({ where: { competitionId: dto.competitionId }, orderBy: [{ stepOrder: 'asc' }] }).catch(() => []) : [];
    const metrics = dto.competitionId ? await (this.prisma as Record<string, unknown>).competitionQueueMetric.findMany({ where: { competitionId: dto.competitionId } }).catch(() => []) : [];

    if (dto.competitionId) {
      sources.push({ studio: 'operational', kind: 'competition_experience_tables', id: dto.competitionId, noteAr: 'Zones/Journey/QueueMetrics' });
      if (!zones?.length) warnings.push('لا توجد Zones في جداول المنافسة. سيعتمد TwinSpec على الحالة الحالية للتوأم أو بيانات محدودة.');
    }

    const dwellByZone: Record<string, number> = {};
    for (const m of metrics || []) {
      const z = String((m as Record<string, unknown>).zoneCode || '');
      const dwellMin = Number((m as Record<string, unknown>).avgDwellMinutes || 0);
      if (z && dwellMin) dwellByZone[z] = Math.max(dwellByZone[z] || 0, dwellMin * 60);
    }

    const kindMap: Record<string, unknown> = {
      entry: 'entry', exit: 'exit', stage: 'activity', exhibit: 'exhibit', activity: 'activity', food: 'service',
      kids: 'activity', tournament: 'activity', rest: 'rest', services: 'service', corridor: 'corridor', hazard: 'hazard',
    };

    // Build graph from operational tables if present; otherwise fallback to current twin graph
    const baseNodes = (zones?.length ? zones : await this.prisma.twinNode.findMany({ where: { twinId: dto.twinId } }).map((n) => ({
      code: n.id,
      nameAr: n.nameAr,
      kind: n.kind,
      capacityEstimate: n.capacity,
    }))) as any[];

    const baseEdgesSeq = journey?.length ? (journey || []).map((s: any) => String(s.zoneCode || '')).filter(Boolean) : null;

    const nodes: any[] = [];
    const nodeByCode: Record<string, string> = {};

    // Deterministic layout (grid) if no positions are provided
    const grid = { cols: 6, dx: 18, dy: 14, x0: 8, y0: 10 };

    for (let i = 0; i < baseNodes.length; i++) {
      const z = baseNodes[i];
      const code = String((z as Record<string, unknown>).code || (z as Record<string, unknown>).id || `z_${i+1}`);
      const nameAr = String((z as Record<string, unknown>).nameAr || code || 'منطقة');
      const kind = kindMap[String((z as Record<string, unknown>).kind || 'exhibit')] || 'exhibit';
      const cap = Number((z as Record<string, unknown>).capacityEstimate || (z as Record<string, unknown>).capacity || 50);
      const dwell = Number(dwellByZone[code] || (z as Record<string, unknown>).dwellTimeSecondsAvg || 180);

      const nodeId = zones?.length ? stableId('tn', `${dto.twinId}:${code}`) : String((z as Record<string, unknown>).id);
      nodeByCode[code] = nodeId;

      const col = i % grid.cols;
      const row = Math.floor(i / grid.cols);
      const pos = { x: grid.x0 + col * grid.dx, y: grid.y0 + row * grid.dy };

      nodes.push({
        id: nodeId,
        nameAr,
        kind,
        capacity: Math.max(1, cap),
        dwellTimeSecondsAvg: Math.max(10, dwell),
        pos,
        tags: ['twinspec', zones?.length ? 'imported' : 'existing', code],
        sources: dto.competitionId ? [{ studio: 'operational', kind: 'zone', id: code }] : [{ studio: 'operational', kind: 'existing_twin_node', id: nodeId }],
      });
    }

    const edges: any[] = [];

    if (zones?.length && baseEdgesSeq?.length) {
      for (let i = 0; i < baseEdgesSeq.length - 1; i++) {
        const fromCode = baseEdgesSeq[i];
        const toCode = baseEdgesSeq[i + 1];
        const fromNodeId = nodeByCode[fromCode];
        const toNodeId = nodeByCode[toCode];
        if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue;
        const edgeId = stableId('te', `${dto.twinId}:${fromCode}->${toCode}`);
        edges.push({
          id: edgeId,
          fromNodeId,
          toNodeId,
          kind: 'path',
          travelTimeSeconds: 25,
          distanceMeters: 20,
          oneWay: false,
          sources: [{ studio: 'operational', kind: 'journey_step', id: `${fromCode}->${toCode}` }],
        });
      }
    } else {
      // fallback: use existing edges from twin store
      const existingEdges = await this.prisma.twinEdge.findMany({ where: { twinId: dto.twinId } });
      for (const e of existingEdges) {
        edges.push({
          id: e.id,
          fromNodeId: e.fromNodeId,
          toNodeId: e.toNodeId,
          kind: e.kind,
          distanceMeters: e.distanceMeters,
          travelTimeSeconds: e.travelTimeSeconds,
          oneWay: e.oneWay,
          widthMeters: e.widthMeters,
          capacityPerMinute: e.capacityPerMinute,
          sources: [{ studio: 'operational', kind: 'existing_twin_edge', id: e.id }],
        });
      }
    }

    // --- Layers
    const layers: TwinSpecLayer[] = [];
    // Keep existing twin layers as baseline
    for (const l of await this.prisma.twinLayer.findMany({ where: { twinId: dto.twinId } })) {
      layers.push({
        id: l.id,
        nameAr: l.nameAr,
        kind: l.kind as any,
        uri: l.uri,
        contentType: l.contentType,
        metadata: l.metadata,
        sources: [{ studio: 'operational', kind: 'existing_twin_layer', id: l.id }],
      });
    }

    if (dto.competitionId) {
      layers.push({
        id: stableId('tl', `${dto.twinId}:competition:${dto.competitionId}`),
        nameAr: 'مرجع خطة التجربة (Competition Experience Plan)',
        kind: 'link',
        uri: `/competitions/${dto.competitionId}?tab=experience`,
        contentType: 'text/html',
        metadata: { competitionId: dto.competitionId, source: 'competition_plan', importedAt: nowIso() },
        sources: [{ studio: 'operational', kind: 'competition', id: dto.competitionId }],
      });
    }

    // --- Creative studio: Vault Ideas (concepts)
    const includeNarratives = dto.includeNarratives !== false;
    const includeRisks = dto.includeRisks !== false;
    const includeObligations = dto.includeObligations === true;

    const ideaIds = Array.isArray(dto.vaultIdeaIds) ? dto.vaultIdeaIds.map(String).filter(Boolean) : [];
    const byBoard = dto.vaultBoardId ? await this.prisma.ideaVault.findMany({}).filter((x) => x.brainstormBoardId === dto.vaultBoardId).slice(0, 12) : [];
    const ideas = ideaIds.length ? ideaIds.map((id) => await this.prisma.ideaVault.findUnique({ where: { id: id } })).filter(Boolean) : byBoard;

    if (ideas.length) {
      sources.push({ studio: 'creative', kind: 'vault_ideas', id: ideas.map((x: any /* typed */) => x.id).join(',') });
    }

    const concepts: TwinSpecConcept[] = [];
    const narratives: TwinSpecNarrative[] = [];

    for (const idea of ideas as any[]) {
      const conceptId = `concept_${idea.id}`;
      const concept: TwinSpecConcept = {
        id: conceptId,
        titleAr: idea.titleAr,
        oneLinerAr: idea.oneLinerAr,
        audienceAr: idea.audienceAr,
        formatAr: idea.formatAr,
        deliverablesAr: idea.deliverablesAr,
        kpisAr: idea.kpisAr,
        risksAr: idea.risksAr,
        sources: [{ studio: 'creative', kind: 'vault_idea', id: idea.id }],
      };

      if (includeNarratives) {
        const nd = await this.prisma.narrativeDraft.findFirst({ where: { ideaVaultId: idea.id } });
        if (nd) {
          const nar: TwinSpecNarrative = {
            id: `nar_${idea.id}`,
            ideaId: idea.id,
            loglineAr: nd.loglineAr,
            acts: [
              { actNo: 1, textAr: nd.act1 },
              { actNo: 2, textAr: nd.act2 },
              { actNo: 3, textAr: nd.act3 },
            ],
            beats: [
              { id: `beat_${idea.id}_1`, titleAr: 'Act 1', textAr: nd.act1, placementHint: { keywordsAr: keywordsFromText(nd.act1) } },
              { id: `beat_${idea.id}_2`, titleAr: 'Act 2', textAr: nd.act2, placementHint: { keywordsAr: keywordsFromText(nd.act2) } },
              { id: `beat_${idea.id}_3`, titleAr: 'Act 3', textAr: nd.act3, placementHint: { keywordsAr: keywordsFromText(nd.act3) } },
            ],
            sources: [{ studio: 'narrative', kind: 'narrative_draft', id: nd.id }],
          };

          // Optional: LLM placement
          if (dto.providerId) {
            const placed = await this.tryPlaceNarrativeWithAi(nar, nodes, dto.providerId).catch(() => null);
            if (placed) {
              nar.beats = placed.beats;
            } else {
              // fallback
              nar.beats = placeNarrativeHeuristic(nar.beats || [], nodes);
              warnings.push('تعذر تشغيل LLM لتثبيت مواقع السردية، تم استخدام توزيع تقريبي.');
            }
          } else {
            nar.beats = placeNarrativeHeuristic(nar.beats || [], nodes);
          }

          narratives.push(nar);
          concept.narrative = nar;
        }
      }

      // For each concept, create a scenario variant
      concept.scenarioKey = `s_${idea.id}`;
      concepts.push(concept);
    }

    // --- Security/Compliance studio: Risks + Obligations
    const constraints: TwinSpecConstraint[] = [];

    if (includeRisks) {
      const riskRows = await this.prisma.risk.findMany({ where: { projectId: dto.projectId } }) /* Wave123 */;
      if (riskRows.length) sources.push({ studio: 'security_compliance', kind: 'risks', noteAr: `count=${riskRows.length}` });

      for (const r of riskRows) {
        const k = String(r.category || 'manual');
        const cid = stableId('c', `${dto.twinId}:risk:${r.id}`);
        const relatedNodeId = inferNodeByText(nodes, `${r.titleAr} ${r.descriptionAr || ''}`);
        if (k === 'safety') {
          constraints.push({
            id: cid,
            kind: 'max_occupancy',
            targetNodeId: relatedNodeId || undefined,
            params: { maxOccupancy: Math.max(10, Math.floor((relatedNodeId ? (nodes.find((n:any)=>n.id===relatedNodeId)?.capacity || 50) : 50) * 0.85)) },
            reasonAr: `مخاطر سلامة: ${r.titleAr}`,
            sources: [{ studio: 'security_compliance', kind: 'risk', id: r.id }],
          });
        } else {
          constraints.push({
            id: cid,
            kind: 'manual',
            targetNodeId: relatedNodeId || undefined,
            params: { category: k, score: r.score, level: r.level },
            reasonAr: `مخاطر: ${r.titleAr}`,
            sources: [{ studio: 'security_compliance', kind: 'risk', id: r.id }],
          });
        }
      }
    }

    if (includeObligations && dto.competitionId) {
      const obs = await (this.prisma as Record<string, unknown>).obligation.findMany({ where: { competitionId: dto.competitionId }, orderBy: [{ dueAt: 'asc' }] }).catch(() => []);
      if (obs?.length) sources.push({ studio: 'security_compliance', kind: 'obligations', id: dto.competitionId, noteAr: `count=${obs.length}` });
      for (const o of (obs || []) as any[]) {
        const cid = stableId('c', `${dto.twinId}:obl:${o.id}`);
        constraints.push({
          id: cid,
          kind: 'manual',
          params: { obligationId: o.id, type: o.type, status: o.status, dueAt: o.dueAt },
          reasonAr: `التزام: ${o.titleAr}`,
          sources: [{ studio: 'security_compliance', kind: 'obligation', id: o.id }],
        });
      }
    }

    // --- Scenarios
    const startNodeId = pickEntryNodeId(nodes.map((n: any) => ({ id: n.id, kind: n.kind })));
    if (!startNodeId) warnings.push('لا يوجد Entry node واضح. سيتم اختيار أول Node كبداية للمحاكاة.');

    const baseArrivals = estimateArrivalsPerMinute(metrics);

    const baseline: SimulationProfile = {
      durationMinutes: 60,
      stepSeconds: 5,
      arrivalsPerMinute: baseArrivals,
      startNodeId: startNodeId || nodes[0]?.id || '',
      shortestPathBias: 0.65,
      allowRevisit: false,
    };

    const scenarios = [
      {
        key: 'baseline',
        nameAr: 'Baseline',
        descriptionAr: 'تشغيل طبيعي على الخطة الحالية',
        profile: baseline,
      },
      {
        key: 'peak',
        nameAr: 'Peak (دفعات دخول)',
        descriptionAr: 'تضخيم الدخول على فترات لقياس الاختناق',
        profile: {
          ...baseline,
          arrivalBatches: [
            { startMinute: 0, endMinute: 12, arrivalsPerMinute: Math.round(baseArrivals * 2.0) },
            { startMinute: 12, endMinute: 25, arrivalsPerMinute: Math.round(baseArrivals * 1.4) },
          ],
        },
      },
      {
        key: 'closure',
        nameAr: 'إغلاق محطة',
        descriptionAr: 'إغلاق محطة نشاط/عرض لاختبار المرونة',
        profile: {
          ...baseline,
          closedNodeIds: pickClosureNodes(nodes),
        },
      },
      {
        key: 'reverse',
        nameAr: 'عكس الاتجاه',
        descriptionAr: 'تجربة عكس الاتجاه داخل المسارات',
        profile: {
          ...baseline,
          reverseEdges: true,
        },
      },
    ] as any[];

    // Concept scenarios
    for (const c of concepts) {
      if (!c.scenarioKey) continue;
      scenarios.push({
        key: c.scenarioKey,
        nameAr: `Concept: ${c.titleAr}`,
        descriptionAr: 'سيناريو مشتق من فكرة استوديو الإبداع',
        profile: { ...baseline, allowRevisit: true },
        expectedKpis: (c.kpisAr || []).slice(0, 6).map((k) => ({ key: 'kpi', target: k })),
      });
    }

    const specId = dto.titleAr ? stableId('tspec', `${dto.twinId}:${dto.titleAr}:${Date.now()}`) : `tspec_${randomUUID().slice(0, 8)}`;

    const titleAr = dto.titleAr || `TwinSpec للتوأم: ${t.nameAr}`;

    const spec: TwinSpecDocument = {
      version: 1,
      id: specId,
      titleAr,
      organizationId: dto.organizationId,
      projectId: dto.projectId,
      twinId: dto.twinId,
      createdAt: nowIso(),
      compiledAt: nowIso(),
      sources: sources.map((s) => ({ ...s, digestSha256: s.digestSha256 || sha256Hex(JSON.stringify(s)) })),
      graph: { nodes, edges },
      layers,
      concepts: concepts.length ? concepts : undefined,
      narrative: narratives.length ? { narratives } : undefined,
      securityCompliance: constraints.length ? { constraints } : undefined,
      scenarios,
      kpis: [{ key: 'congestionScore0to100', nameAr: 'مؤشر الاختناق', target: '<= 35' }, { key: 'completionRatePct', nameAr: 'معدل الإكمال', target: '>= 92%' }],
    };

    const result: TwinSpecCompileResult = buildCompileResult(spec, warnings);

    const rec: TwinSpecRecord = {
      id: specId,
      organizationId: dto.organizationId,
      projectId: dto.projectId,
      twinId: dto.twinId,
      titleAr,
      status: 'compiled',
      version: 1,
      sourcesJson: JSON.stringify(spec.sources || []),
      specJson: JSON.stringify(spec),
      scenarioPackJson: JSON.stringify(result.pack),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    /* Wave123: TwinSpec upsert TODO */ ({} as any /* rec);

    const packRec: TwinScenarioPackRecord = {
      id: result.pack.id,
      twinId: dto.twinId,
      specId,
      nameAr: result.pack.nameAr,
      packJson: JSON.stringify(result.pack),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    /* Wave123: TwinScenarioPack upsert TODO */ ({} as any /* packRec);

    return {
      ok: true,
      specId,
      record: rec,
      preview: {
        nodes: spec.graph.nodes.length,
        edges: spec.graph.edges.length,
        layers: spec.layers.length,
        scenarios: spec.scenarios.length,
        concepts: concepts.length,
        narratives: narratives.length,
        constraints: constraints.length,
      },
      warnings,
      compile: result,
      next: {
        publish: `/api/twinspec/${specId}/publish`,
      },
    };
  }

  async publish(specId: string, dto: PublishTwinSpecDto) {
    const rec = await this.prisma.twinSpec?.findUnique?.({ where: { id: specId } }) /* Wave123: ensure TwinSpec model exists */;
    if (!rec) throw new NotFoundException('TwinSpec not found');
    const spec = safeJson(rec.specJson) as any;
    if (!spec?.twinId) throw new NotFoundException('Invalid TwinSpec payload');

    const mode = dto.mode || 'replace';
    if (mode === 'replace') {
      await this.prisma.twinNode.deleteMany({ where: { twinId: spec.twinId } }); await this.prisma.twinEdge.deleteMany({ where: { twinId: spec.twinId } });
    }

    // Apply graph
    for (const n of spec.graph.nodes || []) {
      await this.twin.addNode(spec.twinId, {
        id: n.id,
        nameAr: n.nameAr,
        kind: n.kind,
        capacity: n.capacity,
        dwellTimeSecondsAvg: n.dwellTimeSecondsAvg,
        pos: n.pos,
        tags: n.tags,
      });
    }

    for (const e of spec.graph.edges || []) {
      await this.twin.addEdge(spec.twinId, {
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        kind: e.kind,
        distanceMeters: e.distanceMeters,
        travelTimeSeconds: e.travelTimeSeconds,
        oneWay: e.oneWay,
        widthMeters: e.widthMeters,
        capacityPerMinute: e.capacityPerMinute,
      });
    }

    for (const l of spec.layers || []) {
      await this.twin.addLayer(spec.twinId, {
        id: l.id,
        nameAr: l.nameAr,
        kind: l.kind,
        uri: l.uri,
        contentType: l.contentType,
        metadata: l.metadata,
      });
    }

    // Store pack (already stored) and optionally create simulations
    const pack = rec.scenarioPackJson ? safeJson(rec.scenarioPackJson) : null;

    const createdRuns: any[] = [];
    if (dto.createSimulations && pack?.scenarios?.length) {
      for (const s of pack.scenarios) {
        const run = await this.twin.createSimulation(spec.twinId, {
          durationMinutes: s.profile.durationMinutes,
          stepSeconds: s.profile.stepSeconds,
          arrivalsPerMinute: s.profile.arrivalsPerMinute,
          startNodeId: s.profile.startNodeId,
          routeNodeIds: s.profile.routeNodeIds,
          shortestPathBias: s.profile.shortestPathBias,
          allowRevisit: s.profile.allowRevisit,
          arrivalBatches: s.profile.arrivalBatches,
          closedNodeIds: s.profile.closedNodeIds,
          reverseEdges: s.profile.reverseEdges,
        } as any);
        createdRuns.push({ scenarioKey: s.key, runId: (run as any)?.simulation?.id || (run as any)?.runId || null });
      }
    }

    if (dto.enqueueSimulations && createdRuns.length) {
      for (const r of createdRuns) {
        const runId = r.runId;
        if (runId) await this.twin.enqueueSimulation(runId).catch(() => void 0);
      }
    }

    const updated: TwinSpecRecord = { ...rec, status: 'published', publishedAt: nowIso(), updatedAt: nowIso() };
    /* Wave123: TwinSpec upsert TODO */ ({} as any /* updated);

    return {
      ok: true,
      specId,
      mode,
      publishedAt: updated.publishedAt,
      applied: {
        nodes: (spec.graph.nodes || []).length,
        edges: (spec.graph.edges || []).length,
        layers: (spec.layers || []).length,
      },
      simulations: createdRuns,
      noteAr: 'تم تطبيق TwinSpec على التوأم الرقمي. يمكنك الآن تشغيل المحاكاة أو ربط Telemetry عبر IoT لمعايرة 4D.',
    };
  }

  private async tryPlaceNarrativeWithAi(nar: TwinSpecNarrative, nodes: any[], providerId: string) {
    const options = nodes.map((n) => ({ id: n.id, nameAr: n.nameAr, kind: n.kind, tags: n.tags || [] }));
    const prompt = [
      'مهمة: توزيع Beats السردية على عقد التوأم الرقمي (Nodes).',
      'أعد JSON فقط بدون شرح.',
      'الشكل:',
      '{"beats":[{"id":"beat_x","nodeIds":["tn_..."]}] }',
      '',
      'قائمة Nodes:',
      JSON.stringify(options).slice(0, 4000),
      '',
      'Beats:',
      JSON.stringify((nar.beats || []).map((b) => ({ id: b.id, titleAr: b.titleAr, textAr: b.textAr, hint: b.placementHint }))),
    ].join('\n');

    const r = await this.ai.chat({
      organizationId: undefined,
      providerId,
      messages: [
        { role: 'system', content: 'أنت مساعد دقيق. أعد JSON فقط.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.0,
      maxTokens: 500,
    } as any);

    const json = extractJson(String((r as any)?.output || ''));
    if (!json) return null;

    const parsed = safeJson(json);
    if (!parsed?.beats) return null;

    const map = new Map<string, string[]>();
    for (const b of parsed.beats) {
      if (b?.id && Array.isArray(b.nodeIds)) map.set(String(b.id), b.nodeIds.map(String));
    }

    const beats = (nar.beats || []).map((b) => ({ ...b, nodeIds: map.get(b.id) || b.nodeIds }));
    return { ...nar, beats };
  }
}

function safeJson(s: string){
  try { return JSON.parse(s); } catch { return null; }
}

function extractJson(s: string): string | null {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return s.slice(start, end + 1);
}

function keywordsFromText(text?: string): string[] {
  const t = String(text || '').replace(/[\u064B-\u0652]/g,'');
  const words = t.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}_-]/gu, '').trim()).filter(Boolean);
  const stop = new Set(['من','في','على','الى','إلى','عن','هذا','هذه','ذلك','تلك','هو','هي','ثم','مع','و','او','أو','كما','قد','تم','يكون','كانت','كان','ليس','ب','ل','ال']);
  const out: string[] = [];
  for (const w of words) {
    if (w.length < 4) continue;
    if (stop.has(w)) continue;
    out.push(w);
    if (out.length >= 8) break;
  }
  return out;
}

function placeNarrativeHeuristic(beats: any[], nodes: any[]) {
  if (!beats?.length || !nodes?.length) return beats;
  const exhibits = nodes.filter((n) => n.kind === 'exhibit' || n.kind === 'activity');
  const entries = nodes.filter((n) => n.kind === 'entry');
  const exits = nodes.filter((n) => n.kind === 'exit');

  return beats.map((b, idx) => {
    if (b.nodeIds?.length) return b;
    if (idx === 0 && entries[0]) return { ...b, nodeIds: [entries[0].id] };
    if (idx === beats.length - 1 && exits[0]) return { ...b, nodeIds: [exits[0].id] };

    // keyword match
    const kw = (b.placementHint?.keywordsAr || []).map((x: string) => x.toLowerCase());
    if (kw.length) {
      const hit = exhibits.find((n) => kw.some((k: string) => String(n.nameAr || '').toLowerCase().includes(k) || (n.tags || []).some((t: string) => String(t).toLowerCase().includes(k))));
      if (hit) return { ...b, nodeIds: [hit.id] };
    }

    const mid = exhibits[Math.min(exhibits.length - 1, Math.max(0, idx - 1))];
    return { ...b, nodeIds: [mid?.id || nodes[0].id] };
  });
}

function inferNodeByText(nodes: any[], text: string): string | null {
  const t = String(text || '').toLowerCase();
  const hit = nodes.find((n) => {
    const name = String(n.nameAr || '').toLowerCase();
    if (name && t.includes(name) && name.length >= 4) return true;
    return false;
  });
  if (hit) return hit.id;

  // keyword scan
  const keywords = ['مخرج','مدخل','ازدحام','تكدس','طوارئ','إخلاء','حشود'];
  for (const k of keywords) {
    if (t.includes(k)) {
      const n = nodes.find((x) => String(x.nameAr || '').includes(k) || (x.tags || []).includes(k));
      if (n) return n.id;
    }
  }
  return null;
}

function estimateArrivalsPerMinute(metrics: any[]): number {
  try {
    const v = (metrics || []).map((m) => Number((m as Record<string, unknown>).footfallPerMinute || 0)).filter((x) => x > 0);
    if (!v.length) return 22;
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.max(1, Math.min(250, Math.round(avg)));
  } catch {
    return 22;
  }
}

function pickClosureNodes(nodes: any[]): string[] {
  const candidate = nodes.find((n) => n.kind === 'activity') || nodes.find((n) => n.kind === 'exhibit');
  return candidate ? [candidate.id] : [];
}
