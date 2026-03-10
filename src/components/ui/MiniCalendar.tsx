'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface CalendarItem {
  id: string
  date: string
  label: string
  status: string
  badgeVariant: 'trip' | 'status' | 'priority'
  subtitle: string
  route?: string
  href: string
}

interface MiniCalendarProps {
  items: CalendarItem[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  weeksToShow?: number
}

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_CARDS = 3

function MiniCalendar({
  items,
  selectedDate,
  onSelectDate,
  weeksToShow = 2,
}: MiniCalendarProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )

  const today = useMemo(() => new Date(), [])
  const totalDays = weeksToShow * 7

  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(weekStart, i))
    }
    return result
  }, [weekStart, totalDays])

  // Agrupar items por fecha
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date)!.push(item)
    }
    return map
  }, [items])

  const rangeLabel = `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, totalDays - 1), "d MMM yyyy", { locale: es })}`

  const handleDayClick = (dateStr: string) => {
    onSelectDate(selectedDate === dateStr ? null : dateStr)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setWeekStart((p) => addDays(p, -7))}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 capitalize">
            {rangeLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-iconsa-blue hover:bg-blue-50"
          >
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={() => setWeekStart((p) => addDays(p, 7))}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block">
        {/* Cabecera días */}
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="bg-gray-50 px-2 py-1 text-center text-[10px] font-semibold text-gray-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Filas de días */}
        {Array.from({ length: weeksToShow }, (_, row) => (
          <div key={row} className="grid grid-cols-7 gap-px bg-gray-100">
            {days.slice(row * 7, row * 7 + 7).map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayItems = itemsByDate.get(key) ?? []
              const isToday = isSameDay(day, today)
              const isSelected = selectedDate === key
              const visibleItems = dayItems.slice(0, MAX_CARDS)
              const overflow = dayItems.length - MAX_CARDS

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(key)}
                  className={`min-h-[140px] bg-white p-1.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isSelected ? 'ring-2 ring-inset ring-iconsa-blue bg-blue-50/30' : ''
                  } ${isToday && !isSelected ? 'ring-1 ring-inset ring-iconsa-blue/40' : ''}`}
                >
                  {/* Número del día */}
                  <div className="mb-1 flex items-center gap-1">
                    <span
                      className={`text-[11px] font-medium leading-none ${
                        isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-iconsa-blue text-white'
                          : isSelected
                            ? 'text-iconsa-blue'
                            : 'text-gray-500'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayItems.length > 0 && !isToday && (
                      <span className="text-[9px] font-medium text-gray-400">
                        ({dayItems.length})
                      </span>
                    )}
                  </div>

                  {/* Mini-cards */}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(item.href)
                        }}
                        className="w-full rounded border border-gray-150 bg-white p-1 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <span className="font-mono text-[10px] font-medium text-iconsa-navy truncate">
                            {item.label}
                          </span>
                          <Badge
                            label={item.status}
                            variant={item.badgeVariant}
                            className="text-[8px] px-1 py-0 leading-tight"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 truncate leading-tight">
                          {item.subtitle}
                        </p>
                        {item.route && (
                          <p className="text-[9px] text-gray-400 truncate leading-tight">
                            {item.route}
                          </p>
                        )}
                      </button>
                    ))}
                    {overflow > 0 && (
                      <span className="block text-[9px] text-iconsa-blue font-medium pl-1">
                        +{overflow} más
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Mobile: lista vertical */}
      <div className="md:hidden divide-y divide-gray-100">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayItems = itemsByDate.get(key) ?? []
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate === key

          if (dayItems.length === 0 && !isToday) return null

          return (
            <div
              key={key}
              className={`${isSelected ? 'bg-blue-50/40' : ''}`}
            >
              {/* Cabecera del día */}
              <button
                type="button"
                onClick={() => handleDayClick(key)}
                className={`w-full px-3 py-1.5 text-left text-xs font-medium ${
                  isToday ? 'text-iconsa-blue' : 'text-gray-600'
                } hover:bg-gray-50`}
              >
                {format(day, "EEE d 'de' MMM", { locale: es })}
                {isToday && (
                  <span className="ml-1.5 rounded-full bg-iconsa-blue px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    Hoy
                  </span>
                )}
                {dayItems.length > 0 && (
                  <span className="ml-1 text-gray-400">({dayItems.length})</span>
                )}
              </button>

              {/* Cards del día */}
              {dayItems.length > 0 && (
                <div className="px-3 pb-2 space-y-1">
                  {dayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-mono text-xs font-medium text-iconsa-navy truncate">
                          {item.label}
                        </span>
                        <Badge label={item.status} variant={item.badgeVariant} />
                      </div>
                      <p className="text-xs text-gray-600 truncate">{item.subtitle}</p>
                      {item.route && (
                        <p className="text-[11px] text-gray-400 truncate">{item.route}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Día vacío (solo hoy) */}
              {dayItems.length === 0 && (
                <p className="px-3 pb-2 text-xs text-gray-400 italic">Sin actividad</p>
              )}
            </div>
          )
        })}

        {/* Sin items en ningún día */}
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">
            Sin actividad en este período
          </div>
        )}
      </div>
    </div>
  )
}

export { MiniCalendar }
export type { MiniCalendarProps, CalendarItem }
