import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class RunCultureProgramsRetrievalDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() programType?: string;
  @IsOptional() @IsString() audienceSegment?: string;
  @IsOptional() @IsInt() @Min(1) @Max(25) topK?: number;
}
