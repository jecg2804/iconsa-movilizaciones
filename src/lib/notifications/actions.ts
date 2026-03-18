'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { sendNotification } from './send'
import * as templates from './templates'

// =============================================================================
// HELPERS — resolución de destinatarios (usa service client, bypassa RLS)
// =============================================================================

type Recipient = { id: string; email: string | null; name: string }

/** Personas por rol del sistema (logistica, admin, etc.) con notificaciones habilitadas */
async function getPeopleByRole(role: string): Promise<Recipient[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, email, name')
    .eq('app_role', role)
    .eq('status', 'Activo')
    .eq('notifications_enabled', true)
  if (error) console.error('[Notify] getPeopleByRole error:', error.message)
  console.log(`[Notify] getPeopleByRole("${role}"): ${data?.length ?? 0} found`, data?.map(p => `${p.name} <${p.email}>`))
  return data ?? []
}

/** Todos los PMs asignados a un proyecto con notificaciones habilitadas */
async function getProjectPMs(projectId: string, excludePersonId?: string): Promise<Recipient[]> {
  const supabase = createServiceClient()
  const { data: assignments, error: aErr } = await supabase
    .from('person_projects')
    .select('person_id')
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (aErr) console.error('[Notify] getProjectPMs assignments error:', aErr.message)
  if (!assignments?.length) { console.log(`[Notify] getProjectPMs: no assignments for project ${projectId}`); return [] }

  const personIds = assignments.map(a => a.person_id)
  const { data: people, error: pErr } = await supabase
    .from('people')
    .select('id, email, name')
    .in('id', personIds)
    .eq('app_role', 'pm')
    .eq('notifications_enabled', true)
    .eq('status', 'Activo')
    .not('email', 'is', null)

  if (pErr) console.error('[Notify] getProjectPMs people error:', pErr.message)

  const recipients = (people ?? []).filter(p => !excludePersonId || p.id !== excludePersonId)
  console.log(`[Notify] getProjectPMs(${projectId}): ${recipients.length} PMs found`, recipients.map(r => `${r.name} <${r.email}>`))
  return recipients
}

/** Todos los PMs de TODOS los proyectos afectados por un viaje (deduped) */
async function getTripProjectPMs(tripId: string): Promise<Recipient[]> {
  const supabase = createServiceClient()

  // Trip → assignments → lines → requests → project_ids
  const { data: assignments, error: aErr } = await supabase
    .from('trip_line_assignments')
    .select('request_line_id')
    .eq('trip_id', tripId)

  if (aErr) console.error('[Notify] getTripProjectPMs assignments error:', aErr.message)
  if (!assignments?.length) return []

  const lineIds = assignments.map(a => a.request_line_id)
  const { data: lines, error: lErr } = await supabase
    .from('sm_request_lines')
    .select('request_id')
    .in('id', lineIds)

  if (lErr) console.error('[Notify] getTripProjectPMs lines error:', lErr.message)
  if (!lines?.length) return []

  const uniqueRequestIds = [...new Set(lines.map(l => l.request_id))]
  const { data: requests, error: rErr } = await supabase
    .from('sm_requests')
    .select('project_id')
    .in('id', uniqueRequestIds)

  if (rErr) console.error('[Notify] getTripProjectPMs requests error:', rErr.message)
  if (!requests?.length) return []

  const projectIds = [...new Set(requests.map(r => r.project_id))]
  console.log(`[Notify] getTripProjectPMs: trip affects ${projectIds.length} project(s)`)

  // Obtener PMs de todos los proyectos, deduped
  const allRecipients: Recipient[] = []
  const seen = new Set<string>()
  for (const projId of projectIds) {
    const pms = await getProjectPMs(projId)
    for (const pm of pms) {
      if (!seen.has(pm.id)) {
        seen.add(pm.id)
        allRecipients.push(pm)
      }
    }
  }

  console.log(`[Notify] getTripProjectPMs: ${allRecipients.length} unique PMs total`)
  return allRecipients
}

