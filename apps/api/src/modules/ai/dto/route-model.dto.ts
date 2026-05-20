import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RouteModelDto {
  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsIn(['starter', 'standard', 'advanced'])
  complexity?: 'starter' | 'standard' | 'advanced';

  @IsOptional()
  @IsBoolean()
  requiresCitations?: boolean;

  @IsOptional()
  @IsBoolean()
  latencySensitive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(200000)
  tokenBudget?: number;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;
}
