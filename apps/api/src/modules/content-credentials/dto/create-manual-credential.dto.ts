import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateManualCredentialDto {
  @IsOptional() @IsString() organizationId?: string;

  // "attachment" for existing file, or "external" / "text" لأي أصل خارجي
  @IsOptional() @IsIn(['attachment', 'external', 'text'])
  subjectType?: 'attachment' | 'external' | 'text';

  @IsString() subjectId!: string;
  @IsOptional() @IsString() subjectName?: string;
  @IsOptional() @IsString() sha256?: string;
  @IsOptional() @IsString() noteAr?: string;

  // Optional: provide full manifest payload; otherwise we generate a minimal one.
  @IsOptional() @IsObject() manifestJson?: any;

  @IsOptional() @IsString() createdByUserId?: string;
}
