
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
export class IngestUrbanExperienceCorpusDto {
  @IsString() title!: string;
  @IsString() text!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() languageCode?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
