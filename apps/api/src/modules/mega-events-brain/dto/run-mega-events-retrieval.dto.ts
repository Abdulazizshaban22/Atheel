import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RunMegaEventsRetrievalDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  topK?: number;
}
