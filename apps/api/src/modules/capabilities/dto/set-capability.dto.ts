import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetCapabilityDto {
  @IsString()
  @MaxLength(80)
  packCode!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
