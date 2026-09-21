import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import { useCouple } from '@/providers/CoupleProvider'
import { fetchStorageUsage, STORAGE_LIMIT_BYTES, STORAGE_WARN_AT } from '@/services/usage'

export function useStorageUsage() {
  const { couple } = useCouple()
  const query = useQuery({
    queryKey: qk.usage(couple?.id),
    queryFn: fetchStorageUsage,
    enabled: Boolean(couple),
    staleTime: 5 * 60_000,
  })
  const used = query.data ?? 0
  const ratio = used / STORAGE_LIMIT_BYTES
  return { used, limit: STORAGE_LIMIT_BYTES, ratio, nearLimit: ratio >= STORAGE_WARN_AT, isLoading: query.isPending }
}
