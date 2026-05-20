import { IsOptional, IsString } from 'class-validator';

export class QueryGovernancePacksDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() q?: string;
}
