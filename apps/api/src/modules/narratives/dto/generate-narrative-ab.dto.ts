import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateNarrativeABDto {
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
  @IsIn(['immersive', 'educational', 'minimal'])
  styleA?: 'immersive' | 'educational' | 'minimal';

  @IsOptional()
  @IsIn(['immersive', 'educational', 'minimal'])
  styleB?: 'immersive' | 'educational' | 'minimal';
}
