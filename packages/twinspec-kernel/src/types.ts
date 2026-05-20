import type { SimulationProfile, TwinAssetKind, TwinEdgeKind, TwinGraph, TwinNodeKind } from '@madar/twin-kernel';

export type TwinSpecVersion = 1;

export type TwinSpecSourceRef = {
  studio: 'creative' | 'operational' | 'narrative' | 'security_compliance';
  kind: string;
  id?: string;
  uri?: string;
  noteAr?: string;
  digestSha256?: string;
};

export type TwinSpecNode = {
  id: string;
  nameAr: string;
  kind: TwinNodeKind;
  capacity: number;
  dwellTimeSecondsAvg: number;
  pos?: { x?: number; y?: number; z?: number; lat?: number; lon?: number; alt?: number };
  tags?: string[];
  // Traceability back to studio outputs
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: TwinEdgeKind;
  distanceMeters: number;
  travelTimeSeconds: number;
  oneWay?: boolean;
  widthMeters?: number;
  capacityPerMinute?: number;
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecLayer = {
  id: string;
  nameAr: string;
  kind: TwinAssetKind;
  uri: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecNarrativeBeat = {
  id: string;
  titleAr: string;
  textAr?: string;
  // Where it lands in the twin
  nodeIds?: string[];
  // If omitted, engine will place it heuristically or via AI
  placementHint?: { keywordsAr?: string[]; zoneCodes?: string[] };
};

export type TwinSpecNarrative = {
  id: string;
  ideaId?: string;
  loglineAr?: string;
  acts?: Array<{ actNo: 1 | 2 | 3; textAr: string }>
  beats?: TwinSpecNarrativeBeat[];
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecConstraint = {
  id: string;
  kind: 'max_occupancy' | 'one_way' | 'restricted' | 'hazard_zone' | 'open_hours' | 'noise_limit' | 'temperature_limit' | 'manual';
  targetNodeId?: string;
  targetEdgeId?: string;
  params: Record<string, unknown>;
  reasonAr?: string;
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecScenario = {
  key: string;
  nameAr: string;
  descriptionAr?: string;
  profile: SimulationProfile;
  // Optional modifications (delta) applied before simulation
  graphDelta?: {
    closedNodeIds?: string[];
    reverseEdges?: boolean;
    setOneWayEdgeIds?: string[];
  };
  expectedKpis?: Array<{ key: string; target: string; noteAr?: string }>;
};

export type TwinSpecConcept = {
  id: string;
  titleAr: string;
  oneLinerAr: string;
  audienceAr?: string;
  formatAr?: string;
  deliverablesAr?: string[];
  kpisAr?: string[];
  risksAr?: string[];
  narrative?: TwinSpecNarrative;
  // concept may map to a scenario variant
  scenarioKey?: string;
  sources?: TwinSpecSourceRef[];
};

export type TwinSpecDocument = {
  version: TwinSpecVersion;
  id: string;
  titleAr: string;
  organizationId?: string;
  projectId?: string;
  twinId: string;
  createdAt: string;
  compiledAt?: string;
  sources: TwinSpecSourceRef[];

  graph: {
    nodes: TwinSpecNode[];
    edges: TwinSpecEdge[];
  };

  layers: TwinSpecLayer[];

  concepts?: TwinSpecConcept[];

  narrative?: {
    narratives: TwinSpecNarrative[];
  };

  securityCompliance?: {
    constraints: TwinSpecConstraint[];
  };

  scenarios: TwinSpecScenario[];

  kpis?: Array<{ key: string; nameAr: string; target: string; noteAr?: string }>;
};

export type TwinScenarioPack = {
  id: string;
  twinId: string;
  specId: string;
  nameAr: string;
  createdAt: string;
  scenarios: TwinSpecScenario[];
};

export type TwinSpecCompileResult = {
  spec: TwinSpecDocument;
  pack: TwinScenarioPack;
  previewGraph: TwinGraph;
  warnings: string[];
};
