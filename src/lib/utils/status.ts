import type { RequestStatus, LineStatus, TripStatus, Priority } from './constants'

// Colores Tailwind para estados de solicitud
const REQUEST_STATUS_STYLES: Record<RequestStatus, { bg: string; text: string }> = {
  'Borrador':    { bg: 'bg-gray-100',    text: 'text-gray-700' },
  'Enviada':     { bg: 'bg-blue-100',    text: 'text-blue-700' },
  'En Proceso':  { bg: 'bg-orange-100',  text: 'text-orange-700' },
  'Completada':  { bg: 'bg-green-100',   text: 'text-green-700' },
  'Parcial':     { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  'Cancelada':   { bg: 'bg-red-100',     text: 'text-red-700' },
}

// Colores Tailwind para estados de línea
const LINE_STATUS_STYLES: Record<LineStatus, { bg: string; text: string }> = {
  'Pendiente':    { bg: 'bg-gray-100',    text: 'text-gray-700' },
  'Programada':   { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'En Transito':  { bg: 'bg-orange-100',  text: 'text-orange-700' },
  'Entregada':    { bg: 'bg-green-100',   text: 'text-green-700' },
  'Parcial':      { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  'Cancelada':    { bg: 'bg-red-100',     text: 'text-red-700' },
}

// Colores Tailwind para estados de viaje
const TRIP_STATUS_STYLES: Record<TripStatus, { bg: string; text: string }> = {
  'Programado':  { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'En Ruta':     { bg: 'bg-orange-100',  text: 'text-orange-700' },
  'Completado':  { bg: 'bg-green-100',   text: 'text-green-700' },
  'Cancelado':   { bg: 'bg-red-100',     text: 'text-red-700' },
}

// Colores Tailwind para prioridades
const PRIORITY_STYLES: Record<Priority, { bg: string; text: string }> = {
  'Vencida':  { bg: 'bg-red-100',     text: 'text-red-700' },
  'Urgente':  { bg: 'bg-orange-100',  text: 'text-orange-700' },
  'Próxima':  { bg: 'bg-blue-100',    text: 'text-blue-700' },
  'Normal':   { bg: 'bg-green-100',   text: 'text-green-700' },
}

export function getRequestStatusStyle(status: string) {
  return REQUEST_STATUS_STYLES[status as RequestStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}

export function getLineStatusStyle(status: string) {
  return LINE_STATUS_STYLES[status as LineStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}

export function getTripStatusStyle(status: string) {
  return TRIP_STATUS_STYLES[status as TripStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}

export function getPriorityStyle(priority: string) {
  return PRIORITY_STYLES[priority as Priority] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}
