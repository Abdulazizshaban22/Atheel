import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryContentItemsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsIn(['ar','en']) languageCode?: 'ar'|'en';
  @IsOptional() @IsIn(['article','stop_text','audio_script','label','educational','campaign','presentation','strategy','feasibility','approval_packet']) contentType?:
    'article'|'stop_text'|'audio_script'|'label'|'educational'|'campaign'|'presentation'|'strategy'|'feasibility'|'approval_packet';
  @IsOptional() @IsIn(['draft','in_review','approved','published','archived']) status?:
    'draft'|'in_review'|'approved'|'published'|'archived';
  @IsOptional() @IsString() q?: string;
}
