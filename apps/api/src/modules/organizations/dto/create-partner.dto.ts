import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePartnerDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsIn(['government_entity','venue_operator','museum_operator','vendor','artisan','sponsor','community_partner','tourism_partner'])
  partnerType!: 'government_entity' | 'venue_operator' | 'museum_operator' | 'vendor' | 'artisan' | 'sponsor' | 'community_partner' | 'tourism_partner';
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsArray() capabilities?: string[];
  @IsOptional() @IsArray() contributionAreas?: string[];
}
