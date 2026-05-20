export type ApprovalPacketKpis = {
  congestionScore0to100: number;
  completionRatePct: number;
  predictedSatisfaction0to100: number;
  visitorsSimulated?: number;
  completedVisitors?: number;
  avgTotalTimeSeconds?: number;
  avgWaitSeconds?: number;
  avgTravelSeconds?: number;
};

export type ApprovalPacketBottleneck = {
  nodeId: string;
  nameAr: string;
  peakUtilizationPct: number;
  avgWaitSeconds: number;
  capacity: number;
  peakOccupancy: number;
};

export type ApprovalPacketCitation = {
  titleAr: string;
  url?: string;
  noteAr?: string;
};

export type ApprovalPacketSections = {
  executiveSummaryAr: string;
  decisionRequestAr: string;
  assumptionsAr: string[];
  kpis: ApprovalPacketKpis;
  bottlenecks: ApprovalPacketBottleneck[];
  recommendationsAr: string[];
  scenarioNotesAr?: string[];
  citations: ApprovalPacketCitation[];
  artifacts: {
    eventDeckOutlineMarkdown: string;
    strategyMarkdown: string;
    operationalFeasibilityMarkdown: string;
    packetMarkdown: string;
  };
};

export type PacketSimulationProfile = {
  durationMinutes?: number;
  arrivalsPerMinute?: number;
  stepSeconds?: number;
  shortestPathBias?: number;
  arrivalBatches?: Array<{ startMinute: number; endMinute: number; arrivalsPerMinute: number }>;
  closedNodeIds?: string[];
  reverseEdges?: boolean;
};

export type PacketBuildInput = {
  titleAr: string;
  organizationNameAr?: string;
  projectNameAr?: string;
  experienceTitleAr?: string;
  twinNameAr?: string;
  scenarioKey?: string;
  generatedAtIso: string;
  kpis: ApprovalPacketKpis;
  bottlenecks: ApprovalPacketBottleneck[];
  profile?: PacketSimulationProfile;
  citations?: ApprovalPacketCitation[];
  scenarioNotesAr?: string[];
};
