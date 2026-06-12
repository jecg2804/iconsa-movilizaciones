// Design tokens ICONSA
export const COLORS = {
  navy: '#1B3A5C',    // primary — headers, nav, branding
  gold: '#F0A500',    // accent — ICONSA brand
  blue: '#0A6EBD',    // info, links, Enviada
  green: '#1A7F5A',   // success, Completada
  orange: '#B45309',  // warning, Urgente, En Proceso
  red: '#C0392B',     // error, Vencida, Cancelada
  purple: '#553C9A',  // Programada, asignaciones
  gray: '#5A6272',    // secondary text
} as const

// Estados de solicitud (sm_requests.status)
export const REQUEST_STATUSES = [
  'Borrador',
  'Enviada',
  'En Proceso',
  'Completada',
  'Cancelada',
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

// Estados de línea (sm_request_lines.status)
export const LINE_STATUSES = [
  'Pendiente',
  'Programada',
  'En Transito',
  'Entregada',
  'Parcial',
  'Cancelada',
] as const
export type LineStatus = (typeof LINE_STATUSES)[number]

// Estados de viaje (trips.status)
export const TRIP_STATUSES = [
  'Programado',
  'En Ruta',
  'Completado',
  'Cancelado',
] as const
export type TripStatus = (typeof TRIP_STATUSES)[number]

// Prioridades auto-calculadas
export const PRIORITIES = [
  'Vencida',
  'Urgente',
  'Próxima',
  'Normal',
] as const
export type Priority = (typeof PRIORITIES)[number]

// Roles del sistema (people.app_role)
export const APP_ROLES = [
  'admin',
  'pm',
  'logistica',
  'campo',
  'almacen',
] as const
export type AppRole = (typeof APP_ROLES)[number]

// Tipos de línea
export const LINE_TYPES = ['Equipo', 'Material'] as const
export type LineType = (typeof LINE_TYPES)[number]

// Categorías de costo
export const COST_CATEGORIES = [
  'ICS', 'EQI', 'EQA', 'MAT', 'SAL', 'OTR', 'CON', 'SUB',
] as const

// Tipos de evento de viaje
export const EVENT_TYPES = [
  'Salida',
  'Llegada',
  'Entrega',
  'Retorno',
  'Incidencia',
  'Parada',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

// Rutas de la app y qué roles pueden acceder
export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: [
    '/dashboard',
    '/solicitudes',
    '/programacion',
    '/mis-viajes',
    '/admin',
  ],
  pm: [
    '/dashboard',
    '/solicitudes',
    '/programacion', // solo lectura
    '/mis-viajes',   // solo lectura — ver viajes de sus solicitudes
  ],
  logistica: [
    '/dashboard',
    '/solicitudes',
    '/programacion',
    '/mis-viajes',
  ],
  campo: [
    '/mis-viajes',
  ],
  almacen: [
    '/dashboard',
    '/mis-viajes',
  ],
}

// Labels de roles en español para UI
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  pm: 'Ingeniero de Proyecto',
  logistica: 'Coordinador Logística',
  campo: 'Conductor',
  almacen: 'Almacenista',
}
