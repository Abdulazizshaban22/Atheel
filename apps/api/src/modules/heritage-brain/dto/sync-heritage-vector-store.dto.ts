import { IsIn, IsOptional, IsString } from 'class-validator';

export class SyncHeritageVectorStoreDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  corpusId?: string;

  @IsOptional()
  @IsIn(['openai_vector_store', 'pgvector'])
  provider?: 'openai_vector_store' | 'pgvector';
}
