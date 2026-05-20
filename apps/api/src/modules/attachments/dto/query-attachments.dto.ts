import { IsOptional, IsString } from 'class-validator';

export class QueryAttachmentsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
}
