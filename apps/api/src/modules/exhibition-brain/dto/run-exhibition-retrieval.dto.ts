import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
export class RunExhibitionRetrievalDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
  @IsString()
  @MaxLength(5000)
  query!: string;
  @IsOptional()
  @IsNumber()
  topK?: number;
  exhibitType?: string;
  audienceSegment?: string;
}
