import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyCouple, type CoupleState } from '@/services/couples'
import { qk } from '@/lib/queryKeys'
import type { Couple, Profile } from '@/types/domain'
import { shortName } from '@/utils/names'
import { useAuth } from './AuthProvider'

interface CoupleContextValue {
  couple: Couple | null
  members: Profile[]
  me: Profile | null
  partner: Profile | null
  /** Both people have joined the space. */
  complete: boolean
  isLoading: boolean
  isError: boolean
  refetch: () => void
  nameOf: (userId: string | null | undefined) => string
}

const CoupleContext = createContext<CoupleContextValue | null>(null)

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const query = useQuery<CoupleState | null>({
    queryKey: qk.couple(user?.id),
    queryFn: () => fetchMyCouple(user!.id),
    enabled: Boolean(user),
    // While waiting for the partner to join, check quietly.
    refetchInterval: (q) => (q.state.data && q.state.data.members.length < 2 ? 5000 : false),
  })

  const value = useMemo<CoupleContextValue>(() => {
    const data = query.data ?? null
    const members = data?.members ?? []
    const me = members.find((m) => m.id === user?.id) ?? null
    const partner = members.find((m) => m.id !== user?.id) ?? null
    return {
      couple: data?.couple ?? null,
      members,
      me,
      partner,
      complete: members.length >= 2,
      isLoading: query.isPending && Boolean(user),
      isError: query.isError,
      refetch: () => void query.refetch(),
      nameOf: (id) => shortName(members.find((m) => m.id === id)),
    }
  }, [query, user?.id, user])

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>
}

export function useCouple() {
  const ctx = useContext(CoupleContext)
  if (!ctx) throw new Error('useCouple must be used inside CoupleProvider')
  return ctx
}

/** For screens that only render once a couple exists. */
export function useCoupleRequired() {
  const ctx = useCouple()
  if (!ctx.couple) throw new Error('No couple loaded')
  return ctx as CoupleContextValue & { couple: Couple }
}
