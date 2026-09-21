import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

/** Filled text field with a floating label. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, hint, className, id, ...rest }, ref) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className="relative rounded-[16px] bg-surface ring-1 ring-hairline transition-shadow focus-within:ring-2 focus-within:ring-accent/60">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          className="peer h-[58px] w-full rounded-[16px] bg-transparent px-4 pt-5 pb-1.5 text-[17px] outline-none"
          {...rest}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute top-1/2 left-4 origin-left -translate-y-1/2 text-[17px] text-muted transition-all duration-200',
            'peer-focus:top-[15px] peer-focus:text-[12px] peer-[:not(:placeholder-shown)]:top-[15px] peer-[:not(:placeholder-shown)]:text-[12px]',
          )}
        >
          {label}
        </label>
      </div>
      {hint && <p className="mt-1.5 px-1 text-[13px] text-muted">{hint}</p>}
    </div>
  )
})
