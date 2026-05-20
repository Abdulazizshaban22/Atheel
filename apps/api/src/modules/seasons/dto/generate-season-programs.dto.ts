import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateSaudiSeasonProgramsDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(10000)
  @Max(200000000)
  budgetSar?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  eventsCount?: number;

  // creation controls
  @IsOptional()
  @IsString()
  seasonCode?: string;

  @IsOptional()
  @IsString()
  seasonNameAr?: string;

  @IsOptional()
  @IsBoolean()
  autoCreateProjects?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateApprovals?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSubmitApprovals?: boolean;

  @IsOptional()
  @IsBoolean()
  autoEnqueueWorkflows?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerateLicensingChecklist?: boolean;


  // Wave49: season -> operation packets + exports
  @IsOptional()
  @IsBoolean()
  autoGenerateSeasonPacket?: boolean;

  @IsOptional()
  @IsBoolean()
  autoExportSeasonPacket?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerateEventPackets?: boolean;

  @IsOptional()
  @IsBoolean()
  autoExportEventPackets?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  maxEventPackets?: number;

  // Wave50: قالب تسليم رسمي حسب نوع الجهة المستلمة
  @IsOptional()
  @IsString()
  recipientNameAr?: string;

  @IsOptional()
  @IsString()
  recipientNameEn?: string;

  @IsOptional()
  @IsString()
  recipientKind?: string;

}
