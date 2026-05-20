import { IsOptional, IsString } from 'class-validator';

export class LinkAttachmentDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() entityType!: string;
  @IsString() entityId!: string;
}
