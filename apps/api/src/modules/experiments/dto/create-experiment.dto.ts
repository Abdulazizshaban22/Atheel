import { IsOptional, IsString } from 'class-validator';

export class CreateExperimentDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsString() objectiveAr?: string;
  @IsOptional() @IsString() impactModelId?: string;
}
