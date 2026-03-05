import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

interface DuplicateCheckParams {
  lineType: 'Equipo' | 'Material'
  equipmentId: string | null
  description: string
  fromLocationId: string | null
  toLocationId: string | null
  excludeRequestId?: string
}

export interface DuplicateResult {
  requestId: string
  lineNumber: number
  description: string
  status: string
  fromName: string
  toName: string
}

/**
 * Busca lineas activas similares en otras solicitudes.
 * Para tipo Equipo: coincidencia exacta por equipment_id.
 * Para tipo Material: coincidencia parcial por descripcion (ILIKE).
 * Opcionalmente filtra por ruta (from/to location).
 * Excluye solicitudes canceladas/completadas y lineas canceladas/entregadas.
 */
export async function checkDuplicateLines(
  supabase: SupabaseClient<Database>,
  params: DuplicateCheckParams,
): Promise<DuplicateResult[]> {
  const {
    lineType,
    equipmentId,
    description,
    fromLocationId,
    toLocationId,
    excludeRequestId,
  } = params

  // Para Equipo necesitamos un equipment_id real para buscar duplicados
  if (lineType === 'Equipo' && !equipmentId) {
    return []
  }

  // Para Material necesitamos al menos una descripcion con contenido
  if (lineType === 'Material' && description.trim().length < 3) {
    return []
  }

  // Construir query base: lineas con su solicitud padre
  let query = supabase
    .from('sm_request_lines')
    .select(`
      line_number,
      description,
      status,
      equipment_id,
      from_location_id,
      to_location_id,
      request:sm_requests!sm_request_lines_request_id_fkey (
        id,
        request_id,
        status
      )
    `)
    .not('status', 'in', '("Cancelada","Entregada")')

  // Filtrar por tipo de coincidencia
  if (lineType === 'Equipo') {
    query = query.eq('equipment_id', equipmentId!)
  } else {
    // Busqueda parcial por descripcion para materiales
    query = query.ilike('description', `%${description.trim()}%`)
  }

  // Filtrar por ruta si se proporcionan ubicaciones
  if (fromLocationId) {
    query = query.eq('from_location_id', fromLocationId)
  }
  if (toLocationId) {
    query = query.eq('to_location_id', toLocationId)
  }

  const { data: lines, error: linesError } = await query

  if (linesError || !lines) {
    return []
  }

  // Filtrar: solicitud no cancelada/completada, y excluir solicitud actual
  const activeLine = lines.filter((line) => {
    // El join con sm_requests puede devolver un objeto o un array
    const request = Array.isArray(line.request) ? line.request[0] : line.request
    if (!request) return false
    const reqStatus = (request as { id: string; request_id: string; status: string }).status
    if (reqStatus === 'Cancelada' || reqStatus === 'Completada') return false
    if (excludeRequestId && (request as { id: string }).id === excludeRequestId) return false
    return true
  })

  if (activeLine.length === 0) {
    return []
  }

  // Recopilar IDs de ubicaciones unicos para obtener nombres
  const locationIds = new Set<string>()
  for (const line of activeLine) {
    if (line.from_location_id) locationIds.add(line.from_location_id)
    if (line.to_location_id) locationIds.add(line.to_location_id)
  }

  // Obtener nombres de ubicaciones
  const locationMap = new Map<string, string>()
  if (locationIds.size > 0) {
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', Array.from(locationIds))

    if (locations) {
      for (const loc of locations) {
        locationMap.set(loc.id, loc.name)
      }
    }
  }

  // Construir resultados
  const results: DuplicateResult[] = activeLine.map((line) => {
    const request = Array.isArray(line.request) ? line.request[0] : line.request
    const reqData = request as { id: string; request_id: string; status: string }

    const fromName = line.from_location_id
      ? (locationMap.get(line.from_location_id) ?? 'Desconocido')
      : 'Sin origen'
    const toName = line.to_location_id
      ? (locationMap.get(line.to_location_id) ?? 'Desconocido')
      : 'Sin destino'

    return {
      requestId: reqData.request_id ?? 'Sin ID',
      lineNumber: line.line_number,
      description: line.description ?? '',
      status: line.status,
      fromName,
      toName,
    }
  })

  return results
}
