import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Priority } from './constants'
import {
  todayStrInPanama,
  parseDateStrInPanama,
  daysBetweenInPanama,
} from './datetime'

/**
 * Parsea un string de fecha en timezone Panamá.
 * Reemplaza el antiguo parseLocalDate que usaba timezone del runtime.
 */
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  return parseDateStrInPanama(date)
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
 * Calcula prioridad basada en la fecha requerida vs hoy (en Panamá).
 * Vencida: fecha ya pasó
 * Urgente: 0-3 días
 * Próxima: 4-7 días
 * Normal: 8+ días
 */
export function calculatePriority(dateRequired: string | Date): Priority {
  const daysUntil = daysBetweenInPanama(todayStrInPanama(), dateRequired)

  if (daysUntil < 0) return 'Vencida'
  if (daysUntil <= 3) return 'Urgente'
  if (daysUntil <= 7) return 'Próxima'
  return 'Normal'
}

/**
 * Días hasta la fecha requerida (en Panamá). Negativo = vencido.
 */
export function daysUntilDue(dateRequired: string | Date): number {
  return daysBetweenInPanama(todayStrInPanama(), dateRequired)
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
 * Delta entre fecha requerida y fecha completada (ambas en Panamá).
 * Positivo = completado antes de tiempo. Negativo = tarde.
 *
 * dateRequired es date-only ("YYYY-MM-DD"), dateCompleted es TIMESTAMPTZ.
 * daysBetweenInPanama maneja ambos casos correctamente extrayendo la fecha
 * en timezone Panamá antes de comparar.
 */
export function formatCompletionDelta(
  dateRequired: string,
  dateCompleted: string
): { text: string; color: string } {
  // daysBetweenInPanama: positivo si `to` es después de `from`.
  // Aquí queremos: positivo = entregado antes (required - completed > 0).
  const days = -daysBetweenInPanama(dateRequired, dateCompleted)
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
 * Formatea timestamp a hora local Panamá. Retorna '—' si el input es inválido.
 */
export function formatTimePanama(timestamp: string | null | undefined): string {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Panama',
  })
}

/**
 * Genera tooltip extendido para badges de status en line cards.
 * Incluye contexto per-status (provider para externo, fecha aprobación
 * para pickup, scheduled date para programada, etc.).
 *
 * @param status - Status canónico de la línea
 * @param info - Objeto con campos opcionales para contexto extendido
 */
export function statusContextString(
  status: string,
  info?: {
    pickup_approved_at?: string | null
    pickup_received_by_name?: string | null
    pickup_completed_at?: string | null
    external_provider_name?: string | null
    external_invoice_amount?: number | null
    external_approved_at?: string | null
    external_completed_at?: string | null
    external_received_by_name?: string | null
    qty_delivered?: number | null
    quantity?: number
    delivered_at?: string | null
  },
): string {
  if (!info) return status
  switch (status) {
    case 'Entregada':
      if (info.external_completed_at) {
        const receiver = info.external_received_by_name ?? '(no captado)'
        return `Entregada externo: ${info.quantity ?? '—'} el ${formatDate(info.external_completed_at)}, receptor ${receiver}`
      }
      if (info.pickup_completed_at) {
        const receiver = info.pickup_received_by_name ?? '—'
        return `Entregada pickup: ${info.quantity ?? '—'} el ${formatDate(info.pickup_completed_at)}, receptor ${receiver}`
      }
      if (info.delivered_at) {
        return `Entregada: ${info.qty_delivered ?? info.quantity ?? '—'} de ${info.quantity ?? '—'} el ${formatDate(info.delivered_at)}`
      }
      return status
    case 'Parcial':
      return `Parcial: ${info.qty_delivered ?? 0} de ${info.quantity ?? '—'} entregadas`
    default:
      return status
  }
}
