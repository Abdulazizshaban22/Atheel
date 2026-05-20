import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateLocalOfferDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() partnerId?: string;
  @IsString() titleAr!: string;
  @IsOptional() @IsString() titleEn?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() pricingBand?: string;
}
