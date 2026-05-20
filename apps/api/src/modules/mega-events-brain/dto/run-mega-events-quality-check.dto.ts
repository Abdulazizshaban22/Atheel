import { IsOptional, IsString } from 'class-validator';

export class RunMegaEventsQualityCheckDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  eventType?: string;
}
