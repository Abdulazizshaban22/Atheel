import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class RecommendFromMemoryDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() destinationType?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsArray() desiredOutcomes?: string[];
  @IsOptional() @IsObject() targetProfile?: Record<string, unknown>;
}
