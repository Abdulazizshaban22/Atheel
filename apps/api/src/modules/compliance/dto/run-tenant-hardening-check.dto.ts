import { IsArray, IsOptional, IsString } from 'class-validator';

export class RunTenantHardeningCheckDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsArray() enabledCapabilities?: string[];
  @IsOptional() @IsString() deploymentTier?: string;
  @IsOptional() @IsString() dataClassification?: string;
}
