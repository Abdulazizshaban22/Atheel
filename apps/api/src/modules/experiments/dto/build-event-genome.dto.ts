import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class BuildEventGenomeDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() experimentId?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsString() audienceType?: string;
  @IsOptional() @IsString() venueType?: string;
  @IsOptional() @IsString() heritageSensitivity?: string;
  @IsOptional() @IsString() operatingIntensity?: string;
  @IsOptional() @IsNumber() predictedVisitors?: number;
  @IsOptional() @IsObject() engagementSignals?: Record<string, unknown>;
  @IsOptional() @IsObject() legacySignals?: Record<string, unknown>;
}
