import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EvalContextDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  content!: string;
}

export class EvalOutputDto {
  @IsOptional()
  @IsString()
  objective?: string;

  @IsString()
  output!: string;

  @IsOptional()
  @IsBoolean()
  requireArabic?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSections?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => EvalContextDto)
  contexts?: EvalContextDto[];
}
