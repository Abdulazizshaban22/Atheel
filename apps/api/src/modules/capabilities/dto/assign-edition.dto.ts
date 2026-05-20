import { IsOptional, IsString } from 'class-validator';

export class AssignEditionDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() editionCode!: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
