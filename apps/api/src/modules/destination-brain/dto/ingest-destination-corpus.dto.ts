import { IsArray, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class IngestDestinationCorpusDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  text!: string;

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
