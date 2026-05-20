import type { Prisma } from '@prisma/client';
import type { VisitorExperience } from '@madar/shared';

export type ExperienceRecord = VisitorExperience & {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  targetAudience?: string | null;
  accessibilityFlags?: unknown;
};

export type ExperienceDeleteResult = { id: string; deleted: true };

export type ExperienceCreateData = Pick<ExperienceRecord, 'projectId' | 'titleAr' | 'experienceType' | 'durationMinutesDefault'> & {
  id?: string;
  publishStatus?: ExperienceRecord['publishStatus'];
  twinId?: string | null;
};

export type ExperienceUpdateData = Partial<
  Pick<ExperienceRecord, 'titleAr' | 'experienceType' | 'durationMinutesDefault' | 'publishStatus' | 'twinId'>
>;

export type ExperiencePrismaCreateData = Prisma.VisitorExperienceUncheckedCreateInput;
export type ExperiencePrismaUpdateData = Prisma.VisitorExperienceUncheckedUpdateInput;

export type EnsureTwinResult = {
  ok: boolean;
  linked: boolean;
  alreadyLinked: boolean;
  reason: 'create' | 'manual' | 'simulation';
  experience: ExperienceRecord | null;
  twin: TwinRecord | null;
  error?: string;
  queued?: boolean;
  mode?: string;
  queue?: string;
  jobId?: string | null;
};

export type ExperienceSimulationInput = {
  agents?: number;
  seed?: string;
  entryNodeIds?: string[];
  maxSteps?: number;
  stepTimeoutMs?: number;
};

export type TwinExperienceServiceFacade = {
  buildExperienceBlueprint?: (id: string, body: Record<string, unknown>) => Promise<unknown> | unknown;
  updateExperienceJourney?: (id: string, body: Record<string, unknown>) => Promise<unknown> | unknown;
  getExperienceTouchpoints?: (id: string) => Promise<unknown> | unknown;
  simulateExperienceTriggers?: (id: string, body: Record<string, unknown>) => Promise<unknown> | unknown;
};
