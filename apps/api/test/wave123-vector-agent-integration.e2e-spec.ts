import { vectorSearch, hashEmbed, cosineSimilarity, reciprocalRankFusion } from '../../../packages/ai-kernel/src/vector-search';
import { tokenize, normalizeText, chunkText, estimateTokens } from '../../../packages/ai-kernel/src/text';
import { scoreChunk, retrieveTopChunks, buildRagPrompt } from '../../../packages/ai-kernel/src/rag';
import { buildCultureAgentPlan } from '../../../packages/ai-kernel/src/agent';
import type { KnowledgeChunk } from '../../../packages/ai-kernel/src/types';

function makeChunk(o: Partial<KnowledgeChunk> & { id: string; text: string }): KnowledgeChunk {
  return { documentId: 'doc_test', chunkIndex: 0, tokenEstimate: 100, tags: [], ...o };
}

let passed = 0, failed = 0;
function assert(c: boolean, n: string) { if (c) { passed++; console.log(`  ✅ ${n}`); } else { failed++; console.error(`  ❌ FAIL: ${n}`); } }

console.log('\n═══ 1: Text Processing ═══');
assert(normalizeText('القاهرة') !== '', 'Arabic text');
assert(normalizeText('  Hello  World  ') === 'hello world', 'trim+lowercase');
assert(tokenize('التراث السعودي').length === 2, 'Arabic tokenize');
assert(tokenize('').length === 0, 'empty tokenize');
assert(estimateTokens('hello world test') > 0, 'token estimate');
assert(chunkText('short').length === 1, 'short chunk');
assert(chunkText('a'.repeat(2000), { targetChars: 500 }).length > 1, 'long chunk splits');

console.log('\n═══ 2: Cosine Similarity ═══');
assert(cosineSimilarity([1,0,0], [1,0,0]) === 1, 'identical=1');
assert(Math.abs(cosineSimilarity([1,0], [0,1])) < 0.01, 'orthogonal≈0');
assert(cosineSimilarity([1,2,3], [1,2,3]) > 0.99, 'same dir≈1');
assert(cosineSimilarity([], []) === 0, 'empty=0');

console.log('\n═══ 3: Hash Embeddings ═══');
const e1 = hashEmbed('التراث العمراني السعودي');
const e2 = hashEmbed('التراث العمراني السعودي');
const e3 = hashEmbed('الذكاء الاصطناعي');
assert(e1.length === 256, 'correct dims');
assert(JSON.stringify(e1) === JSON.stringify(e2), 'deterministic');
assert(cosineSimilarity(e1, e2) > 0.99, 'identical→high sim');
assert(cosineSimilarity(e1, e3) < cosineSimilarity(e1, e2), 'different→lower');
const mag = Math.sqrt(e1.reduce((s,v)=>s+v*v,0));
assert(Math.abs(mag - 1) < 0.01, 'L2 normalized');

console.log('\n═══ 4: Vector Search ═══');
const chunks: KnowledgeChunk[] = [
  makeChunk({ id:'c1', text:'قصر إبراهيم التراثي في الأحساء معلم تاريخي', tags:['heritage','official'], title:'قصر إبراهيم', metadata:{authorityLevel:'official'} }),
  makeChunk({ id:'c2', text:'مهرجان الجنادرية من أبرز الفعاليات الثقافية', tags:['culture_programs','events'], title:'الجنادرية' }),
  makeChunk({ id:'c3', text:'تطوير الواجهة البحرية في جدة مشروع سياحي ضخم', tags:['destination'], title:'واجهة جدة' }),
  makeChunk({ id:'c4', text:'تقنيات الذكاء الاصطناعي في حفظ التراث العمراني', tags:['heritage','ai','policy'], title:'AI والتراث' }),
  makeChunk({ id:'c5', text:'برنامج جودة الحياة ضمن رؤية 2030 قطاعات ثقافية', tags:['culture_programs'], title:'جودة الحياة' }),
];

const lex = vectorSearch({ query:'التراث العمراني', chunks, strategy:'lexical', topK:3 });
assert(lex.length > 0, 'lexical returns results');
assert(lex[0].tags.includes('heritage'), 'lexical ranks heritage first');
assert(lex[0].vectorScore === 0, 'lexical: vectorScore=0');

const vec = vectorSearch({ query:'التراث العمراني', chunks, strategy:'vector', topK:3 });
assert(vec.length > 0, 'vector returns results');
assert(vec[0].vectorScore > 0, 'vector: vectorScore>0');

const hyb = vectorSearch({ query:'التراث العمراني', chunks, strategy:'hybrid', topK:3 });
assert(hyb.length > 0, 'hybrid returns results');
assert(hyb[0].score > 0, 'hybrid: combined score>0');

const dom = vectorSearch({ query:'مهرجان', chunks, strategy:'lexical', domain:'culture_programs', topK:5 });
assert(dom.every(r=>r.tags.includes('culture_programs')), 'domain filter');

const empty = vectorSearch({ query:'', chunks, strategy:'lexical', topK:3 });
assert(empty.length === 0, 'empty query=no results');

console.log('\n═══ 5: RRF Fusion ═══');
const r1 = vectorSearch({ query:'التراث', chunks, strategy:'lexical', topK:5 });
const r2 = vectorSearch({ query:'التراث', chunks, strategy:'vector', topK:5 });
const fused = reciprocalRankFusion([r1,r2], 60, 3);
assert(fused.length > 0, 'RRF returns results');
assert(fused.length <= 3, 'RRF respects topK');

console.log('\n═══ 6: Original RAG ═══');
assert(scoreChunk('التراث', chunks[0]).score > 0, 'scoreChunk works');
const top = retrieveTopChunks({ query:'التراث', chunks, topK:2 });
assert(top.length > 0, 'retrieveTopChunks works');
const prompt = buildRagPrompt({ userQuestion:'ما قصر إبراهيم؟', contexts:top, outputLanguage:'ar' });
assert(prompt.length > 100, 'RAG prompt built');

console.log('\n═══ 7: Agent Plan ═══');
const p1 = buildCultureAgentPlan({ objective:'تحليل', hasKnowledgeContext:true, requiresApproval:true });
assert(p1.length >= 4, '4+ steps with approval');
assert(p1.some(s=>s.type==='publish_ready'), 'has publish step');
const p2 = buildCultureAgentPlan({ objective:'test', hasKnowledgeContext:false, requiresApproval:false });
assert(!p2.some(s=>s.type==='publish_ready'), 'no publish without approval');

console.log('\n═══ 8: Search Quality ═══');
const hq = vectorSearch({ query:'حفظ التراث والآثار', chunks, strategy:'hybrid', topK:5, domain:'heritage' });
assert(hq.length > 0 && hq[0].tags.includes('heritage'), 'heritage domain accuracy');
const cq = vectorSearch({ query:'مهرجان ثقافي', chunks, strategy:'hybrid', topK:5 });
assert(cq.some(r=>r.tags.includes('culture_programs')), 'culture query accuracy');

console.log('\n═══════════════════════════════════════');
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);
console.log(`  TOTAL:  ${passed + failed}`);
console.log('═══════════════════════════════════════\n');
if (failed > 0) process.exit(1);
