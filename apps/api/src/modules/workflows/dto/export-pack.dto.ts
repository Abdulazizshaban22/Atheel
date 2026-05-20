import { IsArray, IsOptional, IsString } from 'class-validator';

export class ExportPackDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() createdByUserId?: string;
}
