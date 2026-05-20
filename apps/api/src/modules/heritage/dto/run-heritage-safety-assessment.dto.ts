import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RunHeritageSafetyAssessmentDto {
  @IsOptional()
  @IsString()
  experienceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  experienceType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  expectedVisitors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  peakVisitorsPerHour?: number;

  @IsOptional()
  @IsArray()
  activities?: string[];

  @IsOptional()
  @IsArray()
  controlsProvided?: string[];

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
