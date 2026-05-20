import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RagEvalCaseDto {
  @IsString() query!: string;
  // Relevance labels (at least one of them)
  @IsOptional() @IsArray() @IsString({ each: true }) relevantChunkIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) relevantDocumentIds?: string[];
}

export class RagEvaluateDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) topK?: number;

  @IsArray() @ValidateNested({ each: true }) @Type(() => RagEvalCaseDto)
  cases!: RagEvalCaseDto[];
}
