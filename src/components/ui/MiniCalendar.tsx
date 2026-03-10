'use client'

import { useState, useMemo } from 'react'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MiniCalendarProps {
  /** Conteo de ítems por fecha: { '2026-03-12': 3 } */
  dateCounts: Record<string, number>
  /** Fecha seleccionada (yyyy-MM-dd) o null */
  selectedDate: string | null
  /** Callback al seleccionar/deseleccionar una fecha */
  onSelectDate: (date: string | null) => void
  /** Semanas a mostrar (default 2) */
  weeksToShow?: number
}

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function MiniCalendar({
  dateCounts,
  selectedDate,
  onSelectDate,
  weeksToShow = 2,
}: MiniCalendarProps) {
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

  const rangeLabel = `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, totalDays - 1), "d MMM yyyy", { locale: es })}`

  const handleDayClick = (dateStr: string) => {
    onSelectDate(selectedDate === dateStr ? null : dateStr)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      {/* Nav */}
      <div className="mb-2 flex items-center justify-between">
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

      {/* Cabecera */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const count = dateCounts[key] ?? 0
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDayClick(key)}
              className={`
                relative flex flex-col items-center justify-center rounded-md py-1 text-xs transition-colors
                ${isSelected ? 'bg-iconsa-blue text-white' : ''}
                ${!isSelected && isToday ? 'ring-1 ring-iconsa-blue' : ''}
                ${!isSelected && count > 0 ? 'bg-gray-50 font-medium text-gray-800 hover:bg-gray-100' : ''}
                ${!isSelected && count === 0 ? 'text-gray-400 hover:bg-gray-50' : ''}
              `}
            >
              <span className="leading-none">{format(day, 'd')}</span>
              {count > 0 && (
                <span
                  className={`mt-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                    isSelected
                      ? 'bg-white/30 text-white'
                      : 'bg-iconsa-blue/10 text-iconsa-blue'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { MiniCalendar }
export type { MiniCalendarProps }
