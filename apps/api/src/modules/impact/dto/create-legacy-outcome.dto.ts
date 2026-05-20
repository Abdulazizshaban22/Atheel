import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateLegacyOutcomeDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() seasonId?: string;
  @IsString() projectId!: string;
  @IsOptional() @IsArray() outcomes?: string[];
  @IsOptional() @IsString() localEconomicValueBand?: string;
  @IsOptional() @IsString() culturalImpactLevel?: string;
}
