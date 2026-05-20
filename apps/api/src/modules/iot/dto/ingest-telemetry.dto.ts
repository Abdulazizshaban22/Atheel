import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class IngestTelemetryDto {
  @IsString() deviceId!: string;
  @IsOptional() @IsString() deviceKey?: string; // optional if provided in header
  @IsOptional() @IsString() twinId?: string;
  @IsOptional() @IsString() nodeId?: string;

  @IsIn(['footfall','occupancy','temperature','noise','incident','manual_note'])
  kind!: 'footfall' | 'occupancy' | 'temperature' | 'noise' | 'incident' | 'manual_note';

  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @IsOptional() @IsString() ts?: string;
}
