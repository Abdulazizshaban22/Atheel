import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetHeritageVectorStoreDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsIn(['openai_vector_store', 'pgvector'])
  provider?: 'openai_vector_store' | 'pgvector';
}
