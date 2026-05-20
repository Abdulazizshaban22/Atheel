import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
export class RunExhibitionQualityCheckDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
}
