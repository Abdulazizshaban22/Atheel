import { IsOptional, IsString } from 'class-validator';

export class QueryOutboxDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() incidentKey?: string;
  @IsOptional() @IsString() limit?: string;
}
