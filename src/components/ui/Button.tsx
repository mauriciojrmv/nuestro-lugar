import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive'
type Size = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bg',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  accent: 'bg-accent-fill text-[#0B0B0D]',
  destructive: 'bg-surface-2 text-rose',
}

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-[15px] rounded-[14px]',
  lg: 'h-[54px] px-6 text-[17px] rounded-[16px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] select-none',
        'transition-[transform,opacity,background-color] duration-150 ease-[var(--ease-soft)]',
        'active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
        {icon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </button>
  )
})
