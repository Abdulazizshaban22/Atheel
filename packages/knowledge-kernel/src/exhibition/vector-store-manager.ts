export function getExhibitionVectorStoreStatus(input: { documents: number; chunks: number; syncCount: number }) {
  return { mode: 'scaffolded_vector_store', syncState: input.syncCount >= input.documents ? 'in_sync' : 'out_of_sync', documents: input.documents, chunks: input.chunks, syncCount: input.syncCount };
}
