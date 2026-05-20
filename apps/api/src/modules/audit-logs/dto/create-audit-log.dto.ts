import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() action!: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsIn(['info','warning','critical']) severity?: 'info' | 'warning' | 'critical';
  @IsOptional() @IsString() message?: string;
  before?: unknown;
  after?: unknown;
}
