import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
export class IngestCultureProgramsCorpusDto {
  @IsString() organizationId!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() title!: string;
  @IsString() text!: string;
  @IsOptional() @IsString() languageCode?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
