import type { TwinGraph } from '@madar/twin-kernel';
import type { TwinSpecCompileResult, TwinSpecDocument, TwinScenarioPack } from './types';

export function toTwinGraph(spec: TwinSpecDocument): TwinGraph {
  return {
    nodes: spec.graph.nodes.map((n) => ({
      id: n.id,
      nameAr: n.nameAr,
      kind: n.kind,
      capacity: n.capacity,
      dwellTimeSecondsAvg: n.dwellTimeSecondsAvg,
      pos: n.pos,
      tags: n.tags,
    })),
    edges: spec.graph.edges.map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      kind: e.kind,
      distanceMeters: e.distanceMeters,
      travelTimeSeconds: e.travelTimeSeconds,
      oneWay: e.oneWay,
      widthMeters: e.widthMeters,
      capacityPerMinute: e.capacityPerMinute,
    })),
  };
}

export function buildScenarioPack(spec: TwinSpecDocument, opts?: { nameAr?: string }): TwinScenarioPack {
  const now = new Date().toISOString();
  return {
    id: `tpack_${spec.id}`,
    twinId: spec.twinId,
    specId: spec.id,
    nameAr: opts?.nameAr || `حزمة سيناريوهات: ${spec.titleAr}`,
    createdAt: now,
    scenarios: spec.scenarios,
  };
}

export function buildCompileResult(spec: TwinSpecDocument, warnings: string[] = []): TwinSpecCompileResult {
  const previewGraph = toTwinGraph(spec);
  const pack = buildScenarioPack(spec);
  return { spec, pack, previewGraph, warnings };
}
