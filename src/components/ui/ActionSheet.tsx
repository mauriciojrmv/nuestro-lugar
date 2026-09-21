import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Sheet } from './Sheet'

export interface SheetActionItem {
  label: string
  icon?: ReactNode
  destructive?: boolean
  onSelect: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  actions: SheetActionItem[]
}

/** A short list of choices, like an iOS action sheet. */
export function ActionSheet({ open, onClose, title, message, actions }: Props) {
  return (
    <Sheet open={open} onClose={onClose} label={title ?? 'Opciones'}>
      <div className="px-4 pt-2 pb-4">
        {(title || message) && (
          <div className="px-2 pb-3 text-center">
            {title && <p className="text-[15px] font-semibold">{title}</p>}
            {message && <p className="mt-1 text-[14px] text-pretty text-muted">{message}</p>}
          </div>
        )}
        <div className="overflow-hidden rounded-[18px] bg-fill">
          {actions.map((a, i) => (
            <button
              key={a.label}
              onClick={() => {
                onClose()
                a.onSelect()
              }}
              className={cn(
                'flex h-[58px] w-full items-center gap-3.5 px-4 text-left text-[17px] transition-colors active:bg-surface-2/80',
                i > 0 && 'border-t border-hairline',
                a.destructive ? 'text-rose' : 'text-ink',
              )}
            >
              {a.icon && <span className={cn('[&>svg]:size-[22px]', a.destructive ? 'text-rose' : 'text-ink-2')}>{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-2.5 h-[58px] w-full rounded-[18px] bg-fill text-[17px] font-semibold transition-colors active:bg-surface-2/80"
        >
          Cancelar
        </button>
      </div>
    </Sheet>
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  title: string
  message?: string
  confirmLabel: string
  onConfirm: () => void
}

/** Destructive confirmation. */
export function ConfirmSheet({ open, onClose, title, message, confirmLabel, onConfirm }: ConfirmProps) {
  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={title}
      message={message}
      actions={[{ label: confirmLabel, destructive: true, onSelect: onConfirm }]}
    />
  )
}
