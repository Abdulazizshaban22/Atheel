
export function getUrbanExperienceVectorStoreStatus(input: { documents: number; chunks: number; syncCount: number; }) {
  const syncState = input.documents === 0 ? 'empty' : input.syncCount >= input.documents ? 'scaffolded_ready' : 'out_of_sync';
  return { mode: 'scaffolded_vector_store', syncState, documents: input.documents, chunks: input.chunks, syncedDocuments: input.syncCount };
}
