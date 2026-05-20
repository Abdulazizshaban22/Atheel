import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import type { PlatformRole } from '../../auth/constants';

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() roles?: PlatformRole[];
  @IsOptional() @IsArray() orgIds?: string[];
}
