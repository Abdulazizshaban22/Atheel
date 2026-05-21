import { IsOptional, IsString } from 'class-validator';
export class RunExhibitionQualityCheckDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
}
