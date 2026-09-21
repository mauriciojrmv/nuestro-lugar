import { useParams } from 'react-router'
import { useArchive } from '@/hooks/useArchive'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { MemoryDetail } from '@/components/memory/MemoryDetail'

export function MemoryPage() {
  const { id = '' } = useParams()
  const { byId, isLoading } = useArchive()
  const memory = byId.get(id)

  return (
    <div className="mx-auto max-w-[680px]">
      <PageHeader back="/" />
      {memory ? (
        <MemoryDetail memory={memory} afterDelete="/" />
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-60" />
          <Skeleton className="aspect-[4/5] w-full" />
        </div>
      ) : (
        <EmptyState title="Este recuerdo ya no está aquí." message="Puede que se haya eliminado." />
      )}
    </div>
  )
}
