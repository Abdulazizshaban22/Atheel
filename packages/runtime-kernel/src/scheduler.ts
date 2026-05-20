export function computeDueAt(input: { startedAt?: string; targetMinutes?: number }) {
  if (!input.targetMinutes) return undefined;
  const start = input.startedAt ? new Date(input.startedAt) : new Date();
  const due = new Date(start.getTime() + input.targetMinutes * 60_000);
  return due.toISOString();
}

export function sortQueue<T extends { queueScore: number; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.queueScore !== a.queueScore) return b.queueScore - a.queueScore;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
