import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class IngestMegaEventsCorpusDto {
  @IsString()
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
  @IsString()
  languageCode?: 'ar' | 'en';

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
