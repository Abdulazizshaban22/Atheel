import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateKsaEventLicensingChecklistDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  // subjectType/subjectId allow linking to program/project/season
  @IsString()
  @MaxLength(60)
  subjectType!: string;

  @IsString()
  @MaxLength(80)
  subjectId!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  eventFormat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500000)
  expectedAttendance?: number;

  @IsOptional()
  @IsBoolean()
  hasFood?: boolean;

  @IsOptional()
  @IsBoolean()
  usesAmplifiedSound?: boolean;

  @IsOptional()
  @IsBoolean()
  includesFilming?: boolean;
}
