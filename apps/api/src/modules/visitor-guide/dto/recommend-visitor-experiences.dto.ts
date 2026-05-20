import { IsOptional, IsString } from 'class-validator';

export class RecommendVisitorExperiencesDto {
  @IsString() visitorId!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() city?: string;
}
