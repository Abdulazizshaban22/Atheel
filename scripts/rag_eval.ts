/*
 * Wave39: RAG evaluation harness (recall@k)
 *
 * Usage:
 *  pnpm ts-node scripts/rag_eval.ts --base http://localhost:4000 --cases scripts/rag_cases.sample.json --k 5
 */

import { readFile } from 'node:fs/promises';

type Case = {
  id: string;
  query: string;
  expectedChunkIds: string[];
  organizationId?: string;
  projectId?: string;
};

function arg(name: string, def?: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  return process.argv[idx + 1] || def;
}

async function main() {
  const base = (arg('--base', 'http://localhost:4000') || '').replace(/\/$/, '');
  const casesPath = arg('--cases', 'scripts/rag_cases.sample.json')!;
  const k = Number(arg('--k', '5') || '5');
  const topK = Number.isFinite(k) ? Math.max(1, Math.min(20, k)) : 5;

  const raw = await readFile(casesPath, 'utf-8');
  const cases = JSON.parse(raw) as Case[];

  let hit = 0;
  let total = 0;

  for (const c of cases) {
    total += 1;
    const res = await fetch(`${base}/api/ai/rag/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: c.query,
        topK,
        synthesize: false,
        strategy: 'hybrid',
        organizationId: c.organizationId,
        projectId: c.projectId,
      }),
    });

    const json = await res.json() as any;
    const returned = new Set((json?.contexts || []).map((x: any) => String(x.chunkId || '')));
    const expected = new Set((c.expectedChunkIds || []).map(String));

    let ok = false;
    if (expected.size === 0) {
      ok = returned.size > 0;
    } else {
      ok = [...expected].some((id) => returned.has(id));
    }

    if (ok) hit += 1;
    console.log(`${c.id}: ${ok ? 'HIT' : 'MISS'} | returned=${returned.size}`);
  }

  const recall = total ? hit / total : 0;
  console.log(`\nrecall@${topK} = ${(recall * 100).toFixed(1)}% (${hit}/${total})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
