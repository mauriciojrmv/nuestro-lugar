import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, Mail, Plus } from 'lucide-react'
import { capitalize, formatDayMonth, formatWeekday, isValidISODate, monthName, todayISO, type ISODate } from '@/lib/dates'
import { useArchive, useLetters } from '@/hooks/useArchive'
import { useComposer } from '@/providers/ComposerProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { MemoryRow } from '@/components/memory/MemoryCard'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import type { Letter, Memory } from '@/types/domain'

export function CalendarPage() {
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const selectedParam = params.get('dia')
  const selected = selectedParam && isValidISODate(selectedParam) ? selectedParam : today
  const monthParam = params.get('mes')
  const [year, month] = (monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : selected.slice(0, 7))
    .split('-')
    .map(Number)
  const [direction, setDirection] = useState(0)

  const { byDate } = useArchive()
  const { data: letters } = useLetters()
  const letterDates = useMemo(() => new Set((letters ?? []).map((l) => l.date)), [letters])
  const compose = useComposer()

  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const monthCount = [...byDate.entries()].filter(([d]) => d.startsWith(monthKey)).reduce((n, [, list]) => n + list.length, 0)

  const go = (dir: 1 | -1) => {
    const d = new Date(year, month - 1 + dir, 1)
    setDirection(dir)
    setParams(
      (p) => {
        p.set('mes', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        return p
      },
      { replace: true },
    )
  }

  const select = (iso: ISODate) =>
    setParams(
      (p) => {
        p.set('dia', iso)
        p.set('mes', iso.slice(0, 7))
        return p
      },
      { replace: true },
    )

  const goToday = () => {
    setDirection(monthKey < today.slice(0, 7) ? 1 : -1)
    setParams({}, { replace: true })
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,620px)_minmax(280px,340px)] lg:gap-14">
      <section>
        <header className="pt-safe pb-5">
          <div className="flex items-center justify-between gap-2 pt-12 lg:pt-8">
            <h1 className="min-w-0 truncate text-[clamp(26px,8.4vw,34px)] leading-none font-bold tracking-[-0.03em]">
              {capitalize(monthName(month - 1))} <span className="text-muted">{year}</span>
            </h1>
            <div className="-mr-2 flex shrink-0 items-center">
              <IconButton label="Mes anterior" onClick={() => go(-1)}>
                <ChevronLeft className="size-6" strokeWidth={2} />
              </IconButton>
              <IconButton label="Mes siguiente" onClick={() => go(1)}>
                <ChevronRight className="size-6" strokeWidth={2} />
              </IconButton>
            </div>
          </div>
          <div className="mt-2 flex h-6 items-center gap-3 text-[14px] text-muted">
            {monthCount > 0 && <span>{`${monthCount} ${monthCount === 1 ? 'recuerdo' : 'recuerdos'}`}</span>}
            {monthKey !== today.slice(0, 7) && (
              <button onClick={goToday} className="font-semibold text-accent active:opacity-50">
                Volver a hoy
              </button>
            )}
          </div>
        </header>

        <MonthGrid
          year={year}
          month={month - 1}
          direction={direction}
          byDate={byDate}
          letterDates={letterDates}
          selected={selected}
          today={today}
          onSelect={select}
          onSwipe={go}
        />
      </section>

      <DayPanel
        date={selected}
        today={today}
        onAdd={() => compose({ date: selected })}
        letters={(letters ?? []).filter((l) => l.date === selected)}
        memories={byDate.get(selected) ?? []}
      />
    </div>
  )
}

function DayPanel({
  date,
  today,
  memories,
  letters,
  onAdd,
}: {
  date: ISODate
  today: ISODate
  memories: Memory[]
  letters: Letter[]
  onAdd: () => void
}) {
  const { nameOf } = useCouple()
  const empty = memories.length === 0 && letters.length === 0

  return (
    <section key={date} className="mt-8 animate-fade-in border-t border-hairline pt-6 lg:mt-0 lg:border-t-0 lg:pt-[112px]">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          {date === today ? 'Hoy' : capitalize(formatWeekday(date))}
          <span className="ml-2 font-medium text-muted">{formatDayMonth(date)}</span>
        </h2>
        {!empty && (
          <Link to={`/dia/${date}`} className="text-[15px] font-semibold text-accent active:opacity-50">
            Ver día
          </Link>
        )}
      </div>

      {empty ? (
        <div className="rounded-[22px] bg-surface px-5 py-6">
          <p className="text-[16px] text-muted">Nada guardado este día.</p>
          {date <= today && (
            <Button variant="secondary" className="mt-4" icon={<Plus className="size-[18px]" />} onClick={onAdd}>
              Añadir recuerdo
            </Button>
          )}
        </div>
      ) : (
        <div className="-mx-2 space-y-0.5">
          {memories.map((m) => (
            <MemoryRow key={m.id} memory={m} />
          ))}
          {letters.map((l) => (
            <Link key={l.id} to={`/cartitas/${l.id}`} className="flex items-center gap-3.5 rounded-[18px] p-2 active:bg-surface-2">
              <span className="grid size-[60px] shrink-0 place-items-center rounded-[14px] bg-paper text-rose ring-1 ring-hairline">
                <Mail className="size-6" strokeWidth={1.6} />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold">Cartita para {nameOf(l.recipientId)}</span>
                <span className="block text-[14px] text-muted">De {nameOf(l.authorId)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
