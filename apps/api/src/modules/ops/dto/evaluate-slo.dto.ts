import { IsOptional, IsString } from 'class-validator';

export class EvaluateSloDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  dryRun?: string; // 'true'|'false'
}
