import { IsOptional, IsString } from 'class-validator';

export class RunHeritageQualityCheckDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
}
