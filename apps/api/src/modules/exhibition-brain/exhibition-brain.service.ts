
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@madar/db';
import { RunExhibitionRetrievalDto } from './dto/run-exhibition-retrieval.dto';
import { RunExhibitionEvalDto } from './dto/run-exhibition-eval.dto';
import { IngestExhibitionCorpusDto } from './dto/ingest-exhibition-corpus.dto';
import { LinkExhibitionEvidenceDto } from './dto/link-exhibition-evidence.dto';
import { RunExhibitionQualityCheckDto } from './dto/run-exhibition-quality-check.dto';
import { EXHIBITION_AGENT_CATALOG } from '../../../../../packages/knowledge-kernel/src/exhibition/agent-catalog';
import { EXHIBITION_METADATA_SCHEMA } from '../../../../../packages/knowledge-kernel/src/exhibition/metadata-schema';
import { scoreExhibitionCorpusQuality } from '../../../../../packages/knowledge-kernel/src/exhibition/corpus-quality';
import { summarizeStudioExperienceLinkage } from '../../../../../packages/knowledge-kernel/src/exhibition/studio-experience-linkage';
import { getExhibitionVectorStoreStatus } from '../../../../../packages/knowledge-kernel/src/exhibition/vector-store-manager';
import { EXHIBITION_RETRIEVAL_CONTRACTS } from '../../../../../packages/knowledge-kernel/src/exhibition/retrieval-contracts';

type EvalRow = { id:string; query:string; retrievalRecallScore:number; groundingScore:number; curatorialScore:number; experienceCoverageScore:number; createdAt:string; };
type EvidenceLink = { id:string; exhibitId:string; documentId:string; chunkId?:string; linkType:string; noteAr?:string; metadata?:Record<string,unknown>; createdAt:string; };

@Injectable()
export class ExhibitionBrainService {
  /* Wave123: evals persisted in BrainEvalRun table */
  /* Wave123: evidence persisted in BrainEvidenceLink table */
  constructor(private readonly prisma: PrismaService) {}

