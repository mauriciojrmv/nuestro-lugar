import { useRef, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatRelativeDay, isValidISODate, type ISODate } from '@/lib/dates'

interface Props {
  value: ISODate
  onChange: (value: ISODate) => void
  icon: ReactNode
  label: string
  max?: ISODate
}

/**
 * Shows "Hoy" / "Ayer" / "5 de septiembre". Tapping opens the platform's own
 * date picker (the wheel on iOS), through a transparent native input.
 */
export function DateRow({ value, onChange, icon, label, max }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <label className="relative flex min-h-[52px] cursor-pointer items-center gap-3 px-4">
      <span className="text-muted [&>svg]:size-[20px]">{icon}</span>
      <span className="flex-1 text-[17px]">{label}</span>
      <span className="text-[17px] font-medium text-accent">{formatRelativeDay(value)}</span>
      <ChevronRight className="size-[18px] text-muted/60" strokeWidth={2.2} />
      <input
        ref={inputRef}
        type="date"
        value={value}
        max={max}
        required
        aria-label={label}
        onClick={() => {
          try {
            inputRef.current?.showPicker?.()
          } catch {
            // Some browsers only allow it from certain gestures; the input still works.
          }
        }}
        onChange={(e) => isValidISODate(e.target.value) && onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full"
      />
    </label>
  )
}
