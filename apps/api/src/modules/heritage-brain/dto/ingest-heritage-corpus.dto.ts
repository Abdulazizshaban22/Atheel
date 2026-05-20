import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class IngestHeritageCorpusDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  text!: string;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}
