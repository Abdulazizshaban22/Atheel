import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ExportStudioScopeDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsBoolean() includePdf?: boolean;
  @IsOptional() @IsBoolean() includeSignatures?: boolean;
  @IsOptional() @IsString() pageSize?: 'A4' | 'Letter';
}
