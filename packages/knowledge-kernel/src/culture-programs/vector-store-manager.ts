export function getCultureProgramsVectorStoreStatus(input: { documents: number; chunks: number; syncCount: number; }) {
  return { mode: 'scaffolded_vector_store', documents: input.documents, chunks: input.chunks, syncCount: input.syncCount, syncState: input.documents > 0 ? 'ready_for_sync' : 'empty' } as const;
}
