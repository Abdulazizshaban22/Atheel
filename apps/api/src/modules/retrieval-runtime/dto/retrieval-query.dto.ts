import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
export class RetrievalQueryDto {
  @IsString()
  @MaxLength(5000)
  query!: string;
  @IsOptional()
  @IsString()
  domain?: string;
  filters?: Record<string, unknown>;
  @IsOptional()
  @IsNumber()
  topK?: number;
}
