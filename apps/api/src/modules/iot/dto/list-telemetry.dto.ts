import { IsOptional, IsString } from 'class-validator';

export class ListTelemetryDto {
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() twinId?: string;
  @IsOptional() limit?: number;
}
