import { IsString } from 'class-validator';

export class AnalyzeCompetitionDto {
  @IsString() attachmentId!: string;
}
