export function normalizeText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const norm = normalizeText(input);
  if (!norm) return [];
  return norm.split(' ').filter((x) => x.length > 1);
}

export function estimateTokens(text: string): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.35));
}

export function chunkText(text: string, options?: { targetChars?: number; overlapChars?: number }): string[] {
  const target = Math.max(300, options?.targetChars ?? 900);
  const overlap = Math.max(0, Math.min(Math.floor(target / 2), options?.overlapChars ?? 120));
  const source = (text || '').replace(/\r/g, '').trim();
  if (!source) return [];

  const paragraphs = source.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    const val = buffer.trim();
    if (val) chunks.push(val);
    buffer = '';
  };

  for (const p of paragraphs.length ? paragraphs : [source]) {
    if ((buffer + '\n\n' + p).length <= target) {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
      continue;
    }
    if (buffer) flush();

    if (p.length <= target) {
      buffer = p;
      continue;
    }

    let start = 0;
    while (start < p.length) {
      const end = Math.min(p.length, start + target);
      const slice = p.slice(start, end).trim();
      if (slice) chunks.push(slice);
      if (end >= p.length) break;
      start = Math.max(0, end - overlap);
    }
  }
  if (buffer) flush();
  return chunks;
}
