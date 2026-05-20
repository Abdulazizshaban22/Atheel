import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateContentAssistDto } from './dto/generate-content-assist.dto';
import { CreativePackDto } from './dto/creative-pack.dto';
import { RegisterAiProviderDto } from './dto/register-ai-provider.dto';
import { IngestKnowledgeDto } from './dto/ingest-knowledge.dto';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagEvaluateDto } from './dto/rag-evaluate.dto';
import { AgentRunDto } from './dto/agent-run.dto';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { ReembedKnowledgeDto } from './dto/reembed-knowledge.dto';
import { RouteModelDto } from './dto/route-model.dto';
import { EmbeddingsDto } from './dto/embeddings.dto';
import { RerankDto } from './dto/rerank.dto';
import { EvalOutputDto } from './dto/eval-output.dto';
import { ExecutePromptTemplateDto } from './dto/execute-prompt-template.dto';
import { DecisionRecommendationDto } from './dto/decision-recommendation.dto';
import { RunAgentEvalDto } from './dto/run-agent-eval.dto';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { EnqueueDecisionRecommendationDto } from './dto/enqueue-decision-recommendation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Public } from '../auth/decorators/public.decorator';
import { assertWorkerToken } from '../../common/security/worker-token';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('providers')
  listProviders(@Query('organizationId') organizationId?: string) {
    return this.service.listProviders({ organizationId });
  }

  @Post('providers')
  registerProvider(@Body() dto: RegisterAiProviderDto, @CurrentUser() user?: RequestUser) {
    return this.service.registerProvider(dto, user);
  }

  @Get('knowledge/docs')
  listKnowledgeDocs(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string, @Query('q') q?: string) {
    return this.service.listKnowledgeDocuments({ organizationId, projectId, q });
  }

  @Get('knowledge/chunks')
  listKnowledgeChunks(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.service.listKnowledgeChunks({ organizationId, projectId });
  }

  @Post('knowledge/ingest')
  ingestKnowledge(@Body() dto: IngestKnowledgeDto, @CurrentUser() user?: RequestUser) {
    return this.service.ingestKnowledge(dto, user);
  }

  @Post('knowledge/reembed')
  reembedKnowledge(@Body() dto: ReembedKnowledgeDto) {
    return this.service.reembedKnowledge(dto);
  }

  @Post('rag/query')
  ragQuery(@Body() dto: RagQueryDto) {
    return this.service.ragQuery(dto);
  }

  // Admin-only: offline evaluation of retrieval quality on labeled test cases
  @Roles('org_admin', 'super_admin')
  @Post('rag/evaluate')
  ragEvaluate(@Body() dto: RagEvaluateDto) {
    return this.service.evaluateRag(dto);
  }

  @Post('chat')
  chat(@Body() dto: ChatCompletionDto) {
    return this.service.chat(dto);
  }

  @Post('routing/model')
  routeModel(@Body() dto: RouteModelDto) {
    return this.service.routeModel(dto);
  }

  @Post('embeddings')
  embeddings(@Body() dto: EmbeddingsDto) {
    return this.service.embedText(dto as any);
  }

  @Post('rerank')
  rerank(@Body() dto: RerankDto) {
    return this.service.rerankTexts(dto as any);
  }

  @Post('eval/output')
  evalOutput(@Body() dto: EvalOutputDto) {
    return this.service.evaluateOutput(dto as any);
  }

  @Post('prompt-templates/execute')
  executePromptTemplate(@Body() dto: ExecutePromptTemplateDto) {
    return this.service.executePromptTemplate(dto as any);
  }

  @Get('agents/runs')
  listAgentRuns(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
    return this.service.listAgentRuns({ organizationId, projectId });
  }

  @Post('agents/run')
  runAgent(@Body() dto: AgentRunDto, @CurrentUser() user?: RequestUser) {
    return this.service.runAgent(dto, user);
  }



@Post('agents/register')
registerAgent(@Body() dto: RegisterAgentDto, @CurrentUser() user?: RequestUser) {
  return this.service.registerAgentRegistry(dto as any, user);
}

@Post('agents/:id/evals/run')
runAgentEval(@Param('id') id: string, @Body() dto: RunAgentEvalDto) {
  return this.service.runAgentEvalByPath(id, dto as any);
}

@Get('agents/:id/scorecard')
agentScorecard(@Param('id') id: string) {
  return this.service.getAgentScorecardByPath(id);
}

@Post('decision/recommendations/destination')
recommendDestination(@Body() dto: DecisionRecommendationDto) {
  return this.service.generateDecisionRecommendation('destination', dto as any);
}

@Post('decision/recommendations/heritage')
recommendHeritage(@Body() dto: DecisionRecommendationDto) {
  return this.service.generateDecisionRecommendation('heritage', dto as any);
}

@Post('decision/recommendations/experience')
recommendExperience(@Body() dto: DecisionRecommendationDto) {
  return this.service.generateDecisionRecommendation('experience', dto as any);
}


@Post('decision/recommendations/:kind/async')
enqueueRecommendation(@Param('kind') kind: 'destination'|'heritage'|'experience', @Body() dto: EnqueueDecisionRecommendationDto) {
  return this.service.enqueueDecisionRecommendation(kind, dto as any);
}

@Get('jobs')
listAiJobs(@Query('organizationId') organizationId?: string, @Query('projectId') projectId?: string) {
  return this.service.listAsyncDecisionJobs({ organizationId, projectId });
}

  @Public()
  @Post('jobs/:id/process')
  processAiJob(@Param('id') id: string, @Req() req: any) {
    assertWorkerToken(req);
    return this.service.processAsyncDecisionJob(id);
  }

  @Post('content-assist')
  contentAssist(@Body() dto: GenerateContentAssistDto){ return this.service.generateAssist(dto); }

  @Post('creative/pack')
  creativePack(@Body() dto: CreativePackDto){ return this.service.generateCreativePack(dto); }

  @Get('runtime/health')
  runtimeHealth() { return this.service.runtimeHealth(); }
}
