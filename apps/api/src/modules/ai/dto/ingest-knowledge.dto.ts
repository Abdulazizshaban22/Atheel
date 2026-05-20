import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class IngestKnowledgeDto {
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() title!: string;
  @IsOptional() @IsIn(['manual', 'file', 'url', 'template']) sourceType?: 'manual' | 'file' | 'url' | 'template';
  @IsOptional() @IsString() sourceRef?: string;
  @IsOptional() @IsIn(['ar', 'en']) languageCode?: 'ar' | 'en';
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() text!: string;
  @IsOptional() @IsInt() @Min(300) @Max(5000) chunkSizeChars?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) overlapChars?: number;
  @IsOptional() @IsBoolean() embedNow?: boolean;
  @IsOptional() @IsString() embedProviderId?: string;
}

