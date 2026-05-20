import { IsOptional, IsString } from "class-validator";

export class RunDestinationQualityCheckDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
