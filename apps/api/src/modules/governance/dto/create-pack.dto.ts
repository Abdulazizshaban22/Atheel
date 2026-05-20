import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateGovernancePolicyPackDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsIn(['global','organization']) scope?: 'global'|'organization';
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}
