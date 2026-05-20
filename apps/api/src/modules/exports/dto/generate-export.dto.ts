import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateExportDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsBoolean()
  async?: boolean;

  @IsOptional()
  @IsBoolean()
  includePptx?: boolean;

  @IsOptional()
  @IsBoolean()
  includePdf?: boolean;

  @IsOptional()
  @IsBoolean()
  includeBundleZip?: boolean;

  @IsOptional()
  @IsBoolean()
  includeSignatures?: boolean;

  @IsOptional()
  @IsBoolean()
  refineWithLlm?: boolean;

  @IsOptional()
  @IsIn(['A4', 'Letter'])
  pageSize?: 'A4' | 'Letter';

  // Wave50: قالب حكومي ثابت حسب نوع الجهة المستلمة
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
