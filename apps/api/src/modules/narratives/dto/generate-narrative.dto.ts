import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateNarrativeDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  ideaId?: string;

  @IsOptional()
  @IsString()
  experienceId?: string;

  @IsOptional()
  @IsString()
  twinId?: string;

  @IsOptional()
  @IsIn(['A', 'B', 'single'])
  variant?: 'A' | 'B' | 'single';

  @IsOptional()
  @IsIn(['immersive', 'educational', 'minimal'])
  style?: 'immersive' | 'educational' | 'minimal';
}
