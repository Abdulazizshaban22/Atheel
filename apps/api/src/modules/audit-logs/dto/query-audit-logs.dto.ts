import { IsOptional, IsString } from 'class-validator';

export class QueryAuditLogsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() q?: string;
}
