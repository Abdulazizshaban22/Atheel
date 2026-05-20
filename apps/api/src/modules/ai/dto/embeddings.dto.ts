import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class EmbeddingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(512)
  @IsString({ each: true })
  texts!: string[];

  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(4096)
  dimensions?: number;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
