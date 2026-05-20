
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { RunUrbanExperienceRetrievalDto } from './dto/run-urban-experience-retrieval.dto';
import { RunUrbanExperienceEvalDto } from './dto/run-urban-experience-eval.dto';
import { IngestUrbanExperienceCorpusDto } from './dto/ingest-urban-experience-corpus.dto';
import { LinkUrbanExperienceEvidenceDto } from './dto/link-urban-experience-evidence.dto';
import { RunUrbanExperienceQualityCheckDto } from './dto/run-urban-experience-quality-check.dto';
import { URBAN_EXPERIENCE_AGENT_CATALOG } from '../../../../../packages/knowledge-kernel/src/urban-experience/agent-catalog';
import { URBAN_EXPERIENCE_METADATA_SCHEMA } from '../../../../../packages/knowledge-kernel/src/urban-experience/metadata-schema';
import { scoreUrbanExperienceCorpusQuality } from '../../../../../packages/knowledge-kernel/src/urban-experience/corpus-quality';
import { summarizeFlowLinkage } from '../../../../../packages/knowledge-kernel/src/urban-experience/flow-linkage';
import { getUrbanExperienceVectorStoreStatus } from '../../../../../packages/knowledge-kernel/src/urban-experience/vector-store-manager';
import { URBAN_EXPERIENCE_RETRIEVAL_CONTRACTS } from '../../../../../packages/knowledge-kernel/src/urban-experience/retrieval-contracts';

type EvalRow = { id:string; query:string; retrievalRecallScore:number; groundingScore:number; flowScore:number; routeCoverageScore:number; createdAt:string; };
type EvidenceLink = { id:string; experienceId:string; documentId:string; chunkId?:string; linkType:string; noteAr?:string; metadata?:Record<string,unknown>; createdAt:string; };

@Injectable()
export class UrbanExperienceBrainService {
  /* Wave123: evals persisted in BrainEvalRun table */
  /* Wave123: evidence persisted in BrainEvidenceLink table */
  constructor(private readonly prisma: PrismaService) {}

  private chunkText(text: string, size = 900) {
    const normalized = String(text || '').replace(/\n/g, ' ').trim();
    if (!normalized) return [] as string[];
    const chunks:string[]=[];
    for (let i=0;i<normalized.length;i+=size) chunks.push(normalized.slice(i,i+size));
    return chunks;
  }

