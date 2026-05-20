import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInternalNotificationDto {
  @IsString()
  @MaxLength(300)
  titleAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  messageAr?: string;

  @IsOptional()
  @IsString()
  organizationId?: string | null;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsIn(['info','success','warning','error','critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  entityType?: string | null;

  @IsOptional()
  @IsString()
  entityId?: string | null;

  @IsOptional()
  @IsObject()
  metaJson?: Record<string, unknown> | null;
}
