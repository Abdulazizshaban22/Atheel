import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTwinSpecDto {
  @IsString()
  twinId!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  titleAr?: string;

  // Operational studio
  @IsOptional()
  @IsString()
  competitionId?: string;

  // Creative studio
  @IsOptional()
  @IsString()
  vaultBoardId?: string;

  @IsOptional()
  @IsArray()
  vaultIdeaIds?: string[];

  // Inclusion flags
  @IsOptional()
  @IsBoolean()
  includeNarratives?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRisks?: boolean;

  @IsOptional()
  @IsBoolean()
  includeObligations?: boolean;

  // Optional: use LLM to place narrative beats on nodes
  @IsOptional()
  @IsString()
  providerId?: string;
}
