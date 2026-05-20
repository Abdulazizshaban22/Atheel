import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateNarrativePolicyDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsString() expectedTone?: string;
  @IsOptional() @IsArray() protectedTerms?: string[];
  @IsOptional() @IsArray() bannedTerms?: string[];
  @IsOptional() @IsArray() requiredThemes?: string[];
}
