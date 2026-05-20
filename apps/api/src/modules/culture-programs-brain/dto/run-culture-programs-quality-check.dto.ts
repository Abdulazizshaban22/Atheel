import { IsOptional, IsString } from 'class-validator';
export class RunCultureProgramsQualityCheckDto {
  @IsOptional() @IsString() organizationId?: string;
}
