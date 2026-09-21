import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { cn } from '@/lib/cn'
import { WEEKDAY_INITIALS, monthMatrix, type ISODate } from '@/lib/dates'
import { coverOf } from '@/hooks/useArchive'
import { SignedImage } from '@/components/ui/SignedImage'
import type { Memory } from '@/types/domain'

interface Props {
  year: number
  month: number
  /** +1 / -1, drives the horizontal transition. */
  direction: number
  byDate: Map<ISODate, Memory[]>
  letterDates: Set<ISODate>
  selected: ISODate | null
  today: ISODate
  onSelect: (iso: ISODate) => void
  onSwipe: (dir: 1 | -1) => void
}

/** The month as a map of the relationship: tiny photos on the days that have them. */
export function MonthGrid({ year, month, direction, byDate, letterDates, selected, today, onSelect, onSwipe }: Props) {
  const weeks = monthMatrix(year, month)

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) onSwipe(1)
    else if (info.offset.x > 60 || info.velocity.x > 400) onSwipe(-1)
  }

  return (
    <div>
      <div className="grid grid-cols-7 pb-2">
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i} className="text-center text-[13px] font-semibold text-muted">
            {d}
          </span>
        ))}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`${year}-${month}`}
            custom={direction}
            initial={{ x: `${direction * 40}%`, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: `${direction * -40}%`, opacity: 0 }}
            transition={{ x: { type: 'spring', stiffness: 380, damping: 38 }, opacity: { duration: 0.18 } }}
            drag="x"
            dragDirectionLock
            dragSnapToOrigin
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            className="grid touch-pan-y grid-cols-7 gap-y-1"
            role="grid"
          >
            {weeks.flat().map((day) => {
              if (!day.inMonth) return <span key={day.iso} aria-hidden />
              const memories = byDate.get(day.iso) ?? []
              const cover = memories.map(coverOf).find(Boolean)
              const isToday = day.iso === today
              const isSelected = day.iso === selected
              const hasLetter = letterDates.has(day.iso)
              return (
                <button
                  key={day.iso}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${day.day}${memories.length ? `, ${memories.length} ${memories.length === 1 ? 'recuerdo' : 'recuerdos'}` : ''}`}
                  onClick={() => onSelect(day.iso)}
                  className="flex aspect-[0.74] flex-col items-center gap-1 rounded-[14px] pt-1 transition-colors active:bg-surface-2 sm:aspect-[0.9]"
                >
                  <span
                    className={cn(
                      'grid size-[34px] place-items-center rounded-full text-[17px] tabular-nums transition-colors duration-200',
                      isSelected ? 'bg-ink font-semibold text-bg' : isToday ? 'bg-accent/15 font-bold text-accent' : 'text-ink',
                    )}
                  >
                    {day.day}
                  </span>
                  {cover ? (
                    <SignedImage
                      path={cover.thumbPath ?? cover.storagePath}
                      frameClassName="aspect-square w-[74%] max-w-[52px] rounded-[9px]"
                    />
                  ) : (
                    <span className="flex h-[7px] gap-1">
                      {memories.length > 0 && <span className="size-[7px] rounded-full bg-accent" />}
                      {hasLetter && <span className="size-[7px] rounded-full bg-rose" />}
                    </span>
                  )}
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
