import { differenceInCalendarDays } from 'date-fns'

/**
 * Timezone utilities for Panama (UTC-5, sin DST).
 *
 * Motivación: Next.js server runtime es UTC (Vercel), cliente es timezone del usuario.
 * Usar `new Date()` produce resultados distintos entre server y client. Para una app
 * que opera exclusivamente en Panamá, todo cálculo de "hoy" / "esta semana" debe
 * hacerse en timezone Panama explícitamente.
 *
 * Patrón: trabajamos con strings "YYYY-MM-DD" siempre que sea posible, y solo
 * construimos Date objects cuando necesitamos aritmética de fechas (date-fns).
 */

const PANAMA_TZ = 'America/Panama'

/**
 * Hoy como "YYYY-MM-DD" en timezone Panamá.
 * Funciona correctamente en cualquier runtime (UTC server, cualquier cliente).
 */
export function todayStrInPanama(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Extrae "YYYY-MM-DD" en timezone Panamá de cualquier Date o ISO timestamp.
 * Crítico para campos TIMESTAMPTZ que necesitan comparación date-only.
 */
export function dateStrInPanama(timestamp: string | Date): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Día de la semana (0=domingo, 1=lunes, ..., 6=sábado) en timezone Panamá.
 * Usar para gates tipo "saltar domingos" en crons.
 */
export function dayOfWeekInPanama(ref?: Date): number {
  const d = ref ?? new Date()
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: PANAMA_TZ,
    weekday: 'short',
  }).format(d)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[weekdayShort] ?? 0
}

/**
 * Parsea "YYYY-MM-DD" como start-of-day en Panamá (UTC-5 fijo, sin DST).
 * Retorna Date object que compara y ordena correctamente sin importar el runtime timezone.
 * Para strings no-date-only (ISO full), delega a new Date() normal.
 */
export function parseDateStrInPanama(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00-05:00')
  }
  return new Date(dateStr)
}

/**
 * Diferencia en días entre dos fechas, ambas interpretadas en timezone Panamá.
 * Acepta mix de strings "YYYY-MM-DD" y TIMESTAMPTZ ISO.
 * Positivo si `to` es después de `from`.
 */
export function daysBetweenInPanama(from: string | Date, to: string | Date): number {
  const fromStr =
    typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : dateStrInPanama(from)
  const toStr =
    typeof to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : dateStrInPanama(to)
  const fromDate = parseDateStrInPanama(fromStr)
  const toDate = parseDateStrInPanama(toStr)
  return differenceInCalendarDays(toDate, fromDate)
}
