import { format, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Priority } from './constants'

/**
 * Parsea un string de fecha como fecha LOCAL (no UTC).
 * "2026-03-10" → 10 de marzo local (no 9 de marzo por timezone).
 */
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  // Fechas tipo "YYYY-MM-DD" se parsean como UTC por JS.
  // Agregar T00:00:00 fuerza interpretación como hora local.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(date + 'T00:00:00')
  }
  return new Date(date)
}

/**
 * Formatea fecha a dd/MM/yyyy (estilo panameño).
 */
export function formatDate(date: string | Date): string {
  const d = parseLocalDate(date)
  return format(d, 'dd/MM/yyyy', { locale: es })
}

/**
 * Formatea fecha y hora a dd/MM/yyyy HH:mm.
 */
export function formatDateTime(date: string | Date): string {
  const d = parseLocalDate(date)
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
}

/**
 * Formatea monto en Balboas panameños: B/. 2,000.00
 */
export function formatCurrency(amount: number): string {
  return `B/. ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Formatea cantidad: entero si es número entero, 2 decimales si tiene fracción */
export function formatQty(n: number | null | undefined): string {
  if (n == null) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/**
 * Calcula prioridad basada en la fecha requerida vs hoy.
 * Vencida: fecha ya pasó
 * Urgente: 0-3 días
 * Próxima: 4-7 días
 * Normal: 8+ días
 */
export function calculatePriority(dateRequired: string | Date): Priority {
  const required = parseLocalDate(dateRequired)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysUntil = differenceInCalendarDays(required, today)

  if (daysUntil < 0) return 'Vencida'
  if (daysUntil <= 3) return 'Urgente'
  if (daysUntil <= 7) return 'Próxima'
  return 'Normal'
}

/**
 * Días hasta la fecha requerida. Negativo = vencido.
 */
export function daysUntilDue(dateRequired: string | Date): number {
  const required = parseLocalDate(dateRequired)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInCalendarDays(required, today)
}

/**
 * Formato compacto: "Hoy", "1", "2", "-1", "-2"
 */
export function formatDaysUntilDue(dateRequired: string | Date): string {
  const days = daysUntilDue(dateRequired)
  if (days === 0) return 'Hoy'
  return `${days}`
}

/**
 * Color Tailwind según días al vencimiento (misma lógica que prioridad).
 */
export function daysUntilDueColor(days: number): string {
  if (days < 0) return 'text-iconsa-red'
  if (days <= 3) return 'text-iconsa-orange'
  if (days <= 7) return 'text-iconsa-blue'
  return 'text-iconsa-green'
}

/**
 * Delta entre fecha requerida y fecha completada.
 * Positivo = completado antes de tiempo. Negativo = tarde.
 */
export function formatCompletionDelta(
  dateRequired: string,
  dateCompleted: string
): { text: string; color: string } {
  const required = parseLocalDate(dateRequired)
  // dateCompleted es TIMESTAMPTZ — convertir a fecha local (no usar parseLocalDate que extrae YYYY-MM-DD del string)
  const completedFull = new Date(dateCompleted)
  const completed = new Date(completedFull.getFullYear(), completedFull.getMonth(), completedFull.getDate())
  const days = differenceInCalendarDays(required, completed)
  if (days > 0) return { text: `${days}d antes`, color: 'text-iconsa-green' }
  if (days < 0) return { text: `${Math.abs(days)}d tarde`, color: 'text-iconsa-red' }
  return { text: 'a tiempo', color: 'text-iconsa-green' }
}

/**
 * Sub-status operativo para solicitudes "En Proceso".
 * Muestra resumen de líneas por estado.
 */
export function getOperationalSummary(lines: { status: string }[]): string {
  const inTransit = lines.filter(l => l.status === 'En Transito').length
  const delivered = lines.filter(l => l.status === 'Entregada').length
  const scheduled = lines.filter(l => l.status === 'Programada').length
  const pending = lines.filter(l => l.status === 'Pendiente').length
  const partial = lines.filter(l => l.status === 'Parcial').length
  const total = lines.length

  if (inTransit > 0) return `🚛 ${inTransit} en tránsito`
  if (delivered > 0 && (pending > 0 || scheduled > 0 || partial > 0))
    return `📦 ${delivered} de ${total} entregadas`
  if (scheduled > 0) return `📅 ${scheduled} programada${scheduled !== 1 ? 's' : ''}`
  if (pending > 0) return `⏳ ${pending} sin programar`
  return ''
}

/**
 * Formatea timestamp a hora local Panamá.
 */
export function formatTimePanama(timestamp: string | null | undefined): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Panama',
  })
}
