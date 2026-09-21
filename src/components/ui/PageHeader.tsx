import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  title?: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  /** Shows a back chevron. `true` goes back in history; a string is the fallback route. */
  back?: boolean | string
  trailing?: ReactNode
  className?: string
}

/** Large-title header, iOS style. */
export function PageHeader({ title, eyebrow, subtitle, back, trailing, className }: Props) {
  const navigate = useNavigate()
  const goBack = () => {
    const fallback = typeof back === 'string' ? back : '/'
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }

  return (
    <header className={cn('pt-safe', className)}>
      <div className="flex h-12 items-center justify-between gap-2 lg:h-10">
        {back ? (
          <button
            onClick={goBack}
            className="-ml-2 flex h-10 items-center gap-0.5 rounded-full pr-3 pl-1 text-[17px] text-accent active:opacity-50"
          >
            <ChevronLeft className="size-[26px]" strokeWidth={2} />
            <span>Atrás</span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">{trailing}</div>
      </div>
      {title ? (
        <div className="pt-1 pb-5">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="text-[34px] leading-[1.08] font-bold tracking-[-0.03em] text-balance">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-pretty text-muted">{subtitle}</p>}
        </div>
      ) : (
        <div className="h-3" />
      )}
    </header>
  )
}
