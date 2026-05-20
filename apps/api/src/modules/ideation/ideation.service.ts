import { Injectable, NotFoundException } from '@nestjs/common';
import { computeDotVotingResults, clusterNotesByKeyword } from '@madar/creative-loop-kernel';
import {
  BrainstormBoardRecord,
  BrainstormNoteRecord,
  BrainstormVoteRecord,
  BrainstormVoteSessionRecord,
  VaultIdeaRecord,
  ProgramTemplateRecord,

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

@Injectable()
export class IdeationService {
  constructor(private readonly prisma: PrismaService) {}

  listBoards() {
    return { items: await this.prisma.brainstormBoard.findMany({}) };
  }

  getBoard(id: string) {
    const item = await this.prisma.brainstormBoard.findUnique({ where: { id: id } });
    if (!item) throw new NotFoundException('Board not found');
    return item;
  }

  createBoard(input: { organizationId?: string; projectId?: string; titleAr: string; miroBoardUrl?: string; createdByUserId?: string }) {
    const now = new Date().toISOString();
    const row: BrainstormBoardRecord = {
      id: uid('brd'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      titleAr: input.titleAr,
      status: 'active',
      miroBoardUrl: input.miroBoardUrl,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    await this.prisma.brainstormBoard.create({ data: row);
    return row;
  }

  addNote(boardId: string, input: { textAr: string; tags?: string[]; x?: number; y?: number; color?: string; createdByUserId?: string }) {
    this.getBoard(boardId);
    const now = new Date().toISOString();
    const row: BrainstormNoteRecord = {
      id: uid('note'),
      boardId,
      textAr: input.textAr,
      tags: input.tags || [],
      x: input.x,
      y: input.y,
      color: input.color,
      createdByUserId: input.createdByUserId,
      createdAt: now,
    };
    await this.prisma.brainstormNote.create({ data: row);
    return row;
  }

  listNotes(boardId: string) {
    this.getBoard(boardId);
    const notes = await this.prisma.brainstormNote.findMany(boardId);
    return {
      boardId,
      count: notes.length,
      clusters: clusterNotesByKeyword(notes.map((n) => ({ id: n.id, boardId: n.boardId, textAr: n.textAr, createdAt: n.createdAt, createdByUserId: n.createdByUserId, x: n.x, y: n.y, color: n.color, tags: n.tags }))),
      items: notes,
    };
  }

  startVoting(boardId: string, input: { votesPerUser?: number }) {
    this.getBoard(boardId);
    const now = new Date().toISOString();
    const row: BrainstormVoteSessionRecord = {
      id: uid('vote'),
      boardId,
      status: 'open',
      votesPerUser: Math.max(1, Math.min(99, input.votesPerUser || 5)),
      createdAt: now,
    };
    await this.prisma.brainstormVoteSession.create({ data: row);
    return row;
  }

  closeVoting(sessionId: string) {
    const s = await this.prisma.brainstormVoteSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Vote session not found');
    if (s.status === 'closed') return s;
    const now = new Date().toISOString();
    return await this.prisma.brainstormVoteSession.update({ where: { id: sessionId }, data: { status: 'closed', closedAt: now });
  }

  vote(sessionId: string, input: { noteId: string; userId?: string }) {
    const session = await this.prisma.brainstormVoteSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Vote session not found');
    if (session.status !== 'open') throw new NotFoundException('Voting is closed');

    const notes = await this.prisma.brainstormNote.findMany(session.boardId);
    const exists = notes.some((n) => n.id === input.noteId);
    if (!exists) throw new NotFoundException('Note not found');

    // Basic quota check if userId provided
    if (input.userId) {
      const used = await this.prisma.brainstormVote.findMany(sessionId).filter((v) => v.userId === input.userId).length;
      if (used >= session.votesPerUser) {
        return { ok: false, reasonAr: 'تم استهلاك عدد الأصوات المتاحة' };
      }
    }

    const now = new Date().toISOString();
    const row: BrainstormVoteRecord = {
      id: uid('v'),
      sessionId,
      noteId: input.noteId,
      userId: input.userId,
      createdAt: now,
    };
    await this.prisma.brainstormVote.create({ data: row);
    return { ok: true, vote: row };
  }

  results(boardId: string, sessionId?: string) {
    this.getBoard(boardId);
    const sessions = await this.prisma.brainstormVoteSession.findMany(boardId);
    const session = sessionId ? sessions.find((x) => x.id === sessionId) : sessions[0];
    if (!session) throw new NotFoundException('No voting session');

    const notes = await this.prisma.brainstormNote.findMany(boardId);
    const votes = await this.prisma.brainstormVote.findMany(session.id);

    return computeDotVotingResults(
      notes.map((n) => ({ id: n.id, boardId: n.boardId, textAr: n.textAr, createdAt: n.createdAt, createdByUserId: n.createdByUserId, x: n.x, y: n.y, color: n.color, tags: n.tags })),
      { id: session.id, boardId: session.boardId, status: session.status, votesPerUser: session.votesPerUser, createdAt: session.createdAt, closedAt: session.closedAt },
      votes.map((v) => ({ id: v.id, sessionId: v.sessionId, noteId: v.noteId, userId: v.userId, createdAt: v.createdAt })),
    );
  }


  convertTopNotesToVaultIdeas(boardId: string, input?: { topN?: number; projectId?: string; organizationId?: string }) {
    this.getBoard(boardId);
    const notes = await this.prisma.brainstormNote.findMany(boardId);
    const sessions = await this.prisma.brainstormVoteSession.findMany(boardId);
    const session = sessions[0];
    let ranked: Array<{ note: BrainstormNoteRecord; score: number }> = notes.map((n) => ({ note: n, score: 0 }));

    if (session) {
      const votes = await this.prisma.brainstormVote.findMany(session.id);
      const counts = new Map<string, number>();
      for (const v of votes) counts.set(v.noteId, (counts.get(v.noteId) || 0) + 1);
      ranked = notes.map((n) => ({ note: n, score: counts.get(n.id) || 0 })).sort((a, b) => b.score - a.score);
    }

    const topN = Math.max(1, Math.min(50, input?.topN || 10));
    const selected = ranked.slice(0, topN);

    const now = new Date().toISOString();
    const created: VaultIdeaRecord[] = [];
    for (const r of selected) {
      const title = r.note.textAr.slice(0, 72).trim() || 'فكرة';
      const idea: VaultIdeaRecord = {
        id: uid('idea'),
        organizationId: input?.organizationId,
        projectId: input?.projectId,
        state: 'raw',
        domain: 'culture_ideation',
        titleAr: title,
        oneLinerAr: r.note.textAr.trim(),
        audienceAr: '—',
        regionAr: undefined,
        formatAr: 'فعالية/تجربة',
        whyNowAr: '—',
        experienceSketchAr: '—',
        deliverablesAr: [],
        kpisAr: [],
        risksAr: [],
        evidenceMinCount: 3,
        brainstormBoardId: boardId,
        createdByUserId: r.note.createdByUserId,
        createdAt: now,
        updatedAt: now,
      };
      await this.prisma.ideaVault.create({ data: idea);
      created.push(idea);
    }

    return { ok: true, createdCount: created.length, items: created };
  }

  convertTopNotesToProgramTemplates(boardId: string, input?: { topN?: number; organizationId?: string }) {
    this.getBoard(boardId);
    const notes = await this.prisma.brainstormNote.findMany(boardId);
    const topN = Math.max(1, Math.min(40, input?.topN || 8));
    const now = new Date().toISOString();

    const created: ProgramTemplateRecord[] = [];
    for (const n of notes.slice(0, topN)) {
      const code = `TPL-${n.id.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const manifest = {
        sourceBoardId: boardId,
        seedNoteId: n.id,
        titleAr: n.textAr.slice(0, 80),
        structure: {
          phases: [
            { code: 'research', nameAr: 'بحث وإلهام', outputs: ['Evidence Pack', 'Moodboard'] },
            { code: 'story', nameAr: 'سردية وتصميم تجربة', outputs: ['Narrative', 'Experience Map'] },
            { code: 'simulate', nameAr: 'محاكاة واعتماد', outputs: ['Simulation KPIs', 'Approval Packet'] },
            { code: 'deliver', nameAr: 'تنفيذ وتسليم', outputs: ['Runbook', 'Assets', 'Reports'] },
          ],
        },
      };
      const tpl: ProgramTemplateRecord = {
        id: uid('ptpl'),
        organizationId: input?.organizationId,
        code,
        nameAr: n.textAr.slice(0, 80),
        domain: 'culture_program',
        manifestJson: JSON.stringify(manifest),
        createdAt: now,
        updatedAt: now,
      };
      await this.prisma.programTemplate.create({ data: tpl);
      created.push(tpl);
    }

    return { ok: true, createdCount: created.length, items: created };
  }

}
