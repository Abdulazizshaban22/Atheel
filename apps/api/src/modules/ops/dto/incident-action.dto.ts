import { IsOptional, IsString, MaxLength } from 'class-validator';

export class IncidentActionDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  until?: string; // ISO timestamp
}
