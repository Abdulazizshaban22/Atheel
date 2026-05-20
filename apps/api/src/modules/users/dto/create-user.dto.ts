import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import type { PlatformRole } from '../../auth/constants';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) displayName!: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() roles?: PlatformRole[];
  @IsOptional() @IsArray() orgIds?: string[];
}