/** Conductor del viaje con notificaciones habilitadas */
async function getTripDriver(tripId: string): Promise<Recipient[]> {
  const supabase = createServiceClient()
  const { data: trip, error: tErr } = await supabase
    .from('trips')
    .select('driver_id')
    .eq('id', tripId)
    .single()

  if (tErr) console.error('[Notify] getTripDriver trip error:', tErr.message)
  if (!trip?.driver_id) return []

  const { data: person, error: pErr } = await supabase
    .from('people')
    .select('id, email, name, notifications_enabled')
    .eq('id', trip.driver_id)
    .single()

  if (pErr) console.error('[Notify] getTripDriver people error:', pErr.message)
  if (!person) return []
  if (!person.notifications_enabled) {
    console.log(`[Notify] Driver ${person.name} has notifications disabled, skipping`)
    return []
  }
  return [{ id: person.id, email: person.email, name: person.name }]
}

/** Nombre de una persona por ID */
async function getPersonName(personId: string): Promise<string> {
  if (!personId) return 'Sistema'
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('people')
    .select('name')
    .eq('id', personId)
    .single()
  if (error) console.error('[Notify] getPersonName error:', error.message)
  return data?.name ?? 'Sistema'
}

/** IDs de solicitud (request_id texto, ej: 25-506-SM-001) afectados por un viaje */
async function getTripRequestIds(tripId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data: assignments, error: aErr } = await supabase
    .from('trip_line_assignments')
    .select('request_line_id')
    .eq('trip_id', tripId)

  if (aErr) console.error('[Notify] getTripRequestIds assignments error:', aErr.message)
  if (!assignments?.length) return []

  const lineIds = assignments.map(a => a.request_line_id)
  const { data: lines, error: lErr } = await supabase
    .from('sm_request_lines')
    .select('request_id')
    .in('id', lineIds)

  if (lErr) console.error('[Notify] getTripRequestIds lines error:', lErr.message)
  if (!lines?.length) return []

  const uniqueRequestIds = [...new Set(lines.map(l => l.request_id))]
  const { data: requests, error: rErr } = await supabase
    .from('sm_requests')
    .select('request_id')
    .in('id', uniqueRequestIds)

  if (rErr) console.error('[Notify] getTripRequestIds requests error:', rErr.message)
  return (requests ?? []).map(r => r.request_id).filter(Boolean) as string[]
}

/** Solicitud + nombre de proyecto */
async function getRequestWithProject(requestId: string) {
  const supabase = createServiceClient()
  const { data: req, error: reqErr } = await supabase
    .from('sm_requests')
    .select('id, request_id, date_required, status, project_id, requester_id')
    .eq('id', requestId)
    .single()

  if (reqErr) console.error('[Notify] getRequestWithProject sm_requests error:', reqErr.message)
  if (!req) return null

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('name')
    .eq('id', req.project_id)
    .single()

  if (pErr) console.error('[Notify] getRequestWithProject projects error:', pErr.message)
  return { ...req, projectName: project?.name ?? '' }
}

/** Combina dos listas de recipients sin duplicados */
function dedup(...lists: Recipient[][]): Recipient[] {
  const seen = new Set<string>()
  const result: Recipient[] = []
  for (const list of lists) {
    for (const r of list) {
      if (!seen.has(r.id)) {
        seen.add(r.id)
        result.push(r)
      }
    }
  }
  return result
}

// =============================================================================
// 1. SOLICITUD ENVIADA → Charris + ALL project PMs
// =============================================================================
export async function notifySolicitudEnviada(requestId: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_enviada called', { requestId })
    const supabase = createServiceClient()
    const req = await getRequestWithProject(requestId)
    if (!req) { console.warn('[Notify] solicitud_enviada: request not found'); return }

    const { data: lines } = await supabase
      .from('sm_request_lines')
      .select('id')
      .eq('request_id', requestId)

    const requesterName = await getPersonName(req.requester_id)
    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id)
    const recipients = dedup(charris, pms)

    const template = templates.solicitudEnviada({
      requestId: req.request_id ?? '',
      projectName: req.projectName,
      requesterName,
      dateRequired: req.date_required,
      lineCount: lines?.length ?? 0,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'solicitud_enviada',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients,
      ...template,
      data: { request_id: req.request_id },
    })
  } catch (err) {
    console.error('[Notify] solicitud_enviada FAILED:', err)
  }
}

