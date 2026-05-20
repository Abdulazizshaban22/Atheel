import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateSaudiSeasonDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  region?: string; // SaudiRegion code

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(10000)
  @Max(200000000)
  budgetSar?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  eventsCount?: number;
}
