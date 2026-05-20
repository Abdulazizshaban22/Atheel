import type { BrainstormNote, Vote, VoteSession } from './types';

export function computeDotVotingResults(notes: BrainstormNote[], session: VoteSession, votes: Vote[]) {
  const counts: Record<string, number> = {};
  for (const v of votes.filter((x) => x.sessionId === session.id)) {
    counts[v.noteId] = (counts[v.noteId] || 0) + 1;
  }
  const ranked = notes
    .map((n) => ({ noteId: n.id, textAr: n.textAr, votes: counts[n.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return {
    sessionId: session.id,
    status: session.status,
    votesPerUser: session.votesPerUser,
    totalVotes: votes.filter((x) => x.sessionId === session.id).length,
    ranked,
  };
}

export function clusterNotesByKeyword(notes: BrainstormNote[]) {
  // Lightweight clustering (no ML): group by first hashtag or first keyword token.
  const groups: Record<string, BrainstormNote[]> = {};
  for (const n of notes) {
    const tag = (n.tags && n.tags[0]) || extractHashtag(n.textAr) || extractFirstKeyword(n.textAr) || 'عام';
    groups[tag] = groups[tag] || [];
    groups[tag].push(n);
  }
  return Object.entries(groups)
    .map(([key, items]) => ({ key, count: items.length, items }))
    .sort((a, b) => b.count - a.count);
}

function extractHashtag(text: string) {
  const m = (text || '').match(/#([\p{L}\p{N}_-]+)/u);
  return m ? `#${m[1]}` : '';
}

function extractFirstKeyword(text: string) {
  const cleaned = (text || '').replace(/[\n\r]+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts[0] ? parts[0].slice(0, 14) : '';
}
