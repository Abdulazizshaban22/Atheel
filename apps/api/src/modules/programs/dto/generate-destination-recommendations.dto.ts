import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateDestinationRecommendationsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() programId?: string;
  @IsOptional() @IsString() destinationType?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() preferredThemes?: string[];
  @IsOptional() @IsArray() blockedMonths?: string[];
}
