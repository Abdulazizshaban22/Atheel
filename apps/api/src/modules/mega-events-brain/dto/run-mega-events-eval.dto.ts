import { IsOptional, IsString } from 'class-validator';

export class RunMegaEventsEvalDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
