import { IsOptional, IsString, MaxLength } from 'class-validator';
export class RunExhibitionEvalDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
  @IsString()
  @MaxLength(5000)
  query!: string;
}
