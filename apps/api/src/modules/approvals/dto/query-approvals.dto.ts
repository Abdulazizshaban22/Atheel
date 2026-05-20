import { IsOptional, IsString } from 'class-validator';

export class QueryApprovalsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() status?: string;
}
