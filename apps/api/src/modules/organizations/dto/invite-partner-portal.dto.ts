import { IsArray, IsOptional, IsString } from 'class-validator';

export class InvitePartnerPortalDto {
  @IsOptional() @IsString() invitedByUserId?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsArray() scopes?: string[];
}
