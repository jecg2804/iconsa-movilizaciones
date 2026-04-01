'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { sendNotification, getReceiveAllUsers } from './send'
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
  if (process.env.NODE_ENV !== 'production') console.log(`[Notify] getPeopleByRole("${role}"): ${data?.length ?? 0} found`, data?.map(p => `${p.name} <${p.email}>`))
  else console.log(`[Notify] getPeopleByRole("${role}"): ${data?.length ?? 0} found`)
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
  if (process.env.NODE_ENV !== 'production') console.log(`[Notify] getProjectPMs(${projectId}): ${recipients.length} PMs found`, recipients.map(r => `${r.name} <${r.email}>`))
  else console.log(`[Notify] getProjectPMs(${projectId}): ${recipients.length} PMs found`)
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
    if (process.env.NODE_ENV !== 'production') console.log(`[Notify] Driver ${person.name} has notifications disabled, skipping`)
    else console.log('[Notify] Driver has notifications disabled, skipping')
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
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

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
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

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
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

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
// 4. SOLICITUD COMPLETADA → ALL project PMs
// =============================================================================
export async function notifySolicitudCompletada(requestId: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_completada called', { requestId })
    const req = await getRequestWithProject(requestId)
    if (!req || req.status !== 'Completada') { console.log('[Notify] solicitud_completada: skipped, status =', req?.status); return }

    const pms = await getProjectPMs(req.project_id)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

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
// 5. LÍNEAS PROGRAMADAS → ALL project PMs
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

    const pms = await getProjectPMs(req.project_id)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

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
// 6. VIAJE CANCELADO → ALL PMs of ALL affected projects
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
    const pms = await getTripProjectPMs(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

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
// 7. VIAJE REPROGRAMADO → ALL PMs of ALL affected projects
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
    const pms = await getTripProjectPMs(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

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
// 7b. VIAJE EDITADO → ALL PMs of ALL affected projects
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
    const pms = await getTripProjectPMs(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

    const template = templates.viajeEditado({
      tripId: trip.trip_id ?? '',
      scheduledDate: trip.scheduled_date,
      changes,
      requestIds: requestIds.join(', ') || '—',
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'viaje_editado',
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
// 8. VIAJE ASIGNADO A CONDUCTOR → ONLY conductor
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

    const driver = await getTripDriver(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(driver, receiveAll)

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
export async function notifyEntregaConfirmada(requestLineId: string, receivedByName?: string): Promise<void> {
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
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

    const template = templates.entregaConfirmada({
      requestId: req.request_id ?? '',
      projectName: project?.name ?? '',
      description: line.description,
      qtyDelivered: line.qty_delivered ?? 0,
      qtyTotal: line.quantity,
      receivedByName: receivedByName || '—',
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
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

    const now = new Date()
    const departureTime = now.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Panama' })

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

    const charris = await getPeopleByRole('logistica')
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, receiveAll)

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
    const charris = await getPeopleByRole('logistica')
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, receiveAll)

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

    const admins = await getPeopleByRole('admin')
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(admins, receiveAll)

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

// =============================================================================
// 14. SOLICITUD URGENTE NUEVA → usuarios con solicitud_urgente_nueva
// =============================================================================
export async function notifySolicitudUrgenteNueva(requestId: string): Promise<void> {
  try {
    console.log('[Notify] solicitud_urgente_nueva called', { requestId })
    const supabase = createServiceClient()
    const req = await getRequestWithProject(requestId)
    if (!req) { console.warn('[Notify] solicitud_urgente_nueva: request not found'); return }

    // Calcular urgencia
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(req.date_required + 'T12:00:00')
    target.setHours(0, 0, 0, 0)
    const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (days > 3) {
      console.log(`[Notify] solicitud_urgente_nueva: skipped, ${days} days until due (not urgent)`)
      return
    }

    const { data: lines } = await supabase
      .from('sm_request_lines')
      .select('id')
      .eq('request_id', requestId)

    const requesterName = await getPersonName(req.requester_id)

    // Destinatarios: pre-filtrar por solicitud_urgente_nueva o receive_all
    const { data: urgentRecipients } = await supabase
      .from('people')
      .select('id, email, name, notification_preferences')
      .eq('notifications_enabled', true)
      .eq('status', 'Activo')
      .not('email', 'is', null)

    const allRecipients = (urgentRecipients ?? []).filter(p => {
      const prefs = p.notification_preferences as Record<string, boolean> | null
      if (!prefs || Object.keys(prefs).length === 0) return true
      if (prefs.receive_all === true) return true
      return prefs.solicitud_urgente_nueva === true
    })

    const template = templates.solicitudUrgenteNueva({
      requestId: req.request_id ?? '',
      projectName: req.projectName,
      requesterName,
      dateRequired: req.date_required,
      lineCount: lines?.length ?? 0,
      referenceId: req.id,
    })

    await sendNotification({
      eventType: 'solicitud_urgente_nueva',
      referenceType: 'sm_request',
      referenceId: req.id,
      recipients: allRecipients,
      ...template,
      data: { request_id: req.request_id },
    })
  } catch (err) {
    console.error('[Notify] solicitud_urgente_nueva FAILED:', err)
  }
}

// =============================================================================
// 15. ALERTA DIARIA URGENTES → cron diario 7AM Panamá
// =============================================================================
export async function notifyAlertaDiariaUrgentes(): Promise<void> {
  try {
    // No enviar los domingos (ICONSA no opera)
    const now = new Date()
    if (now.getUTCDay() === 0) {
      console.log('[Notify] alerta_diaria_urgentes skipped: domingo')
      return
    }

    console.log('[Notify] alerta_diaria_urgentes called')
    const supabase = createServiceClient()

    // Calcular fecha límite: hoy + 3 días
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limitDate = new Date(today)
    limitDate.setDate(limitDate.getDate() + 3)
    const limitStr = limitDate.toISOString().split('T')[0]

    // Solicitudes activas con fecha requerida ≤ hoy + 3 días
    const { data: requests, error: rErr } = await supabase
      .from('sm_requests')
      .select('id, request_id, project_id, requester_id, date_required')
      .in('status', ['Enviada', 'En Proceso'])
      .lte('date_required', limitStr)
      .order('date_required')

    if (rErr) console.error('[Notify] alerta_diaria_urgentes requests error:', rErr.message)
    if (!requests?.length) {
      console.log('[Notify] alerta_diaria_urgentes: no urgent requests found')
      return
    }

    // Para cada request: contar líneas pendientes/parciales
    const items: Array<{
      requestId: string
      projectName: string
      requesterName: string
      dateRequired: string
      daysUntil: number
      pendingLines: number
    }> = []

    for (const req of requests) {
      const { count } = await supabase
        .from('sm_request_lines')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', req.id)
        .in('status', ['Pendiente', 'Parcial'])

      if (!count || count === 0) continue

      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', req.project_id)
        .single()

      const requesterName = await getPersonName(req.requester_id)

      const target = new Date(req.date_required + 'T12:00:00')
      target.setHours(0, 0, 0, 0)
      const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      items.push({
        requestId: req.request_id ?? req.id,
        projectName: project?.name ?? '',
        requesterName,
        dateRequired: req.date_required,
        daysUntil: days,
        pendingLines: count,
      })
    }

    if (items.length === 0) {
      console.log('[Notify] alerta_diaria_urgentes: no requests with pending lines')
      return
    }

    console.log(`[Notify] alerta_diaria_urgentes: ${items.length} urgent requests with pending lines`)

    // Destinatarios: pre-filtrar por alerta_diaria_urgentes o receive_all
    const { data: dailyRecipients } = await supabase
      .from('people')
      .select('id, email, name, notification_preferences')
      .eq('notifications_enabled', true)
      .eq('status', 'Activo')
      .not('email', 'is', null)

    const allRecipients = (dailyRecipients ?? []).filter(p => {
      const prefs = p.notification_preferences as Record<string, boolean> | null
      if (!prefs || Object.keys(prefs).length === 0) return true
      if (prefs.receive_all === true) return true
      return prefs.alerta_diaria_urgentes === true
    })

    const template = templates.alertaDiariaUrgentes({ items })

    await sendNotification({
      eventType: 'alerta_diaria_urgentes',
      referenceType: 'sm_request',
      referenceId: 'daily-alert',
      recipients: allRecipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] alerta_diaria_urgentes FAILED:', err)
  }
}

// =============================================================================
// 15. MATERIAL PREPARADO → PMs (pickup ready for collection)
// =============================================================================
export async function notifyMaterialPreparado(tripId: string): Promise<void> {
  try {
    console.log('[Notify] material_preparado called', { tripId })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] material_preparado: trip not found'); return }

    const requestIds = await getTripRequestIds(tripId)
    const pms = await getTripProjectPMs(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(pms, receiveAll)

    if (recipients.length === 0) { console.log('[Notify] material_preparado: no recipients'); return }

    const template = templates.materialPreparado({
      tripId: trip.trip_id ?? '',
      requestIds,
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'material_preparado',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] material_preparado FAILED:', err)
  }
}

// =============================================================================
// 16. REVERSION REGISTRADA → Charris + PMs
// =============================================================================
export async function notifyReversionRegistrada(
  tripId: string,
  reason: string,
  revertedEventType: string,
  revertedByPersonId: string | null,
): Promise<void> {
  try {
    console.log('[Notify] reversion_registrada called', { tripId, reason, revertedEventType })
    const supabase = createServiceClient()
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id')
      .eq('id', tripId)
      .single()

    if (!trip) { console.warn('[Notify] reversion_registrada: trip not found'); return }

    let revertedByName = ''
    if (revertedByPersonId) {
      const { data: revertPerson } = await supabase
        .from('people')
        .select('name')
        .eq('id', revertedByPersonId)
        .single()
      revertedByName = revertPerson?.name ?? ''
    }

    const charris = await getPeopleByRole('logistica')
    const pms = await getTripProjectPMs(tripId)
    const receiveAll = await getReceiveAllUsers()
    const recipients = dedup(charris, pms, receiveAll)

    if (recipients.length === 0) { console.log('[Notify] reversion_registrada: no recipients'); return }

    const template = templates.reversionRegistrada({
      tripId: trip.trip_id ?? '',
      eventType: revertedEventType,
      reason,
      revertedBy: revertedByName,
      referenceId: trip.id,
    })

    await sendNotification({
      eventType: 'reversion_registrada',
      referenceType: 'trip',
      referenceId: trip.id,
      recipients,
      ...template,
    })
  } catch (err) {
    console.error('[Notify] reversion_registrada FAILED:', err)
  }
}
