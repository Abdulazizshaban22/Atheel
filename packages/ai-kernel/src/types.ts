export type AiProviderKind = 'mock' | 'vllm_openai_compatible';

export interface AiProviderConfig {
  id: string;
  organizationId?: string;
  name: string;
  kind: AiProviderKind;
  baseUrl?: string;
  apiKeyEnvName?: string;
  modelName?: string;
  isActive?: boolean;
  temperatureDefault?: number;
  maxTokensDefault?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  organizationId?: string;
  projectId?: string;
  title?: string;
  sourceType?: 'manual' | 'file' | 'url' | 'template';
  languageCode?: 'ar' | 'en';
  text: string;
  tags?: string[];
  chunkIndex: number;
  tokenEstimate: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  chunk: KnowledgeChunk;
  score: number;
  matches: string[];
}