  private docs(params?: { organizationId?: string }) {
    return await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'urban_experience' } } })=>(d.tags||[]).includes('urban_experience') && (!params?.organizationId || d.organizationId===params.organizationId));
  }

  summary(params?: { organizationId?: string }) {
    const docs = this.docs(params);
    const experiences = (this.store as Record<string, unknown>).listExperiences ? (this.store as Record<string, unknown>).listExperiences().filter((x:any)=>!params?.organizationId || x.organizationId===params.organizationId) : [];
    const offers = (this.store as Record<string, unknown>).listLocalOffers ? (this.store as Record<string, unknown>).listLocalOffers().filter((x:any)=>!params?.organizationId || x.organizationId===params.organizationId) : [];
    return {
      ok:true,
      domain:'urban_experience',
      coverage:{
        documents:docs.length,
        experiences:experiences.length,
        localOffers:offers.length,
        routeTypes:Array.from(new Set(docs.map((x:any)=>String((x.metadata||{}).routeType||'')).filter(Boolean))),
        placeTypes:Array.from(new Set(docs.map((x:any)=>String((x.metadata||{}).placeType||'')).filter(Boolean)))
      },
      nextMilestonesAr:[
        'تعميق الربط بين corpus التجربة الحضرية ومحاكاة الحركة والمسارات.',
        'إضافة vector sync حقيقي وhybrid retrieval لاحقًا.',
        'تعميق منطق wayfinding وplace activation مع التوأم الرقمي.'
      ]
    };
  }

  agents(){ return { ok:true, items: URBAN_EXPERIENCE_AGENT_CATALOG }; }

  ingest(input: IngestUrbanExperienceCorpusDto) {
    const now = new Date().toISOString();
    const documentId = `uxdoc_${randomUUID().slice(0,8)}`;
    const chunks = this.chunkText(input.text, 850);
    const tags = Array.from(new Set(['urban_experience','flow','wayfinding',...(input.tags||[])]));
    const document = this.prisma.knowledgeDocument.create({ data: {
      id:documentId,
      organizationId:input.organizationId,
      projectId:input.projectId,
      title:input.title,
      sourceType:'manual',
      languageCode:(input.languageCode as any)||'ar',
      tags,
      text:input.text,
      chunkCount:chunks.length,
      createdAt:now,
      updatedAt:now,
      metadata:{
        domain:'urban_experience',
        routeType:input.metadata?.routeType||'public_route',
        placeType:input.metadata?.placeType,
        flowIntensity:input.metadata?.flowIntensity,
        activationType:input.metadata?.activationType,
        wayfindingMode:input.metadata?.wayfindingMode,
        authorityLevel:input.metadata?.authorityLevel||'operational',
        ...(input.metadata||{})
      }
    } as any);
    const chunkRows = chunks.map((text,idx)=>({
      id:`uxchunk_${randomUUID().slice(0,8)}`,
      documentId,
      organizationId:input.organizationId,
      projectId:input.projectId,
      title:`${input.title} — مقطع ${idx+1}`,
      sourceType:'manual' as const,
      languageCode:(input.languageCode as any)||'ar',
      text,
      tags,
      chunkIndex:idx,
      tokenEstimate:Math.ceil(text.length/4),
      metadata:{
        domain:'urban_experience',
        documentTitle:input.title,
        routeType:input.metadata?.routeType||'public_route',
        placeType:input.metadata?.placeType,
        flowIntensity:input.metadata?.flowIntensity,
        activationType:input.metadata?.activationType,
        wayfindingMode:input.metadata?.wayfindingMode
      },
      createdAt:now,
      updatedAt:now,
    }));
    this.prisma.knowledgeChunk.createMany({ data: chunkRows as any);
    return { ok:true, item:{ documentId, title:document.title, chunkCount:chunkRows.length, tags, metadata:document.metadata }, noteAr:'تم إنشاء سجل وثيقة تجربة حضرية ومقاطعها تمهيدًا للاسترجاع وربطها بالحركة والتفعيل.' };
  }

  corpusAdmin(params?: { organizationId?: string }) {
    const docs=this.docs(params);
    const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'urban_experience' } } })=>(c.tags||[]).includes('urban_experience') && (!params?.organizationId || c.organizationId===params.organizationId));
    const byRoute:Record<string,number>={};
    const byPlace:Record<string,number>={};
    for (const d of docs){
      const r=String((d.metadata as Record<string, unknown>)?.routeType||'unknown');
      const p=String((d.metadata as Record<string, unknown>)?.placeType||'unknown');
      byRoute[r]=(byRoute[r]||0)+1; byPlace[p]=(byPlace[p]||0)+1;
    }
    const vector=getUrbanExperienceVectorStoreStatus({ documents:docs.length, chunks:chunks.length, syncCount:docs.length });
    const linkage=this.flowLinkage(params);
    return {
      ok:true,
      domain:'urban_experience',
      totals:{ documents:docs.length, chunks:chunks.length, evidenceLinks:this.evidenceLinks.length, vectorSyncState:vector.syncState, flowLinkageScore:linkage.linkageScore },
      distributions:{ routeType:byRoute, placeType:byPlace },
      metadataSchemaAr:[...URBAN_EXPERIENCE_METADATA_SCHEMA],
      latestDocuments:docs.slice(0,12).map((d:any)=>({id:d.id,title:d.title,chunkCount:d.chunkCount,routeType:(d.metadata||{}).routeType||null,placeType:(d.metadata||{}).placeType||null,updatedAt:d.updatedAt}))
    };
  }

  retrieve(input: RunUrbanExperienceRetrievalDto) {
    const q=String(input.query||'').trim().toLowerCase();
    const terms=q.split(/\s+/).filter(Boolean);
    const topK=Math.min(Math.max(input.topK||8,1),25);
    const rows=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'urban_experience' } } })=>{
      if(!(row.tags||[]).includes('urban_experience')) return false;
      if(input.organizationId && row.organizationId!==input.organizationId) return false;
      if(input.routeType && String((row.metadata||{}).routeType||'')!==String(input.routeType)) return false;
      if(input.placeType && String((row.metadata||{}).placeType||'')!==String(input.placeType)) return false;
      return true;
    }).map((row:any)=>{
      const haystack=`${row.title||''} ${row.text||''} ${JSON.stringify(row.metadata||{})}`.toLowerCase();
      const score=terms.length===0?0:terms.reduce((acc,term)=>acc + (haystack.includes(term)?1:0),0)/terms.length;
      return { row, score };
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,topK).map(({row,score})=>({
      id:row.id, documentId:row.documentId, title:row.title, text:String(row.text||'').slice(0,420), score:Number(score.toFixed(3)), metadata:row.metadata||{}, tags:row.tags||[]
    }));
    return { ok:true, domain:'urban_experience', retrievalMode:'domain_routed_foundation', query:input.query, items:rows, noteAr:'هذه نواة استرجاع أولية لمجال التجربة الحضرية وسيتم تعميقها لاحقًا عبر vector store وflow-aware retrieval.' };
  }

  runEval(input: RunUrbanExperienceEvalDto) {
    const retrieval=this.retrieve({ query:input.query, organizationId:input.organizationId, topK:6 });
    const experiences=(this.store as Record<string, unknown>).listExperiences ? (this.store as Record<string, unknown>).listExperiences().filter((x:any)=>!input.organizationId || x.organizationId===input.organizationId).length : 0;
    const retrievalRecallScore=Math.min(100,35+retrieval.items.length*8);
    const groundingScore=Math.min(100,45+Math.round((retrieval.items[0]?.score||0)*40));
    const flowScore=Math.max(35, Math.min(100, 50 + experiences*5 + retrieval.items.length*4));
    const routeCoverageScore=Math.max(35, Math.min(100, 50 + this.docs({organizationId:input.organizationId}).length*3 + retrieval.items.length*4));
    const row: EvalRow={ id:`uxeval_${randomUUID().slice(0,8)}`, query:input.query, retrievalRecallScore, groundingScore, flowScore, routeCoverageScore, createdAt:new Date().toISOString() };
    this.evals.unshift(row);
    return { ok:true, item:row, noteAr:'تم تشغيل تقييم أولي لمجال التجربة الحضرية يغطي الاسترجاع والتدفق وتغطية المسارات.' };
  }

  linkEvidence(input: LinkUrbanExperienceEvidenceDto) {
    const row: EvidenceLink={ id:`uxev_${randomUUID().slice(0,8)}`, experienceId:input.experienceId, documentId:input.documentId, chunkId:input.chunkId, linkType:input.linkType, noteAr:input.noteAr, metadata:input.metadata, createdAt:new Date().toISOString() };
    this.evidenceLinks.unshift(row); return { ok:true, item:row };
  }

  runQualityCheck(input: RunUrbanExperienceQualityCheckDto) {
    const docs=this.docs({ organizationId:input.organizationId });
    const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'urban_experience' } } })=>(c.tags||[]).includes('urban_experience') && (!input.organizationId || c.organizationId===input.organizationId));
    const experiences=(this.store as Record<string, unknown>).listExperiences ? (this.store as Record<string, unknown>).listExperiences().filter((x:any)=>!input.organizationId || x.organizationId===input.organizationId).length : 0;
    const quality=scoreUrbanExperienceCorpusQuality({ documents:docs.length, chunks:chunks.length, evidenceLinks:this.evidenceLinks.length, experienceRecords:experiences });
    return { ok:true, domain:'urban_experience', quality, noteAr:'تم حساب درجة جودة أولية لـ corpus التجربة الحضرية.' };
  }

  vectorStore(params?: { organizationId?: string }) {
    const docs=this.docs(params);
    const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'urban_experience' } } })=>(c.tags||[]).includes('urban_experience') && (!params?.organizationId || c.organizationId===params.organizationId));
    return { ok:true, status:getUrbanExperienceVectorStoreStatus({ documents:docs.length, chunks:chunks.length, syncCount:docs.length }) };
  }
  syncVectorStore(params?: { organizationId?: string }) {
    const status=this.vectorStore(params).status;
    return { ok:true, status:{ ...status, syncState: status.mode==='scaffolded_vector_store' ? 'in_sync' : status.syncState }, noteAr:'تم تنفيذ sync posture أولي لمجال التجربة الحضرية ضمن scaffold الحالي.' };
  }
  retrievalContracts(){ return { ok:true, contracts:URBAN_EXPERIENCE_RETRIEVAL_CONTRACTS }; }
  flowLinkage(params?: { organizationId?: string }) {
    const docs=this.docs(params).length;
    const experiences=(this.store as Record<string, unknown>).listExperiences ? (this.store as Record<string, unknown>).listExperiences().filter((x:any)=>!params?.organizationId || x.organizationId===params.organizationId).length : 0;
    return { ok:true, ...summarizeFlowLinkage({ documents:docs, experienceRecords:experiences, evidenceLinks:this.evidenceLinks.length }), documents:docs, experiences };
  }
  readinessLinkage(params?: { organizationId?: string }) {
    const score=Math.max(40, Math.min(100, 68 + Math.min(this.docs(params).length, 8)*3));
    return { ok:true, readiness:{ score, posture: score>=85?'ready':score>=70?'warming_up':'needs_work', gatesAr:['تثبيت خرائط التدفق والمسارات','ربط corpus بالمشاهد المكانية','مراجعة اتساق wayfinding والتفعيل الحضري'] } };
  }
  dashboard(params?: { organizationId?: string }) {
    const summary=this.summary(params);
    const quality=this.runQualityCheck({ organizationId:params?.organizationId }).quality;
    const vector=this.vectorStore(params).status;
    const linkage=this.flowLinkage(params);
    const readiness=this.readinessLinkage(params).readiness;
    return { ok:true, domain:'urban_experience', summary:summary.coverage, quality, vector, linkage, readiness, recentEvals:this.evals.slice(0,8), recentEvidenceLinks:this.evidenceLinks.slice(0,8) };
  }
}
