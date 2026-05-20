import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateHeritageSafetyProfileDto {
  @IsOptional()
  @IsIn(['low','medium','high','critical'])
  sensitivityLevel?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  visitorCapacityPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  visitorCapacityPerHour?: number;

  @IsOptional()
  @IsArray()
  restrictedActivities?: string[];

  @IsOptional()
  @IsArray()
  requiredControls?: string[];

  @IsOptional()
  @IsArray()
  allowedExperienceTypes?: string[];

  @IsOptional()
  @IsArray()
  blockedExperienceTypes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conservationNotesAr?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
