import { IsOptional, IsString } from 'class-validator';

export class QueryStageGatesDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() templateKey?: string;
}
