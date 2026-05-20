import { IsInt, IsOptional, IsString, Max, Min, Matches } from 'class-validator';

export class UpsertOpsSettingsDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  quietHoursStart?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  quietHoursEnd?: string | null;

  @IsOptional()
  @IsString()
  quietHoursTz?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  outboxDedupWindowMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  approvalsReviewerCooldownMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  approvalsMaxActivePerReviewer?: number;
}
