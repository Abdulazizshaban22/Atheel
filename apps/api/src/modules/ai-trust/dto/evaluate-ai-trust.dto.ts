import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
export class EvaluateAiTrustDto {
  jobId!: string;
  @IsOptional()
  @IsString()
  domain?: string;
  confidence?: number;
  groundingScore?: number;
  riskLevel?: 'low'|'medium'|'high';
  policyRisk?: 'normal'|'elevated';
  sources?: Array<Record<string, unknown>>;
}
