import { IsOptional, IsString } from 'class-validator';

export class QueryCompetitionsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() q?: string;
}