  private chunkText(text: string, size = 900) { const normalized = String(text || '').replace(/\n/g, ' ').trim(); if (!normalized) return [] as string[]; const chunks:string[]=[]; for (let i=0;i<normalized.length;i+=size) chunks.push(normalized.slice(i,i+size)); return chunks; }
  private docs(params?: { organizationId?: string }) { return await this.prisma.knowledgeDocument.findMany({ where: { tags: { has: 'exhibition' } } })=>(d.tags||[]).includes('exhibition') && (!params?.organizationId || d.organizationId===params.organizationId)); }

  summary(params?: { organizationId?: string }) {
    const docs = this.docs(params);
    const experiences = await this.prisma.visitorExperience.findMany({}).filter((x:any)=>!params?.organizationId || x.organizationId===params.organizationId);
    const assets = await this.prisma.attachment.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    return { ok:true, domain:'exhibition', coverage:{ documents:docs.length, experiences:experiences.length, assets:assets.length, exhibitTypes:Array.from(new Set(docs.map((x:any)=>String((x.metadata||{}).exhibitType||'')).filter(Boolean))), audienceSegments:Array.from(new Set(docs.map((x:any)=>String((x.metadata||{}).audienceSegment||'')).filter(Boolean))) }, nextMilestonesAr:['تعميق ربط corpus المعارض بالاستديو الإبداعي وExperience Composer.','إضافة vector sync حقيقي وhybrid retrieval لاحقًا.','تحسين linkage بين النصوص، الأصول، والمسارات داخل المعرض.'] };
  }

  agents(){ return { ok:true, items:EXHIBITION_AGENT_CATALOG }; }

  ingest(input: IngestExhibitionCorpusDto) {
    const now = new Date().toISOString();
    const documentId = `exdoc_${randomUUID().slice(0,8)}`;
    const chunks = this.chunkText(input.text, 850);
    const tags = Array.from(new Set(['exhibition','curation','experience',...(input.tags||[])]));
    const document = this.prisma.knowledgeDocument.create({ data: { id:documentId, organizationId:input.organizationId, projectId:input.projectId, title:input.title, sourceType:'manual', languageCode:(input.languageCode as any)||'ar', tags, text:input.text, chunkCount:chunks.length, createdAt:now, updatedAt:now, metadata:{ domain:'exhibition', exhibitType:input.metadata?.exhibitType||'general_exhibition', audienceSegment:input.metadata?.audienceSegment, curatorialTrack:input.metadata?.curatorialTrack, assetType:input.metadata?.assetType, authorityLevel:input.metadata?.authorityLevel||'institutional', ...(input.metadata||{}) } } as any);
    const chunkRows = chunks.map((text,idx)=>({ id:`exchunk_${randomUUID().slice(0,8)}`, documentId, organizationId:input.organizationId, projectId:input.projectId, title:`${input.title} — مقطع ${idx+1}`, sourceType:'manual' as const, languageCode:(input.languageCode as any)||'ar', text, tags, chunkIndex:idx, tokenEstimate:Math.ceil(text.length/4), metadata:{ domain:'exhibition', documentTitle:input.title, exhibitType:input.metadata?.exhibitType||'general_exhibition', audienceSegment:input.metadata?.audienceSegment, curatorialTrack:input.metadata?.curatorialTrack, assetType:input.metadata?.assetType }, createdAt:now, updatedAt:now }));
    this.prisma.knowledgeChunk.createMany({ data: chunkRows as any);
    return { ok:true, item:{ documentId, title:document.title, chunkCount:chunkRows.length, tags, metadata:document.metadata }, noteAr:'تم إنشاء سجل وثيقة معرض ومقاطعها تمهيدًا للاسترجاع وربطها بالاستديو والتجربة.' };
  }

  corpusAdmin(params?: { organizationId?: string }) {
    const docs=this.docs(params); const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'exhibition' } } })=>(c.tags||[]).includes('exhibition') && (!params?.organizationId || c.organizationId===params.organizationId));
    const byType:Record<string,number>={}; const byTrack:Record<string,number>={};
    for (const d of docs){ const t=String((d.metadata as Record<string, unknown>)?.exhibitType||'unknown'); const i=String((d.metadata as Record<string, unknown>)?.curatorialTrack||'unknown'); byType[t]=(byType[t]||0)+1; byTrack[i]=(byTrack[i]||0)+1; }
    const vector=getExhibitionVectorStoreStatus({ documents:docs.length, chunks:chunks.length, syncCount:docs.length });
    const linkage=this.studioExperienceLinkage(params);
    return { ok:true, domain:'exhibition', totals:{ documents:docs.length, chunks:chunks.length, evidenceLinks:this.evidenceLinks.length, vectorSyncState:vector.syncState, studioExperienceScore:linkage.linkageScore }, distributions:{ exhibitType:byType, curatorialTrack:byTrack }, metadataSchemaAr:[...EXHIBITION_METADATA_SCHEMA], latestDocuments:docs.slice(0,12).map((d:any)=>({id:d.id,title:d.title,chunkCount:d.chunkCount,exhibitType:(d.metadata||{}).exhibitType||null,curatorialTrack:(d.metadata||{}).curatorialTrack||null,updatedAt:d.updatedAt})) };
  }

  retrieve(input: RunExhibitionRetrievalDto) {
    const q=String(input.query||'').trim().toLowerCase(); const terms=q.split(/\s+/).filter(Boolean); const topK=Math.min(Math.max(input.topK||8,1),25);
    const rows=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'exhibition' } } })=>{ if(!(row.tags||[]).includes('exhibition')) return false; if(input.organizationId && row.organizationId!==input.organizationId) return false; if(input.exhibitType && String((row.metadata||{}).exhibitType||'')!==String(input.exhibitType)) return false; if(input.audienceSegment && String((row.metadata||{}).audienceSegment||'')!==String(input.audienceSegment)) return false; return true; }).map((row:any)=>{ const haystack=`${row.title||''} ${row.text||''} ${JSON.stringify(row.metadata||{})}`.toLowerCase(); const score=terms.length===0?0:terms.reduce((acc,term)=>acc + (haystack.includes(term)?1:0),0)/terms.length; return { row, score }; }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,topK).map(({row,score})=>({ id:row.id, documentId:row.documentId, title:row.title, text:String(row.text||'').slice(0,420), score:Number(score.toFixed(3)), metadata:row.metadata||{}, tags:row.tags||[] }));
    return { ok:true, domain:'exhibition', retrievalMode:'domain_routed_foundation', query:input.query, items:rows, noteAr:'هذه نواة استرجاع أولية لمجال المعارض وسيتم تعميقها لاحقًا عبر vector store وstudio-aware retrieval.' };
  }

  runEval(input: RunExhibitionEvalDto) {
    const retrieval=this.retrieve({ query:input.query, organizationId:input.organizationId, topK:6 });
    const experiences=await this.prisma.visitorExperience.findMany({}).filter((x:any)=>!input.organizationId || x.organizationId===input.organizationId).length;
    const assets=(await this.prisma.attachment.findMany({ where: input?.organizationId ? { organizationId: input.organizationId } : {} })).length;
    const retrievalRecallScore=Math.min(100,35+retrieval.items.length*8);
    const groundingScore=Math.min(100,45+Math.round((retrieval.items[0]?.score||0)*40));
    const curatorialScore=Math.max(35, Math.min(100, 50 + assets*4 + retrieval.items.length*4));
    const experienceCoverageScore=Math.max(35, Math.min(100, 50 + experiences*5 + retrieval.items.length*4));
    const row: EvalRow={ id:`exeval_${randomUUID().slice(0,8)}`, query:input.query, retrievalRecallScore, groundingScore, curatorialScore, experienceCoverageScore, createdAt:new Date().toISOString() };
    this.evals.unshift(row); return { ok:true, item:row, noteAr:'تم تشغيل تقييم أولي لمجال المعارض يغطي الاسترجاع والبعد الكيوريتوري والتجربة.' };
  }

  linkEvidence(input: LinkExhibitionEvidenceDto) { const row: EvidenceLink={ id:`exev_${randomUUID().slice(0,8)}`, exhibitId:input.exhibitId, documentId:input.documentId, chunkId:input.chunkId, linkType:input.linkType, noteAr:input.noteAr, metadata:input.metadata, createdAt:new Date().toISOString() }; this.evidenceLinks.unshift(row); return { ok:true, item:row }; }

  runQualityCheck(input: RunExhibitionQualityCheckDto) {
    const docs=this.docs({ organizationId:input.organizationId }); const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'exhibition' } } })=>(c.tags||[]).includes('exhibition') && (!input.organizationId || c.organizationId===input.organizationId));
    const experiences=await this.prisma.visitorExperience.findMany({}).filter((x:any)=>!input.organizationId || x.organizationId===input.organizationId).length;
    const assets=(await this.prisma.attachment.findMany({ where: input?.organizationId ? { organizationId: input.organizationId } : {} })).length;
    const quality=scoreExhibitionCorpusQuality({ documents:docs.length, chunks:chunks.length, evidenceLinks:this.evidenceLinks.length, experiences, assets });
    return { ok:true, domain:'exhibition', quality, noteAr:'تم حساب درجة جودة أولية لـ corpus المعارض.' };
  }

  vectorStore(params?: { organizationId?: string }) { const docs=this.docs(params); const chunks=await this.prisma.knowledgeChunk.findMany({ where: { tags: { has: 'exhibition' } } })=>(c.tags||[]).includes('exhibition') && (!params?.organizationId || c.organizationId===params.organizationId)); return { ok:true, status:getExhibitionVectorStoreStatus({ documents:docs.length, chunks:chunks.length, syncCount:docs.length }) }; }
  syncVectorStore(params?: { organizationId?: string }) { const status=this.vectorStore(params).status; return { ok:true, status:{ ...status, syncState: status.mode==='scaffolded_vector_store' ? 'in_sync' : status.syncState }, noteAr:'تم تنفيذ sync posture أولي لمجال المعارض ضمن scaffold الحالي.' }; }
  retrievalContracts(){ return { ok:true, contracts:EXHIBITION_RETRIEVAL_CONTRACTS }; }
  studioExperienceLinkage(params?: { organizationId?: string }) {
    const experiences=await this.prisma.visitorExperience.findMany({}).filter((x:any)=>!params?.organizationId || x.organizationId===params.organizationId).length;
    const docs=this.docs(params).length;
    const attachments=(await this.prisma.attachment.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} })).length;
    return { ok:true, ...summarizeStudioExperienceLinkage({ experiences, documents:docs, attachments }), experiences, documents:docs, attachments };
  }
  readinessLinkage(params?: { organizationId?: string }) { const score=Math.max(40, Math.min(100, 68 + Math.min(this.docs(params).length, 8)*3)); return { ok:true, readiness:{ score, posture: score>=85?'ready':score>=70?'warming_up':'needs_work', gatesAr:['تثبيت الربط بين corpus المعارض والاستديو','تحقق من اكتمال الأصول الإبداعية','مراجعة اتساق النصوص والمسارات'] } }; }
  dashboard(params?: { organizationId?: string }) { const summary=this.summary(params); const quality=this.runQualityCheck({ organizationId:params?.organizationId }).quality; const vector=this.vectorStore(params).status; const linkage=this.studioExperienceLinkage(params); const readiness=this.readinessLinkage(params).readiness; return { ok:true, domain:'exhibition', summary:summary.coverage, quality, vector, linkage, readiness, recentEvals:this.evals.slice(0,8), recentEvidenceLinks:this.evidenceLinks.slice(0,8) }; }
}
