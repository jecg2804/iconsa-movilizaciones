import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/types/database'

// ─────────────────────────────────────────────────────────────────────
// Setup: cliente Supabase admin con service_role para bypass RLS en seeds.
// Tests assume staging BD limpia post-wipe (generators arrancan en 001).
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// Charris (logistica) seed user — created via /admin/masters in staging
const CHARRIS_ID = process.env.TEST_CHARRIS_ID!
const PROJECT_ID = process.env.TEST_PROJECT_ID!  // 26-604 Inyecciones Metro
const REQUESTER_ID = process.env.TEST_PM_ID!     // PM seed
const RATE_ID = process.env.TEST_RATE_ID!        // Rate seed

// ─────────────────────────────────────────────────────────────────────
// Helpers (AD-5 helpers existentes están rotos, usamos seed manual)
// ─────────────────────────────────────────────────────────────────────

interface SeedLineOpts {
  quantity: number
  description?: string
}

async function seedSolicitudWithLines(opts: SeedLineOpts[]): Promise<{
  requestId: string
  lineIds: string[]
}> {
  const { data: req, error: reqErr } = await admin
    .from('sm_requests')
    .insert({
      project_id: PROJECT_ID,
      requester_id: REQUESTER_ID,
      status: 'Enviada',
      date_required: new Date().toISOString().slice(0, 10),
      cost_code_id: null,
      cost_category_id: null,
    })
    .select('id')
    .single()
  if (reqErr || !req) throw new Error(`seed solicitud failed: ${reqErr?.message}`)

  const lines = opts.map((o, i) => ({
    request_id: req.id,
    line_number: i + 1,
    description: o.description ?? `Test line ${i + 1}`,
    line_type: 'Material' as const,
    quantity: o.quantity,
    unit_text: 'und',
    from_text: 'Origen test',
    to_text: 'Destino test',
    status: 'Pendiente' as const,
    qty_scheduled: 0,
    qty_delivered: 0,
  }))

  const { data: lineRows, error: linesErr } = await admin
    .from('sm_request_lines')
    .insert(lines)
    .select('id')
  if (linesErr || !lineRows) throw new Error(`seed lines failed: ${linesErr?.message}`)

  return { requestId: req.id, lineIds: lineRows.map((l) => l.id) }
}

async function seedTripWithAssignment(
  lineId: string,
  qty: number,
  scheduledDate: string = new Date().toISOString().slice(0, 10),
): Promise<{ tripId: string; assignmentId: string }> {
  const { data: trip, error: tripErr } = await admin
    .from('trips')
    .insert({
      scheduled_date: scheduledDate,
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: RATE_ID,  // tarifa obligatoria post-T1
      cost: 100,
      created_by: CHARRIS_ID,
      status: 'Programado',
    })
    .select('id')
    .single()
  if (tripErr || !trip) throw new Error(`seed trip failed: ${tripErr?.message}`)

  const { data: assign, error: assignErr } = await admin
    .from('trip_line_assignments')
    .insert({
      trip_id: trip.id,
      request_line_id: lineId,
      quantity_assigned: qty,
      qty_dispatched: 0,
      qty_delivered: 0,
    })
    .select('id')
    .single()
  if (assignErr || !assign) throw new Error(`seed assignment failed: ${assignErr?.message}`)

  return { tripId: trip.id, assignmentId: assign.id }
}

async function dispatchTrip(tripId: string, lineId: string, qty: number): Promise<void> {
  await admin.from('trips').update({ status: 'En Ruta', actual_departure: new Date().toISOString() }).eq('id', tripId)
  await admin.from('trip_line_assignments').update({ qty_dispatched: qty }).eq('trip_id', tripId).eq('request_line_id', lineId)
  await admin.from('trip_events').insert({
    trip_id: tripId,
    event_type: 'Salida',
    event_timestamp: new Date().toISOString(),
    registered_by: CHARRIS_ID,
  })
}

async function deliverInTrip(tripId: string, lineId: string, qty: number): Promise<string> {
  const { data: ev } = await admin.from('trip_events').insert({
    trip_id: tripId,
    event_type: 'Entrega',
    event_timestamp: new Date().toISOString(),
    registered_by: CHARRIS_ID,
    received_by_name: 'Test receptor',
  }).select('id').single()
  if (!ev) throw new Error('insert trip_event Entrega failed')

  await admin.from('trip_event_lines').insert({
    trip_event_id: ev.id,
    request_line_id: lineId,
    quantity: qty,
    line_status: 'accepted',
  })
  await admin.from('trip_line_assignments').update({ qty_delivered: qty }).eq('trip_id', tripId).eq('request_line_id', lineId)
  return ev.id
}

async function getLineStatus(lineId: string): Promise<{ status: string; qty_scheduled: number; qty_delivered: number; quantity: number }> {
  const { data, error } = await admin
    .from('sm_request_lines')
    .select('status, qty_scheduled, qty_delivered, quantity')
    .eq('id', lineId)
    .single()
  if (error || !data) throw new Error(`getLineStatus failed: ${error?.message}`)
  return {
    status: data.status,
    qty_scheduled: data.qty_scheduled ?? 0,
    qty_delivered: data.qty_delivered ?? 0,
    quantity: data.quantity,
  }
}

