import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateVisitorProfileDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() homeCity?: string;
  @IsOptional() @IsString() persona?: string;
  @IsOptional() @IsArray() interests?: string[];
  @IsOptional() @IsArray() accessibilityNeeds?: string[];
}
