export const qk = {
  couple: (userId: string | undefined) => ['couple', userId] as const,
  memories: (coupleId: string | undefined) => ['memories', coupleId] as const,
  letters: (coupleId: string | undefined) => ['letters', coupleId] as const,
  activity: (coupleId: string | undefined) => ['activity', coupleId] as const,
  notes: (coupleId: string | undefined) => ['notes', coupleId] as const,
  usage: (coupleId: string | undefined) => ['usage', coupleId] as const,
  replies: (coupleId: string | undefined) => ['replies', coupleId] as const,
}