async function cleanup(requestIds: string[], tripIds: string[]) {
  for (const tid of tripIds) {
    const { data: events } = await admin.from('trip_events').select('id').eq('trip_id', tid)
    if (events && events.length > 0) {
      await admin.from('trip_event_lines').delete().in('trip_event_id', events.map(e => e.id))
    }
    await admin.from('trip_events').delete().eq('trip_id', tid)
    await admin.from('trip_line_assignments').delete().eq('trip_id', tid)
    await admin.from('trips').delete().eq('id', tid)
  }
  for (const rid of requestIds) {
    await admin.from('sm_request_lines').delete().eq('request_id', rid)
    await admin.from('sm_requests').delete().eq('id', rid)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Bug #1 — Cancel trip preserva trip_line_assignments
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #1 cancel preservation', () => {
  test('cancel_trip_with_partial_delivery_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel partial preserva qty_delivered',
    }).eq('id', tripId)

    const { data: assign } = await admin
      .from('trip_line_assignments')
      .select('qty_delivered, quantity_assigned')
      .eq('trip_id', tripId)
      .single()
    expect(assign?.qty_delivered).toBe(4)
    expect(assign?.quantity_assigned).toBe(10)

    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Parcial')
    expect(line.qty_delivered).toBe(4)
    expect(line.qty_scheduled).toBe(0)

    await cleanup([requestId], [tripId])
  })

  test('cancel_trip_with_full_delivery_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])
    const { tripId } = await seedTripWithAssignment(lineId, 5)
    await dispatchTrip(tripId, lineId, 5)
    await deliverInTrip(tripId, lineId, 5)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel full preserva qty_delivered=quantity',
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')
    expect(line.qty_delivered).toBe(5)

    await cleanup([requestId], [tripId])
  })

  test('cancel_trip_with_zero_delivery_releases_to_backlog', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 8 }])
    const { tripId } = await seedTripWithAssignment(lineId, 8)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: null,
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Pendiente')
    expect(line.qty_scheduled).toBe(0)
    expect(line.qty_delivered).toBe(0)

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Bug #2 — Trigger no zombie 'En Transito'
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #2 trigger zombie prevention', () => {
  test('trigger_no_zombie_en_transito', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 6 }])
    const { tripId } = await seedTripWithAssignment(lineId, 6)
    await dispatchTrip(tripId, lineId, 6)

    let line = await getLineStatus(lineId)
    expect(line.status).toBe('En Transito')

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: null,
    }).eq('id', tripId)

    line = await getLineStatus(lineId)
    expect(line.status).toBe('Pendiente')
    expect(line.qty_scheduled).toBe(0)

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Bug #4 — Constraint multi-entrega
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #4 multi-entrega blocked', () => {
  test('multi_entrega_blocked_at_db_level', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)

    const { data: ev2 } = await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Entrega',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      received_by_name: 'Receptor 2',
    }).select('id').single()

    const { error } = await admin.from('trip_event_lines').insert({
      trip_event_id: ev2!.id,
      request_line_id: lineId,
      quantity: 6,
      line_status: 'accepted',
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain('ya tiene una Entrega activa')

    await cleanup([requestId], [tripId])
  })

  test('multi_entrega_allowed_after_revert', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    const eventId1 = await deliverInTrip(tripId, lineId, 4)

    await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Reversion',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      reverts_event_id: eventId1,
    })

    const { data: ev2 } = await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Entrega',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      received_by_name: 'Receptor 2',
    }).select('id').single()

    const { error } = await admin.from('trip_event_lines').insert({
      trip_event_id: ev2!.id,
      request_line_id: lineId,
      quantity: 5,
      line_status: 'accepted',
    })
    expect(error).toBeNull()

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Audit pickup_orders/external_orders (regression guard)
// ─────────────────────────────────────────────────────────────────────

