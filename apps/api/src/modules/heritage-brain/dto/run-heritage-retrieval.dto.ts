import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunHeritageRetrievalDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  languageCode?: 'ar' | 'en';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
