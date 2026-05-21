import type { SimulationProfile, TwinCongestionPoint, TwinGraph, TwinSimulationSummary } from './types';
import { buildAdjacency, buildDefaultRoute, shortestPath, validateGraph } from './graph';

// Deterministic RNG (xorshift32)
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    return (x >>> 0) / 0xffffffff;
  };
}

type Visitor = {
  id: number;
  nodeId: string;
  routeIdx: number;
  remainingSeconds: number;
  totalWaitSeconds: number;
  totalTravelSeconds: number;
  enteredAtSecond: number;
  completedAtSecond?: number;
};

export function simulateTwinFlow(input: {
  runId: string;
  twinId: string;
  graph: TwinGraph;
  profile: SimulationProfile;
  seed?: number;
}): TwinSimulationSummary {
  const { runId, twinId, graph, profile } = input;

  const v = validateGraph(graph);
  if (!v.ok) {
    return {
      runId,
      twinId,
      profile,
      totals: {
        visitorsSimulated: 0,
        completedVisitors: 0,
        avgTotalTimeSeconds: 0,
        avgWaitSeconds: 0,
        avgTravelSeconds: 0,
      },
      kpis: {
        congestionScore0to100: 0,
        completionRatePct: 0,
        predictedSatisfaction0to100: 0,
      },
      bottlenecks: [],
      timeseries: [],
    };
  }

  const step = Math.max(1, Math.min(60, profile.stepSeconds || 5));
  const durationSeconds = Math.max(60, Math.floor((profile.durationMinutes || 60) * 60));
  const baseArrivalsPerMinute = Math.max(0, profile.arrivalsPerMinute || 0);
  const startNodeId = profile.startNodeId;

  const nodesById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(graph);

  const seed = input.seed ?? 1337;
  const r = rng(seed);

  const routePlan = profile.routeNodeIds?.length
    ? { startNodeId, routeNodeIds: profile.routeNodeIds }
    : buildDefaultRoute(graph, startNodeId);

  // Precompute shortest next hop distances to bias movement.
  const shortestBias = Math.max(0, Math.min(1, profile.shortestPathBias ?? 0.65));

  const occupancy: Record<string, number> = {};
  const waitQueue: Record<string, Visitor[]> = {};
  const active: Visitor[] = [];

  for (const n of graph.nodes) {
    occupancy[n.id] = 0;
    waitQueue[n.id] = [];
  }

  let visitorCounter = 0;
  // Optional: arrival batches (bursts) to simulate "دفعات" دخول
  // Shape: [{ startMinute, endMinute, arrivalsPerMinute }]
  const arrivalBatches = Array.isArray(profile.arrivalBatches) ? profile.arrivalBatches : [];
  function arrivalsPerMinuteAt(tSecond: number) {
    if (!arrivalBatches.length) return baseArrivalsPerMinute;
    const m = tSecond / 60;
    const hit = arrivalBatches.find((batch) => m >= Number(batch.startMinute ?? 0) && m < Number(batch.endMinute ?? (Number(batch.startMinute ?? 0) + 5)));
    return hit ? Math.max(0, Number(hit.arrivalsPerMinute ?? baseArrivalsPerMinute)) : baseArrivalsPerMinute;
  }

  const nodeStats: Record<string, { peak: number; waitSum: number; waitCount: number }> = {};
  for (const n of graph.nodes) nodeStats[n.id] = { peak: 0, waitSum: 0, waitCount: 0 };

  const timeseries: TwinSimulationSummary['timeseries'] = [];

  function pickNextNode(cur: string, visitor: Visitor): string {
    // If route plan specified, follow it.
    const route = routePlan.routeNodeIds;
    if (visitor.routeIdx < route.length - 1) {
      const next = route[visitor.routeIdx + 1];
      return next;
    }

    const options = (adj[cur] || []).map((a) => a.to);
    if (options.length === 0) return cur;
    if (options.length === 1) return options[0];

    // Probabilistic: prefer nodes that are closer to an exit (if exists)
    const exit = graph.nodes.find((n) => n.kind === 'exit')?.id;
    if (!exit) {
      return options[Math.floor(r() * options.length)];
    }

    const scored = options.map((to) => {
      const sp = shortestPath(graph, to, exit);
      const cost = sp.cost;
      const util = occupancy[to] / Math.max(1, nodesById[to]?.capacity || 1);
      const penalty = 1 + util;
      return { to, score: 1 / (Math.max(1, cost) * penalty) };
    });

    // Blend deterministic and random
    scored.sort((a, b) => b.score - a.score);
    if (r() < shortestBias) return scored[0].to;

    const sum = scored.reduce((s, x) => s + x.score, 0);
    let t = r() * sum;
    for (const s of scored) {
      t -= s.score;
      if (t <= 0) return s.to;
    }
    return scored[0].to;
  }

  function enqueueToNode(visitor: Visitor, nodeId: string) {
    const node = nodesById[nodeId];
    if (!node) return;

    // Capacity check
    if (occupancy[nodeId] < node.capacity) {
      occupancy[nodeId] += 1;
      nodeStats[nodeId].peak = Math.max(nodeStats[nodeId].peak, occupancy[nodeId]);

      const dwell = Math.max(0, Math.round(node.dwellTimeSecondsAvg * (0.8 + 0.4 * r())));
      visitor.nodeId = nodeId;
      visitor.remainingSeconds = dwell;
      active.push(visitor);
    } else {
      // wait
      visitor.nodeId = nodeId;
      visitor.remainingSeconds = 0;
      waitQueue[nodeId].push(visitor);
      nodeStats[nodeId].waitCount += 1;
    }
  }

  function tryAdmitFromQueue(nodeId: string) {
    const node = nodesById[nodeId];
    if (!node) return;
    while (occupancy[nodeId] < node.capacity && waitQueue[nodeId].length > 0) {
      const v = waitQueue[nodeId].shift()!;
      occupancy[nodeId] += 1;
      nodeStats[nodeId].peak = Math.max(nodeStats[nodeId].peak, occupancy[nodeId]);
      const dwell = Math.max(0, Math.round(node.dwellTimeSecondsAvg * (0.8 + 0.4 * r())));
      v.remainingSeconds = dwell;
      active.push(v);
    }
  }

  const completed: Visitor[] = [];

  for (let t = 0; t <= durationSeconds; t += step) {
    // arrivals
    const arrivalsPerSecond = arrivalsPerMinuteAt(t) / 60;
    const expectedArrivals = arrivalsPerSecond * step;
    const arrivals = Math.floor(expectedArrivals + r());

    for (let i = 0; i < arrivals; i++) {
      visitorCounter += 1;
      const visitor: Visitor = {
        id: visitorCounter,
        nodeId: startNodeId,
        routeIdx: 0,
        remainingSeconds: 0,
        totalWaitSeconds: 0,
        totalTravelSeconds: 0,
        enteredAtSecond: t,
      };
      enqueueToNode(visitor, startNodeId);
    }

    // update waits
    for (const [nodeId, q] of Object.entries(waitQueue)) {
      if (q.length === 0) continue;
      for (const w of q) {
        w.totalWaitSeconds += step;
        nodeStats[nodeId].waitSum += step;
      }
    }

    // progress active visitors
    const stillActive: Visitor[] = [];
    for (const visitor of active) {
      visitor.remainingSeconds -= step;
      if (visitor.remainingSeconds > 0) {
        stillActive.push(visitor);
        continue;
      }

      // Leave current node
      occupancy[visitor.nodeId] = Math.max(0, (occupancy[visitor.nodeId] || 0) - 1);

      // Determine next
      const cur = visitor.nodeId;
      const route = routePlan.routeNodeIds;
      if (visitor.routeIdx < route.length - 1) {
        visitor.routeIdx += 1;
      }

      const next = pickNextNode(cur, visitor);
      if (next === cur) {
        // no move, re-dwell shortly
        visitor.remainingSeconds = Math.max(1, Math.round(nodesById[cur].dwellTimeSecondsAvg * 0.3));
        stillActive.push(visitor);
        occupancy[cur] += 1;
        continue;
      }

      // edge travel
      const edge = (adj[cur] || []).find((a) => a.to === next)?.edge;
      const travel = Math.max(1, edge?.travelTimeSeconds ?? 15);
      visitor.totalTravelSeconds += travel;

      // check completion (exit)
      if (nodesById[next]?.kind === 'exit') {
        visitor.completedAtSecond = t + travel;
        completed.push(visitor);
        // do not enqueue to exit
      } else {
        enqueueToNode(visitor, next);
      }

      // Admit from queue at the node we left (space freed)
      tryAdmitFromQueue(cur);
    }
    // Update active
    active.length = 0;
    active.push(...stillActive);

    // Admit queues everywhere each step
    for (const n of graph.nodes) {
      tryAdmitFromQueue(n.id);
    }

    if (t % 300 === 0) {
      const totalInVenue = Object.values(occupancy).reduce((s, x) => s + x, 0) + Object.values(waitQueue).reduce((s, q) => s + q.length, 0);
      const byNodeTop = Object.entries(occupancy)
        .map(([nodeId, occ]) => ({ nodeId, occupancy: occ + (waitQueue[nodeId]?.length || 0) }))
        .sort((a, b) => b.occupancy - a.occupancy)
        .slice(0, 6);
      timeseries.push({ tMinute: Math.round(t / 60), totalInVenue, byNodeTop });
    }
  }

  const visitorsSimulated = visitorCounter;
  const completedVisitors = completed.length;

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
  const totalTimes = completed.map((v) => (v.completedAtSecond! - v.enteredAtSecond));
  const waits = completed.map((v) => v.totalWaitSeconds);
  const travels = completed.map((v) => v.totalTravelSeconds);

  const avgTotalTimeSeconds = avg(totalTimes);
  const avgWaitSeconds = avg(waits);
  const avgTravelSeconds = avg(travels);

  const bottlenecks: TwinCongestionPoint[] = graph.nodes
    .map((n) => {
      const s = nodeStats[n.id];
      const avgWait = s.waitCount ? s.waitSum / s.waitCount : 0;
      const peakUtil = (s.peak / Math.max(1, n.capacity)) * 100;
      return {
        nodeId: n.id,
        nameAr: n.nameAr,
        peakOccupancy: s.peak,
        capacity: n.capacity,
        peakUtilizationPct: Math.round(peakUtil * 10) / 10,
        avgWaitSeconds: Math.round(avgWait),
      };
    })
    .sort((a, b) => (b.peakUtilizationPct - a.peakUtilizationPct) || (b.avgWaitSeconds - a.avgWaitSeconds))
    .slice(0, 8);

  // KPI heuristics
  const completionRatePct = visitorsSimulated ? (completedVisitors / visitorsSimulated) * 100 : 0;
  const congestionScore0to100 = Math.max(0, Math.min(100, 100 - (avgWaitSeconds / 6) - (bottlenecks[0]?.peakUtilizationPct ?? 0) / 2));
  const predictedSatisfaction0to100 = Math.max(0, Math.min(100, 70 + completionRatePct * 0.2 + congestionScore0to100 * 0.2));

  return {
    runId,
    twinId,
    profile,
    totals: {
      visitorsSimulated,
      completedVisitors,
      avgTotalTimeSeconds: Math.round(avgTotalTimeSeconds),
      avgWaitSeconds: Math.round(avgWaitSeconds),
      avgTravelSeconds: Math.round(avgTravelSeconds),
    },
    kpis: {
      congestionScore0to100: Math.round(congestionScore0to100),
      completionRatePct: Math.round(completionRatePct * 10) / 10,
      predictedSatisfaction0to100: Math.round(predictedSatisfaction0to100),
    },
    bottlenecks,
    timeseries,
  };
}
