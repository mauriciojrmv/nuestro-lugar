import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Inset grouped list, like iOS Settings. */
export function ListGroup({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-8', className)}>
      {title && <h2 className="mb-2 px-4 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">{title}</h2>}
      <div className="overflow-hidden rounded-[20px] bg-surface">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] text-pretty text-muted">{footer}</p>}
    </section>
  )
}

interface RowProps {
  icon?: ReactNode
  label: ReactNode
  detail?: ReactNode
  to?: string
  onClick?: () => void
  destructive?: boolean
  chevron?: boolean
  trailing?: ReactNode
}

export function ListRow({ icon, label, detail, to, onClick, destructive, chevron, trailing }: RowProps) {
  const content = (
    <>
      {icon && (
        <span className={cn('grid size-[30px] shrink-0 place-items-center rounded-[9px] [&>svg]:size-[18px]', destructive ? 'bg-rose/15 text-rose' : 'bg-accent-soft text-accent')}>
          {icon}
        </span>
      )}
      <span className={cn('min-w-0 flex-1 truncate text-[17px]', destructive && 'text-rose')}>{label}</span>
      {detail && <span className="max-w-[45%] truncate text-[15px] text-muted">{detail}</span>}
      {trailing}
      {(chevron ?? Boolean(to)) && <ChevronRight className="size-[18px] shrink-0 text-muted/60" strokeWidth={2.2} />}
    </>
  )
  const className =
    'group flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors active:bg-surface-2 [&+&]:border-t [&+&]:border-hairline'
  if (to)
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    )
  return <div className={className}>{content}</div>
}

/** iOS switch. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-surface-2 ring-1 ring-hairline',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[var(--ease-ios)]',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
