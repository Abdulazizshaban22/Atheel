import { IsOptional, IsString } from 'class-validator';

export class ActivateGovernancePolicyDto {
  @IsString() organizationId!: string;
  @IsString() versionId!: string;
  @IsOptional() @IsString() effectiveAtIso?: string;
}
