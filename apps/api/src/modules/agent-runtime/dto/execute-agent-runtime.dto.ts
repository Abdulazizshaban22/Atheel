export class ExecuteAgentRuntimeDto {
  domain!: string;
  taskType!: string;
  input!: Record<string, unknown>;
  model?: string;
  priority?: 'normal' | 'high';
  riskLevel?: 'low' | 'medium' | 'high';
}