// =============================================================================
// 2. SOLICITUD EDITADA → Charris + ALL project PMs
// =============================================================================
export async function notifySolicitudEditada(requestId: string, personId: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_editada called', { requestId, personId })
    const req = await getRequestWithProject(requestId)
    if (!req) { console.warn('[Notify] solicitud_editada: request not found'); return }
    if (!['Enviada', 'En Proceso'].includes(req.status)) { console.log('[Notify] solicitud_editada: skipped, status =', req.status); return }

    const editorName = await getPersonName(personId)
    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id)
    const recipients = dedup(charris, pms)

    const template = templates.solicitudEditada({
      requestId: req.request_id ?? '',
      projectName: req.projectName,
      editedBy: editorName,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'solicitud_editada',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] solicitud_editada FAILED:', err)
  }
}

// =============================================================================
// 3. SOLICITUD CANCELADA → Charris + ALL project PMs EXCEPT canceller
// =============================================================================
export async function notifySolicitudCancelada(requestId: string, personId?: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_cancelada called', { requestId, personId })
    const req = await getRequestWithProject(requestId)
    if (!req) { console.warn('[Notify] solicitud_cancelada: request not found'); return }

    const cancellerName = personId ? await getPersonName(personId) : 'Sistema'
    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id, personId)
    const recipients = dedup(charris, pms)

    const template = templates.solicitudCancelada({
      requestId: req.request_id ?? '',
      projectName: req.projectName,
      cancelledBy: cancellerName,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'solicitud_cancelada',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] solicitud_cancelada FAILED:', err)
  }
}

// =============================================================================
// 4. SOLICITUD COMPLETADA → Charris + ALL project PMs
// =============================================================================
export async function notifySolicitudCompletada(requestId: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_completada called', { requestId })
    const req = await getRequestWithProject(requestId)
    if (!req || req.status !== 'Completada') { console.log('[Notify] solicitud_completada: skipped, status =', req?.status); return }

    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id)
    const recipients = dedup(charris, pms)

    const template = templates.solicitudCompletada({
      requestId: req.request_id ?? '',
      projectName: req.projectName,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'solicitud_completada',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] solicitud_completada FAILED:', err)
  }
}

// =============================================================================
// 5. LÍNEAS PROGRAMADAS → Charris + ALL project PMs
// =============================================================================
export async function notifyLineasProgramadas(tripId: string, requestId: string): Promise<void> {
  try {
    console.log('[Notify] lineas_programadas called', { tripId, requestId })
    const supabase = createServiceClient()

    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id, scheduled_date, confirmation_code, vehicle_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] lineas_programadas: trip not found'); return }

    let vehicleDesc = 'No asignado'
    if (trip.vehicle_id) {
      const { data: vehicle } = await supabase
        .from('equipment')
        .select('description')
        .eq('id', trip.vehicle_id)
        .single()
      vehicleDesc = vehicle?.description ?? 'No asignado'
    }

    const { data: req } = await supabase
      .from('sm_requests')
      .select('id, request_id, project_id')
      .eq('id', requestId)
      .single()

    if (!req) { console.warn('[Notify] lineas_programadas: request not found'); return }

    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id)
    const recipients = dedup(charris, pms)

    const template = templates.lineasProgramadas({
      requestId: req.request_id ?? '',
      tripId: trip.trip_id ?? '',
      scheduledDate: trip.scheduled_date,
      vehicleDescription: vehicleDesc,
      confirmationCode: trip.confirmation_code ?? '----',
      referenceId: req.id,
      tripReferenceId: trip.id,
    })

    await sendNotification({
      eventType: 'lineas_programadas',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
      data: { request_id: req.request_id, trip_id: trip.trip_id },
    })
  } catch (err) {
    console.error('[Notify] lineas_programadas FAILED:', err)
  }
}

// =============================================================================
// 6. VIAJE CANCELADO → Charris + ALL PMs of ALL affected projects
// =============================================================================
export async function notifyViajeCancelado(tripId: string): Promise<void> {
  try {
    console.log('[Notify] viaje_cancelado called', { tripId })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] viaje_cancelado: trip not found'); return }

    const requestIds = await getTripRequestIds(tripId)
    const charris = await getPeopleByRole('logistica')
    const pms = await getTripProjectPMs(tripId)
    const recipients = dedup(charris, pms)

    const template = templates.viajeCancelado({
      tripId: trip.trip_id ?? '',
      requestIds: requestIds.join(', ') || '—',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'viaje_cancelado',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] viaje_cancelado FAILED:', err)
  }
}

