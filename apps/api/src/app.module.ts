import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import IORedis from 'ioredis';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { findRepoRootSync } from '@madar/object-store';
import { PrismaModule } from '@madar/db';
import { DataStoreModule } from './modules/data-store/data-store.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ContentModule } from './modules/content/content.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { QueueModule } from './modules/queue/queue.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { CultureModule } from './modules/culture/culture.module';
import { InspirationModule } from './modules/inspiration/inspiration.module';
import { IdeationModule } from './modules/ideation/ideation.module';
import { VaultModule } from './modules/vault/vault.module';
import { TwinModule } from './modules/twin/twin.module';
import { TwinSpecModule } from './modules/twinspec/twinspec.module';
import { ApprovalPacketsModule } from './modules/approval-packets/approval-packets.module';
import { ExportsModule } from './modules/exports/exports.module';
import { VerificationModule } from './modules/verification/verification.module';
import { HeritageMemoryModule } from './modules/heritage-memory/heritage-memory.module';
import { ProgramTemplatesModule } from './modules/program-templates/program-templates.module';
import { VisitorGuideModule } from './modules/visitor-guide/visitor-guide.module';
import { DocumentationModule } from './modules/documentation/documentation.module';
import { NarrativesModule } from './modules/narratives/narratives.module';
import { RisksModule } from './modules/risks/risks.module';
import { ImpactModule } from './modules/impact/impact.module';
import { IiifModule } from './modules/iiif/iiif.module';
import { ContentCredentialsModule } from './modules/content-credentials/content-credentials.module';
import { ExperimentsModule } from './modules/experiments/experiments.module';
import { RadarModule } from './modules/radar/radar.module';
import { StoriesModule } from './modules/stories/stories.module';
import { ResearchModule } from './modules/research/research.module';
import { QualityModule } from './modules/quality/quality.module';
import { OfficialModule } from './modules/official/official.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { KnowledgePacksModule } from './modules/knowledge-packs/knowledge-packs.module';
import { ObligationsModule } from './modules/obligations/obligations.module';
import { IotModule } from './modules/iot/iot.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { OperationalEventsModule } from './modules/operational-events/operational-events.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ServiceOutboxModule } from './modules/service-outbox/service-outbox.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { OpsModule } from './modules/ops/ops.module';
import { HeritageModule } from './modules/heritage/heritage.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { PublicHeritageModule } from './modules/public-heritage/public-heritage.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { CapabilitiesModule } from './modules/capabilities/capabilities.module';
import { StudioModule } from './modules/studio/studio.module';
import { KnowledgeSpineModule } from './modules/knowledge-spine/knowledge-spine.module';
import { HeritageBrainModule } from './modules/heritage-brain/heritage-brain.module';
import { DestinationBrainModule } from './modules/destination-brain/destination-brain.module';
import { MegaEventsBrainModule } from './modules/mega-events-brain/mega-events-brain.module';
import { CultureProgramsBrainModule } from './modules/culture-programs-brain/culture-programs-brain.module';
import { UrbanExperienceBrainModule } from './modules/urban-experience-brain/urban-experience-brain.module';
import { ExhibitionBrainModule } from './modules/exhibition-brain/exhibition-brain.module';

import { AgentRuntimeModule } from './modules/agent-runtime/agent-runtime.module';
import { RetrievalRuntimeModule } from './modules/retrieval-runtime/retrieval-runtime.module';
import { AiTrustModule } from './modules/ai-trust/ai-trust.module';
import { EvalsRuntimeModule } from './modules/evals-runtime/evals-runtime.module';
import { MemoryRuntimeModule } from './modules/memory-runtime/memory-runtime.module';
import { AuditTrailInterceptor } from './common/audit/audit-trail.interceptor';
import { ApiResponseEnvelopeInterceptor } from './common/http/api-response-envelope.interceptor';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(findRepoRootSync(), '.env')],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60_000, limit: Number(process.env.THROTTLE_GLOBAL_LIMIT || 600) },
        { name: 'auth', ttl: 60_000, limit: Number(process.env.THROTTLE_AUTH_LIMIT || 10) },
      ],
      storage: (() => {
        const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || '';
        return redisUrl ? new ThrottlerStorageRedisService(new IORedis(redisUrl, { maxRetriesPerRequest: null })) : undefined;
      })(),
    }),
    MetricsModule,
    PrismaModule,
    DataStoreModule,
    QueueModule,
    RealtimeModule,
    NotificationsModule,
    OutboxModule,
    ServiceOutboxModule,
    OperationalEventsModule,
    GovernanceModule,
    CapabilitiesModule,
    EscalationsModule,
    OpsModule,
    AuthModule,
    HealthModule,
    OrganizationsModule,
    ProjectsModule,
    ContentModule,
    ExperiencesModule,
    UsersModule,
    AuditLogsModule,
    ApprovalsModule,
    AttachmentsModule,
    AnalyticsModule,
    AiModule,
    WorkflowsModule,
    WorkspacesModule,
    ProgramsModule,
    DashboardsModule,
    InspirationModule,
    IdeationModule,
    VaultModule,
    CultureModule,
    TwinModule,
    TwinSpecModule,
    IotModule,
    ApprovalPacketsModule,
    NarrativesModule,
    ImpactModule,
    RisksModule,
    IiifModule,
    ContentCredentialsModule,
    ExperimentsModule,
    RadarModule,
    StoriesModule,
    ResearchModule,
    QualityModule,
    OfficialModule,
    DocumentationModule,
    VisitorGuideModule,
    ProgramTemplatesModule,
    HeritageMemoryModule,
    ExportsModule,
    VerificationModule,
    CompetitionsModule,
    KnowledgePacksModule,
    ObligationsModule,
    HeritageModule,
    ComplianceModule,
    SeasonsModule,
    PublicHeritageModule,
    StudioModule,
    KnowledgeSpineModule,
    HeritageBrainModule,
    DestinationBrainModule,
    MegaEventsBrainModule,
    CultureProgramsBrainModule,
    UrbanExperienceBrainModule,
    ExhibitionBrainModule,
    MemoryRuntimeModule,
    EvalsRuntimeModule,
    AiTrustModule,
    RetrievalRuntimeModule,
    AgentRuntimeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseEnvelopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditTrailInterceptor },
  ],
})
export class AppModule {}
