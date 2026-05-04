/**
 * Helpers compartidos para los scripts de Phase 2 del audit-A.
 * Crea un cliente service-role contra staging y provee setup/teardown
 * de escenarios sintéticos.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function getOneProject(): Promise<string> {
  const { data } = await db
    .from('projects')
    .select('id, code')
    .eq('status', 'Activo')
    .limit(1)
    .single()
  if (!data) throw new Error('No active project found')
  return data.id
}

export async function getOnePerson(role?: string): Promise<{ id: string; name: string }> {
  const q = db.from('people').select('id, name').limit(1)
  if (role) q.eq('app_role', role)
  const { data } = await q.single()
  if (!data) throw new Error(`No person found${role ? ` with role ${role}` : ''}`)
  return { id: data.id, name: data.name }
}

export async function getOneRate(): Promise<string> {
  const { data } = await db.from('mobilization_rates').select('id').limit(1).single()
  if (!data) throw new Error('No mobilization rate found')
  return data.id
}

export async function getOneCostCode(projectId: string): Promise<{ costCodeId: string; categoryId: string }> {
  const { data: cc } = await db
    .from('cost_codes')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .single()
  if (!cc) throw new Error(`No cost code for project ${projectId}`)
  const { data: cat } = await db
    .from('cost_code_categories')
    .select('cost_category_id')
    .eq('cost_code_id', cc.id)
    .limit(1)
    .single()
  if (!cat) throw new Error(`No category for cost code ${cc.id}`)
  return { costCodeId: cc.id, categoryId: cat.cost_category_id }
}

export async function createSolicitud(opts: {
  projectId: string
  requesterId: string
  costCodeId: string
  categoryId: string
  status?: string
}): Promise<string> {
  const { data, error } = await db
    .from('sm_requests')
    .insert({
      project_id: opts.projectId,
      requester_id: opts.requesterId,
      approved_by: opts.requesterId,
      date_required: new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10),
      status: opts.status ?? 'Borrador',
      cost_code_id: opts.costCodeId,
      cost_category_id: opts.categoryId,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createSolicitud failed: ${error?.message}`)
  return data.id
}

export async function addLine(opts: {
  requestId: string
  qty: number
  description: string
  lineNumber?: number
}): Promise<string> {
  // Necesitamos un location y un unit
  const { data: loc } = await db.from('locations').select('id').limit(1).single()
  const { data: unit } = await db.from('units').select('id').limit(1).single()
  const { data, error } = await db
    .from('sm_request_lines')
    .insert({
      request_id: opts.requestId,
      line_number: opts.lineNumber ?? 1,
      line_type: 'Material',
      description: opts.description,
      from_location_id: loc?.id ?? null,
      to_location_id: loc?.id ?? null,
      quantity: opts.qty,
      unit_id: unit?.id ?? null,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`addLine failed: ${error?.message}`)
  return data.id
}

export async function advanceSolicitud(requestId: string, status: string): Promise<void> {
  const { error } = await db
    .from('sm_requests')
    .update({ status })
    .eq('id', requestId)
  if (error) throw new Error(`advanceSolicitud failed: ${error.message}`)
}

export async function createTrip(opts: {
  rateId: string
  status?: string
}): Promise<{ id: string; confirmation_code: string | null }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('trips')
    .insert({
      rate_id: opts.rateId,
      scheduled_date: today,
      cost: 100,
      status: opts.status ?? 'Programado',
    })
    .select('id, confirmation_code')
    .single()
  if (error || !data) throw new Error(`createTrip failed: ${error?.message}`)
  return data
}

export async function addAssignment(opts: {
  tripId: string
  requestLineId: string
  qty: number
}): Promise<string> {
  const { data, error } = await db
    .from('trip_line_assignments')
    .insert({
      trip_id: opts.tripId,
      request_line_id: opts.requestLineId,
      quantity_assigned: opts.qty,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`addAssignment failed: ${error?.message}`)
  return data.id
}

export async function dispatch(opts: {
  tripId: string
  lines: Array<{ requestLineId: string; qtyDispatched: number }>
}): Promise<void> {
  // Marcar trip En Ruta
  await db.from('trips').update({
    status: 'En Ruta',
    actual_departure: new Date().toISOString(),
  }).eq('id', opts.tripId)

  // Marcar líneas En Transito
  await db.from('sm_request_lines').update({ status: 'En Transito' })
    .in('id', opts.lines.map(l => l.requestLineId))

  // Update qty_dispatched per assignment
  for (const l of opts.lines) {
    await db.from('trip_line_assignments').update({ qty_dispatched: l.qtyDispatched })
      .eq('trip_id', opts.tripId)
      .eq('request_line_id', l.requestLineId)
  }
}

export async function snapshot(label: string, opts: {
  requestId: string
  tripId?: string
  pickupOrderId?: string
  externalOrderId?: string
}): Promise<void> {
  console.log(`\n=== SNAPSHOT: ${label} ===`)

  const { data: req } = await db.from('sm_requests')
    .select('status').eq('id', opts.requestId).single()
  console.log(`  sm_requests.status = ${req?.status}`)

  const { data: lines } = await db.from('sm_request_lines')
    .select('id, line_number, status, quantity, qty_scheduled, qty_delivered')
    .eq('request_id', opts.requestId)
    .order('line_number')
  for (const l of lines ?? []) {
    console.log(`    line[${l.line_number}] status=${l.status} qty=${l.quantity} sched=${l.qty_scheduled} deliv=${l.qty_delivered}`)
  }

  if (opts.tripId) {
    const { data: trip } = await db.from('trips')
      .select('status, cancellation_reason').eq('id', opts.tripId).single()
    console.log(`  trips.status = ${trip?.status} reason="${trip?.cancellation_reason ?? ''}"`)
    const { data: tlas } = await db.from('trip_line_assignments')
      .select('id, request_line_id, quantity_assigned, qty_dispatched, qty_delivered, qty_rejected')
      .eq('trip_id', opts.tripId)
    for (const t of tlas ?? []) {
      console.log(`    TLA req_line=${t.request_line_id.slice(0,8)} assigned=${t.quantity_assigned} disp=${t.qty_dispatched} deliv=${t.qty_delivered} rej=${t.qty_rejected}`)
    }
  }

  if (opts.pickupOrderId) {
    const { data: po } = await db.from('pickup_orders')
      .select('status, pickup_id, cancellation_reason').eq('id', opts.pickupOrderId).single()
    console.log(`  pickup_orders.status = ${po?.status} ${po?.pickup_id} reason="${po?.cancellation_reason ?? ''}"`)
    const { data: pol } = await db.from('pickup_order_lines')
      .select('request_line_id, quantity_assigned, qty_delivered')
      .eq('pickup_order_id', opts.pickupOrderId)
    for (const p of pol ?? []) {
      console.log(`    POL req_line=${p.request_line_id.slice(0,8)} assigned=${p.quantity_assigned} deliv=${p.qty_delivered}`)
    }
  }

  if (opts.externalOrderId) {
    const { data: eo } = await db.from('external_orders')
      .select('status, external_id, cancellation_reason').eq('id', opts.externalOrderId).single()
    console.log(`  external_orders.status = ${eo?.status} ${eo?.external_id} reason="${eo?.cancellation_reason ?? ''}"`)
    const { data: eol } = await db.from('external_order_lines')
      .select('request_line_id, quantity_assigned, qty_delivered')
      .eq('external_order_id', opts.externalOrderId)
    for (const e of eol ?? []) {
      console.log(`    EOL req_line=${e.request_line_id.slice(0,8)} assigned=${e.quantity_assigned} deliv=${e.qty_delivered}`)
    }
  }
}

export async function cleanup(opts: {
  requestId?: string
  tripIds?: string[]
  pickupOrderIds?: string[]
  externalOrderIds?: string[]
}): Promise<void> {
  console.log('\n--- CLEANUP ---')
  // Orden importa: hijos antes que padres
  if (opts.pickupOrderIds?.length) {
    for (const id of opts.pickupOrderIds) {
      await db.from('pickup_order_lines').delete().eq('pickup_order_id', id)
      await db.from('pickup_orders').delete().eq('id', id)
    }
  }
  if (opts.externalOrderIds?.length) {
    for (const id of opts.externalOrderIds) {
      await db.from('external_order_lines').delete().eq('external_order_id', id)
      await db.from('external_orders').delete().eq('id', id)
    }
  }
  if (opts.tripIds?.length) {
    for (const id of opts.tripIds) {
      await db.from('trip_event_lines').delete().eq('trip_event_id', id) // safety, may be empty
      // Get events to clean their lines first
      const { data: events } = await db.from('trip_events').select('id').eq('trip_id', id)
      for (const e of events ?? []) {
        await db.from('trip_event_lines').delete().eq('trip_event_id', e.id)
        await db.from('delivery_observations').delete().eq('trip_event_id', e.id)
      }
      await db.from('trip_events').delete().eq('trip_id', id)
      await db.from('trip_line_assignments').delete().eq('trip_id', id)
      await db.from('trips').delete().eq('id', id)
    }
  }
  if (opts.requestId) {
    await db.from('sm_request_lines').delete().eq('request_id', opts.requestId)
    await db.from('sm_requests').delete().eq('id', opts.requestId)
  }
  console.log('  cleaned')
}