test.describe('Audit pickup/external regression guard', () => {
  test('cancel_pickup_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: po } = await admin.from('pickup_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('pickup_order_lines').insert({
      pickup_order_id: po!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 3,
    })

    await admin.from('pickup_orders').update({
      status: 'Cancelado',
      cancellation_reason: 'Test pickup cancel preserva qty_delivered',
    }).eq('id', po!.id)

    const { data: pol } = await admin
      .from('pickup_order_lines')
      .select('qty_delivered')
      .eq('pickup_order_id', po!.id)
      .single()
    expect(pol?.qty_delivered).toBe(3)

    await admin.from('pickup_order_lines').delete().eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').delete().eq('id', po!.id)
    await cleanup([requestId], [])
  })

  test('cancel_external_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: eo } = await admin.from('external_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      provider_name: 'Test Provider',
      invoice_amount: 100,
      invoice_attachments: [{ path: 'test.pdf', name: 'test.pdf', size: 100, type: 'application/pdf' }],
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('external_order_lines').insert({
      external_order_id: eo!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 2,
    })

    await admin.from('external_orders').update({
      status: 'Cancelado',
      cancellation_reason: 'Test external cancel preserva qty_delivered',
    }).eq('id', eo!.id)

    const { data: eol } = await admin
      .from('external_order_lines')
      .select('qty_delivered')
      .eq('external_order_id', eo!.id)
      .single()
    expect(eol?.qty_delivered).toBe(2)

    await admin.from('external_order_lines').delete().eq('external_order_id', eo!.id)
    await admin.from('external_orders').delete().eq('id', eo!.id)
    await cleanup([requestId], [])
  })

  test('complete_pickup_idempotent', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: po } = await admin.from('pickup_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('pickup_order_lines').insert({
      pickup_order_id: po!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 0,
    })

    await admin.from('pickup_order_lines').update({ qty_delivered: 5 }).eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').update({
      status: 'Entregado',
      completed_at: new Date().toISOString(),
      completed_by: CHARRIS_ID,
    }).eq('id', po!.id).eq('status', 'Aprobado')

    const { data: noUpdate } = await admin.from('pickup_orders').update({
      status: 'Entregado',
      completed_at: new Date().toISOString(),
    }).eq('id', po!.id).eq('status', 'Aprobado').select()

    expect(noUpdate).toEqual([])

    const { data: pol } = await admin
      .from('pickup_order_lines')
      .select('qty_delivered')
      .eq('pickup_order_id', po!.id)
      .single()
    expect(pol?.qty_delivered).toBe(5)

    await admin.from('pickup_order_lines').delete().eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').delete().eq('id', po!.id)
    await cleanup([requestId], [])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Invariantes globales
// ─────────────────────────────────────────────────────────────────────

test.describe('Invariantes globales', () => {
  test('backlog_calculation_consistent_after_cancel', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 3)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test invariante backlog',
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    const qtyDisponible = line.quantity - line.qty_scheduled - line.qty_delivered
    expect(qtyDisponible).toBe(7)
    expect(qtyDisponible).toBeGreaterThanOrEqual(0)

    await cleanup([requestId], [tripId])
  })

  test('line_status_consistent_with_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 10)

    let line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel post-entrega total',
    }).eq('id', tripId)

    line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// H1 — Edit quantity con assignments
// ─────────────────────────────────────────────────────────────────────

test.describe('H1 quantity immutable with active assignments', () => {
  test('edit_quantity_blocked_with_active_assignments', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)

    const { error } = await admin
      .from('sm_request_lines')
      .update({ quantity: 15 })
      .eq('id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('No se puede editar la cantidad')

    await cleanup([requestId], [tripId])
  })

  test('edit_quantity_allowed_without_assignments', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])

    const { error } = await admin
      .from('sm_request_lines')
      .update({ quantity: 15 })
      .eq('id', lineId)

    expect(error).toBeNull()

    const line = await getLineStatus(lineId)
    expect(line.quantity).toBe(15)

    await cleanup([requestId], [])
  })
})

// ─────────────────────────────────────────────────────────────────────
// H7 + H8 — CHECK constraints
// ─────────────────────────────────────────────────────────────────────

test.describe('H7 H8 CHECK constraints', () => {
  test('qty_dispatched_cannot_exceed_assigned', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 5)

    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 6 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_dispatched_le_assigned')

    await cleanup([requestId], [tripId])
  })

  test('qty_delivered_cannot_exceed_dispatched', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 5)

    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_delivered: 6 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_delivered_le_dispatched')

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Tarifa obligatoria
// ─────────────────────────────────────────────────────────────────────

test.describe('Tarifa obligatoria rate_id NOT NULL', () => {
  test('create_trip_without_rate_blocked', async () => {
    const { error } = await admin.from('trips').insert({
      scheduled_date: new Date().toISOString().slice(0, 10),
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: null as any,  // NOT NULL violation expected
      cost: null,
      created_by: CHARRIS_ID,
      status: 'Programado',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('null value in column "rate_id"')
  })

  test('edit_trip_remove_rate_blocked', async () => {
    const { data: trip } = await admin.from('trips').insert({
      scheduled_date: new Date().toISOString().slice(0, 10),
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: RATE_ID,
      cost: 100,
      created_by: CHARRIS_ID,
      status: 'Programado',
    }).select('id').single()

    const { error } = await admin
      .from('trips')
      .update({ rate_id: null as any })
      .eq('id', trip!.id)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('null value in column "rate_id"')

    await admin.from('trips').delete().eq('id', trip!.id)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Test #18 — D8 H8 vs revert Salida
// ─────────────────────────────────────────────────────────────────────

test.describe('D8 revert Salida con Entregas', () => {
  test('revert_salida_blocked_when_deliveries_exist', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)

    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 0 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_delivered_le_dispatched')

    // Tras revertir Entrega (qty_delivered=0), revert Salida funciona
    await admin.from('trip_line_assignments').update({ qty_delivered: 0 }).eq('trip_id', tripId).eq('request_line_id', lineId)
    const { error: errAfterRevertDelivery } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 0 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(errAfterRevertDelivery).toBeNull()

    await cleanup([requestId], [tripId])
  })
})
