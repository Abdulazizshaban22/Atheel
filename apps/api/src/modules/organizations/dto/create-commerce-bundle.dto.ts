import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCommerceBundleDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() experienceId?: string;
  @IsString() titleAr!: string;
  @IsOptional() @IsString() titleEn?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() offerIds?: string[];
  @IsOptional() @IsString() pricingBand?: string;
  @IsOptional() @IsString() legacyIntent?: string;
}
