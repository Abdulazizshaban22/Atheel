import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateContentAssistDto {
  @IsString() prompt!: string;
  @IsOptional() @IsIn(['summary','rewrite','translation','tone_polish']) mode?: 'summary'|'rewrite'|'translation'|'tone_polish';
  @IsOptional() @IsIn(['ar','en']) targetLanguage?: 'ar' | 'en';
  @IsOptional() @IsString() projectContext?: string;
}
