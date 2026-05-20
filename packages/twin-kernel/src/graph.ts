import type { TwinEdge, TwinGraph, TwinNode, TwinRoutePlan } from './types';

type Adj = { to: string; w: number; edge: TwinEdge };

export function buildAdjacency(graph: TwinGraph) {
  const adj: Record<string, Adj[]> = {};
  for (const n of graph.nodes) adj[n.id] = [];
  for (const e of graph.edges) {
    if (!adj[e.fromNodeId]) adj[e.fromNodeId] = [];
    adj[e.fromNodeId].push({ to: e.toNodeId, w: Math.max(1, e.travelTimeSeconds), edge: e });
    if (!e.oneWay) {
      if (!adj[e.toNodeId]) adj[e.toNodeId] = [];
      adj[e.toNodeId].push({ to: e.fromNodeId, w: Math.max(1, e.travelTimeSeconds), edge: e });
    }
  }
  return adj;
}

export function shortestPath(graph: TwinGraph, fromId: string, toId: string): { path: string[]; cost: number } {
  const adj = buildAdjacency(graph);
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited: Record<string, boolean> = {};
  for (const n of graph.nodes) {
    dist[n.id] = Infinity;
    prev[n.id] = null;
    visited[n.id] = false;
  }
  if (!(fromId in dist) || !(toId in dist)) return { path: [], cost: Infinity };
  dist[fromId] = 0;

  for (let i = 0; i < graph.nodes.length; i++) {
    // pick min unvisited
    let u: string | null = null;
    let best = Infinity;
    for (const id of Object.keys(dist)) {
      if (!visited[id] && dist[id] < best) {
        best = dist[id];
        u = id;
      }
    }
    if (!u) break;
    if (u === toId) break;
    visited[u] = true;

    for (const a of adj[u] || []) {
      const alt = dist[u] + a.w;
      if (alt < dist[a.to]) {
        dist[a.to] = alt;
        prev[a.to] = u;
      }
    }
  }

  const path: string[] = [];
  let cur: string | null = toId;
  while (cur) {
    path.push(cur);
    cur = prev[cur];
  }
  path.reverse();
  if (path[0] !== fromId) return { path: [], cost: Infinity };
  return { path, cost: dist[toId] };
}

export function validateGraph(graph: TwinGraph) {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const errors: string[] = [];
  for (const e of graph.edges) {
    if (!nodeIds.has(e.fromNodeId)) errors.push(`Edge ${e.id}: fromNodeId not found ${e.fromNodeId}`);
    if (!nodeIds.has(e.toNodeId)) errors.push(`Edge ${e.id}: toNodeId not found ${e.toNodeId}`);
    if (e.travelTimeSeconds <= 0) errors.push(`Edge ${e.id}: travelTimeSeconds must be > 0`);
  }
  for (const n of graph.nodes) {
    if (n.capacity <= 0) errors.push(`Node ${n.id}: capacity must be > 0`);
    if (n.dwellTimeSecondsAvg < 0) errors.push(`Node ${n.id}: dwellTimeSecondsAvg must be >= 0`);
  }
  return { ok: errors.length === 0, errors };
}

export function buildDefaultRoute(graph: TwinGraph, startNodeId: string): TwinRoutePlan {
  // Default: visit all non-corridor nodes in stable order then exit if present.
  const exhibits = graph.nodes
    .filter((n) => !['corridor', 'staff_only', 'hazard'].includes(n.kind))
    .map((n) => n.id);
  const exit = graph.nodes.find((n) => n.kind === 'exit')?.id;
  const route = [startNodeId, ...exhibits.filter((id) => id !== startNodeId)];
  if (exit && !route.includes(exit)) route.push(exit);
  return { startNodeId, routeNodeIds: route };
}

export function topKNodesByDegree(graph: TwinGraph, k: number): Array<{ node: TwinNode; degree: number }> {
  const deg: Record<string, number> = {};
  for (const n of graph.nodes) deg[n.id] = 0;
  for (const e of graph.edges) {
    deg[e.fromNodeId] = (deg[e.fromNodeId] || 0) + 1;
    deg[e.toNodeId] = (deg[e.toNodeId] || 0) + 1;
  }
  const rows = graph.nodes.map((n) => ({ node: n, degree: deg[n.id] || 0 }));
  rows.sort((a, b) => b.degree - a.degree);
  return rows.slice(0, Math.max(1, Math.min(50, k)));
}