// =============================================================================
// 7. VIAJE REPROGRAMADO → Charris + ALL PMs of ALL affected projects
// =============================================================================
export async function notifyViajeReprogramado(
  tripId: string,
  previousDate: string,
  newDate: string,
): Promise<void> {
  try {
    console.log('[Notify] viaje_reprogramado called', { tripId, previousDate, newDate })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] viaje_reprogramado: trip not found'); return }

    const requestIds = await getTripRequestIds(tripId)
    const charris = await getPeopleByRole('logistica')
    const pms = await getTripProjectPMs(tripId)
    const recipients = dedup(charris, pms)

    const template = templates.viajeReprogramado({
      tripId: trip.trip_id ?? '',
      previousDate,
      newDate,
      requestIds: requestIds.join(', ') || '—',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'viaje_reprogramado',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] viaje_reprogramado FAILED:', err)
  }
}

// =============================================================================
// 7b. VIAJE EDITADO → Charris + ALL PMs of ALL affected projects
// =============================================================================
export async function notifyViajeEditado(
  tripId: string,
  changes: string[],
): Promise<void> {
  try {
    console.log('[Notify] viaje_editado called', { tripId, changes })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id, scheduled_date')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] viaje_editado: trip not found'); return }

    const requestIds = await getTripRequestIds(tripId)
    const charris = await getPeopleByRole('logistica')
    const pms = await getTripProjectPMs(tripId)
    const recipients = dedup(charris, pms)

    const template = templates.viajeEditado({
      tripId: trip.trip_id ?? '',
      scheduledDate: trip.scheduled_date,
      changes,
      requestIds: requestIds.join(', ') || '—',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'viaje_reprogramado',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] viaje_editado FAILED:', err)
  }
}

// =============================================================================
// 8. VIAJE ASIGNADO A CONDUCTOR → Charris + conductor
// =============================================================================
export async function notifyViajeAsignadoConductor(tripId: string): Promise<void> {
  try {
    console.log('[Notify] viaje_asignado_conductor called', { tripId })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id, scheduled_date, vehicle_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] viaje_asignado_conductor: trip not found'); return }

    let vehicleDesc = 'No asignado'
    if (trip.vehicle_id) {
      const { data: vehicle } = await supabase
        .from('equipment')
        .select('description')
        .eq('id', trip.vehicle_id)
        .single()
      vehicleDesc = vehicle?.description ?? 'No asignado'
    }

    const { data: assignments } = await supabase
      .from('trip_line_assignments')
      .select('id')
      .eq('trip_id', tripId)

    const charris = await getPeopleByRole('logistica')
    const driver = await getTripDriver(tripId)
    const recipients = dedup(charris, driver)

    const template = templates.viajeAsignadoConductor({
      tripId: trip.trip_id ?? '',
      scheduledDate: trip.scheduled_date,
      vehicleDescription: vehicleDesc,
      stopCount: assignments?.length ?? 0,
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'viaje_asignado_conductor',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] viaje_asignado_conductor FAILED:', err)
  }
}

