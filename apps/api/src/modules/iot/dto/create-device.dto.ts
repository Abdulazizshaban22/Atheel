import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDeviceDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() twinId?: string;

  @IsString() nameAr!: string;

  @IsIn(['sensor','gateway','camera','counter','beacon','manual'])
  kind!: 'sensor' | 'gateway' | 'camera' | 'counter' | 'beacon' | 'manual';

  @IsOptional() metadata?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
