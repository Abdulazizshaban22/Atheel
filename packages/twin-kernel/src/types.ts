export type TwinKind = 'venue' | 'route' | 'exhibition' | 'district';
export type CoordinateSystem = 'wgs84' | 'local_xy';

export type TwinNodeKind =
  | 'entry'
  | 'exit'
  | 'exhibit'
  | 'activity'
  | 'service'
  | 'rest'
  | 'corridor'
  | 'staff_only'
  | 'hazard';

export type TwinEdgeKind = 'path' | 'stairs' | 'elevator' | 'queue_lane' | 'restricted';

export type TwinAssetKind = 'geojson' | 'gltf' | 'three_d_tiles' | 'image' | 'pdf' | 'link';

export type SimulationProfile = {
  durationMinutes: number;
  stepSeconds: number;
  arrivalsPerMinute: number;
  startNodeId: string;
  // Optional: fixed route (node ids). If not provided, the simulation will pick next steps probabilistically.
  routeNodeIds?: string[];
  // How strongly visitors prefer shortest edges (0..1). Higher => more deterministic.
  shortestPathBias?: number;
  // If true, allow revisits to exhibits.
  allowRevisit?: boolean;

  // Wave10 scenarios
  /** Burst arrivals windows to model "دخول دفعات". */
  arrivalBatches?: Array<{ startMinute: number; endMinute: number; arrivalsPerMinute: number }>;
  /** Nodes to treat as closed in a scenario run. */
  closedNodeIds?: string[];
  /** Reverse graph edges for a direction-change scenario. */
  reverseEdges?: boolean;
};

export type TwinNode = {
  id: string;
  nameAr: string;
  kind: TwinNodeKind;
  capacity: number; // max concurrent people
  dwellTimeSecondsAvg: number;
  // Position can be WGS84 or local XY.
  pos?: { x?: number; y?: number; z?: number; lat?: number; lon?: number; alt?: number };
  tags?: string[];
};

export type TwinEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: TwinEdgeKind;
  distanceMeters: number;
  travelTimeSeconds: number;
  oneWay?: boolean;
  widthMeters?: number;
  capacityPerMinute?: number;
};

export type TwinGraph = {
  nodes: TwinNode[];
  edges: TwinEdge[];
};

export type TwinCongestionPoint = {
  nodeId: string;
  nameAr: string;
  peakOccupancy: number;
  capacity: number;
  peakUtilizationPct: number;
  avgWaitSeconds: number;
};

export type TwinSimulationSummary = {
  runId: string;
  twinId: string;
  profile: SimulationProfile;
  totals: {
    visitorsSimulated: number;
    completedVisitors: number;
    avgTotalTimeSeconds: number;
    avgWaitSeconds: number;
    avgTravelSeconds: number;
  };
  kpis: {
    congestionScore0to100: number;
    completionRatePct: number;
    predictedSatisfaction0to100: number;
  };
  bottlenecks: TwinCongestionPoint[];
  timeseries: Array<{
    tMinute: number;
    totalInVenue: number;
    byNodeTop: Array<{ nodeId: string; occupancy: number }>;
  }>;
};

export type TwinRoutePlan = {
  startNodeId: string;
  routeNodeIds: string[];
};

export type TelemetryEvent = {
  id: string;
  twinId: string;
  ts: string;
  kind: 'footfall' | 'occupancy' | 'temperature' | 'noise' | 'incident' | 'manual_note';
  nodeId?: string;
  value?: number;
  payload?: Record<string, unknown>;
};
