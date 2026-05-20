import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RerankCandidateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  recencyDays?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}

export class RerankDto {
  @IsString()
  query!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RerankCandidateDto)
  candidates!: RerankCandidateDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}
