import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RagQueryDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(20) topK?: number;
  @IsOptional() @IsIn(['lexical','vector','hybrid']) strategy?: 'lexical' | 'vector' | 'hybrid';
  @IsOptional() minScore?: number;
  @IsOptional() @IsBoolean() synthesize?: boolean;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsIn(['ar', 'en']) outputLanguage?: 'ar' | 'en';
  @IsOptional() @IsIn(['answer', 'brief', 'draft_content']) mode?: 'answer' | 'brief' | 'draft_content';
}
