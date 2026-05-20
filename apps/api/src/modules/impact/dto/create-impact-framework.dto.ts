import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateImpactFrameworkDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() code!: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsArray() dimensions?: string[];
}
