import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'plain' | 'filled' | 'overlay'
}

const tones = {
  plain: 'text-ink hover:bg-surface-2',
  filled: 'bg-surface-2 text-ink',
  overlay: 'bg-black/35 text-white backdrop-blur-md',
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, tone = 'plain', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-150 active:scale-90',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
