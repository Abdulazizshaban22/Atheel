import { IsOptional, IsString } from 'class-validator';

export class QueryOperationalEventsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() limit?: string;
}
