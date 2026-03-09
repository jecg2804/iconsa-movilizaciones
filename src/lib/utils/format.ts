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
