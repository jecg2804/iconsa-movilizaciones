import { ROLE_ROUTES, type AppRole } from './constants'

/**
 * Verifica si un rol puede acceder a una ruta.
 * Compara el inicio de la ruta con las rutas permitidas del rol.
 */
export function canAccess(role: string | null, route: string): boolean {
  if (!role) return false
  const allowedRoutes = ROLE_ROUTES[role as AppRole]
  if (!allowedRoutes) return false
  return allowedRoutes.some((r) => route.startsWith(r))
}

/**
 * PM y admin pueden crear solicitudes.
 * Logística NO crea solicitudes (solo edita).
 */
export function canCreateSolicitud(role: string | null): boolean {
  return role === 'pm' || role === 'admin'
}

/**
 * PM puede editar solo solicitudes de SUS proyectos.
 * Admin puede editar cualquier solicitud.
 * Logística NO edita solicitudes (RLS lo bloquea).
 */
export function canEditSolicitud(
  role: string | null,
  projectId: string,
  userProjectIds: string[],
): boolean {
  if (!role) return false
  if (role === 'admin') return true
  if (role === 'pm') return userProjectIds.includes(projectId)
  return false
}

/**
 * Solo logística y admin pueden crear/editar viajes.
 */
export function canCreateTrip(role: string | null): boolean {
  return role === 'logistica' || role === 'admin'
}

/**
 * Logística, campo, almacén, admin, y PM pueden registrar eventos de viaje.
 * PM necesita registrar entregas (confirmación con código).
 * Sin restricción por driver_id en MVP.
 */
export function canRegisterEvent(role: string | null): boolean {
  return (
    role === 'logistica' ||
    role === 'campo' ||
    role === 'almacen' ||
    role === 'admin' ||
    role === 'pm'
  )
}

/**
 * Solo admin puede acceder a tablas maestras.
 */
export function canAccessAdmin(role: string | null): boolean {
  return role === 'admin'
}
