import { IsOptional, IsString } from 'class-validator';
export class RunCultureProgramsEvalDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
}
