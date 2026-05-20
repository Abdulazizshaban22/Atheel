import { IsArray, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';

export class PolicyAwareHeritageRetrievalDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsIn(['ar', 'en'])
  languageCode?: 'ar' | 'en';

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @Min(1)
  @Max(20)
  topK?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  sensitivity?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsIn(['research', 'activation', 'conservation', 'interpretation'])
  useCase?: 'research' | 'activation' | 'conservation' | 'interpretation';
}