// =============================================================================
// 9. ENTREGA CONFIRMADA → Charris + ALL PMs of the request's project
// =============================================================================
export async function notifyEntregaConfirmada(requestLineId: string): Promise<void> {
  try {
    console.log('[Notify] entrega_confirmada called', { requestLineId })
    const supabase = createServiceClient()
    const { data: line } = await supabase
      .from('sm_request_lines')
      .select('id, description, quantity, qty_delivered, request_id')
      .eq('id', requestLineId)
      .single()

    if (!line) { console.warn('[Notify] entrega_confirmada: line not found'); return }

    const { data: req } = await supabase
      .from('sm_requests')
      .select('id, request_id, project_id')
      .eq('id', line.request_id)
      .single()

    if (!req) { console.warn('[Notify] entrega_confirmada: request not found'); return }

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', req.project_id)
      .single()

    const isPartial = (line.qty_delivered ?? 0) < line.quantity
    const charris = await getPeopleByRole('logistica')
    const pms = await getProjectPMs(req.project_id)
    const recipients = dedup(charris, pms)

    const template = templates.entregaConfirmada({
      requestId: req.request_id ?? '',
      projectName: project?.name ?? '',
      description: line.description,
      qtyDelivered: line.qty_delivered ?? 0,
      qtyTotal: line.quantity,
      receivedByName: '—',
      isPartial,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'entrega_confirmada',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] entrega_confirmada FAILED:', err)
  }
}

// =============================================================================
// 10. SALIDA REGISTRADA → Charris + ALL PMs of ALL affected projects
// =============================================================================
export async function notifySalidaRegistrada(tripId: string): Promise<void> {
  try {
    console.log('[Notify] salida_registrada called', { tripId })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] salida_registrada: trip not found'); return }

    const { data: assignments } = await supabase
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripId)

    const destinations = new Set<string>()
    if (assignments?.length) {
      const lineIds = assignments.map(a => a.request_line_id)
      const { data: lines } = await supabase
        .from('sm_request_lines')
        .select('to_location_id, to_text')
        .in('id', lineIds)

      for (const l of lines ?? []) {
        if (l.to_text) {
          destinations.add(l.to_text)
        } else if (l.to_location_id) {
          const { data: loc } = await supabase
            .from('locations')
            .select('name')
            .eq('id', l.to_location_id)
            .single()
          if (loc?.name) destinations.add(loc.name)
        }
      }
    }

    const requestIds = await getTripRequestIds(tripId)
    const charris = await getPeopleByRole('logistica')
    const pms = await getTripProjectPMs(tripId)
    const recipients = dedup(charris, pms)

    const now = new Date()
    const departureTime = now.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })

    const template = templates.salidaRegistrada({
      tripId: trip.trip_id ?? '',
      departureTime,
      destination: [...destinations].join(', ') || '—',
      requestIds: requestIds.join(', ') || '—',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'salida_registrada',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] salida_registrada FAILED:', err)
  }
}

// =============================================================================
// 11. INCIDENCIA EN RUTA → ONLY Charris
// =============================================================================
export async function notifyIncidenciaRuta(tripId: string, notes: string): Promise<void> {
  try {
    console.log('[Notify] incidencia_ruta called', { tripId, notes })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] incidencia_ruta: trip not found'); return }

    const recipients = await getPeopleByRole('logistica')

    const template = templates.incidenciaRuta({
      tripId: trip.trip_id ?? '',
      incidentNotes: notes || 'Sin detalles',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'incidencia_ruta',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] incidencia_ruta FAILED:', err)
  }
}

// =============================================================================
// 12. RETORNO REGISTRADO → ONLY Charris
// =============================================================================
export async function notifyRetornoRegistrado(tripId: string): Promise<void> {
  try {
    console.log('[Notify] retorno_registrado called', { tripId })
    const supabase = createServiceClient()

    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id, actual_arrival')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] retorno_registrado: trip not found'); return }

    const requestIds = await getTripRequestIds(tripId)
    const recipients = await getPeopleByRole('logistica')

    const arrivalTime = trip.actual_arrival ?? new Date().toISOString()

    const template = templates.retornoRegistrado({
      tripId: trip.trip_id ?? '',
      arrivalTime,
      requestIds,
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'retorno_registrado',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] retorno_registrado FAILED:', err)
  }
}

// =============================================================================
// 13. SUGERENCIA FALLBACK → Admin (NO conectado en MVP — template listo)
// =============================================================================
export async function notifySugerenciaFallback(suggestionId: string): Promise<void> {
  try {
    console.log('[Notify] sugerencia_fallback called', { suggestionId })
    const supabase = createServiceClient()
    const { data: sug } = await supabase
      .from('suggestions')
      .select('id, table_name, suggested_value, suggested_by')
      .eq('id', suggestionId)
      .single()

    if (!sug) { console.warn('[Notify] sugerencia_fallback: suggestion not found'); return }

    const suggestedByName = sug.suggested_by
      ? await getPersonName(sug.suggested_by)
      : 'Desconocido'

    const recipients = await getPeopleByRole('admin')

    const template = templates.sugerenciaFallback({
      tableName: sug.table_name,
      suggestedValue: sug.suggested_value,
      suggestedByName,
      referenceId: sug.id,
    })

    await sendNotification({
      eventType: 'sugerencia_fallback',
      referenceType: 'suggestion',
      referenceId: sug.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] sugerencia_fallback FAILED:', err)
  }
}
