import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateContentItemDto {
  @IsString() organizationId!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() title!: string;
  @IsIn(['ar','en']) languageCode!: 'ar' | 'en';
  @IsIn(['article','stop_text','audio_script','label','educational','campaign','presentation','strategy','feasibility','approval_packet']) contentType!:
    'article'|'stop_text'|'audio_script'|'label'|'educational'|'campaign'|'presentation'|'strategy'|'feasibility'|'approval_packet';
  @IsOptional() @IsIn(['draft','in_review','approved','published','archived']) status?:
    'draft'|'in_review'|'approved'|'published'|'archived';
  @IsOptional() @IsString() summary?: string;
}
