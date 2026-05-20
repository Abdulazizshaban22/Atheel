import { IsOptional, IsString } from 'class-validator';

export class CreateCredentialFromAttachmentDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() noteAr?: string;
  @IsOptional() @IsString() createdByUserId?: string;
}
