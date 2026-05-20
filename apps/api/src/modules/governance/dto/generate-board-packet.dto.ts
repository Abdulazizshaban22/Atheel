import { IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateBoardPacketDto {
  @IsString() organizationId!: string;
  @IsOptional() @IsString() approvalId?: string;
  @IsOptional() @IsString() templateKey?: string;
  @IsOptional() @IsObject() evidence?: Record<string, unknown>;
}
