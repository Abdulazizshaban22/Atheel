import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateImpactModelDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() code!: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsString() descriptionAr?: string;

  // JSON object: { dimensions:[...], weights:{...} }
  @IsOptional() @IsObject() modelJson?: any;
}
