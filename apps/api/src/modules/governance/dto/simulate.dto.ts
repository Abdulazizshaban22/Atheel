import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimulateGovernancePolicyDto {
  @IsString() organizationId!: string;

  @IsOptional() @IsString() versionId?: string;
  @IsOptional() policyJson?: any;

  @IsIn(['approval','workflow']) kind!: 'approval'|'workflow';
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() dueAtIso?: string;
  @IsOptional() @IsString() createdAtIso?: string;
  @IsOptional() @IsString() currentApproverId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() title?: string;
}
