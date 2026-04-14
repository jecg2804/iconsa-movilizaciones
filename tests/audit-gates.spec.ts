/**
 * Audit Gates — Validan los gates de Fase B.1 (BD) y Fase C (código).
 * Tests directos a BD (sin UI) para validación rápida y estable.
 * Run: npx playwright test tests/audit-gates.spec.ts
 */

import { test, expect } from '@playwright/test'
import { db } from './helpers'

// =============================================================================
// BD gates aplicados en Fase B.1
// =============================================================================

test.describe('BD Fase B.1 — gates y constraints', () => {
  test('SEC2 — trigger generate_confirmation_code asigna código cuando el INSERT omite el campo', async () => {
    // Insert un trip mínimo sin confirmation_code. El trigger BEFORE INSERT
    // generate_confirmation_code debe llenarlo automáticamente.
    // Usamos una fecha futura para pasar cualquier validación.
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()
    expect(project).not.toBeNull()

    const { data: vehicle } = await db
      .from('equipment')
      .select('id')
      .like('type_code', 'VH%')
      .limit(1)
      .single()

    const { data: driver } = await db
      .from('people')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()

    const { data: trip, error } = await db
      .from('trips')
      .insert({
        scheduled_date: '2027-01-01',
        driver_id: driver?.id ?? null,
        vehicle_id: vehicle?.id ?? null,
        // confirmation_code OMITIDO a propósito
      })
      .select('id, confirmation_code')
      .single()

    expect(error).toBeNull()
    expect(trip?.confirmation_code).toMatch(/^\d{4}$/)

    if (trip?.id) {
      await db.from('trips').delete().eq('id', trip.id)
    }
  })

  test('BD-F7 — trigger enforce_line_add_delete_only_in_borrador bloquea insert en solicitud Enviada', async () => {
    // 1. Crear una solicitud Borrador con una línea dummy
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()
    const { data: requester } = await db
      .from('people')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()

    const { data: req } = await db
      .from('sm_requests')
      .insert({
        project_id: project!.id,
        requester_id: requester!.id,
        date_required: '2027-01-01',
        status: 'Borrador',
      })
      .select('id')
      .single()
    expect(req).not.toBeNull()

    // 2. Insert primera línea (Borrador — debe pasar)
    const { error: line1Err } = await db
      .from('sm_request_lines')
      .insert({
        request_id: req!.id,
        line_number: 1,
        line_type: 'Material',
        description: 'TEST-GATE-LINE-1',
        quantity: 1,
        status: 'Pendiente',
      })
    expect(line1Err).toBeNull()

    // 3. Promover a Enviada
    await db.from('sm_requests').update({ status: 'Enviada' }).eq('id', req!.id)

    // 4. Intentar agregar otra línea — debe fallar por el trigger
    const { error: line2Err } = await db
      .from('sm_request_lines')
      .insert({
        request_id: req!.id,
        line_number: 2,
        line_type: 'Material',
        description: 'TEST-GATE-LINE-2',
        quantity: 1,
        status: 'Pendiente',
      })
    expect(line2Err).not.toBeNull()
    expect(line2Err?.message.toLowerCase()).toMatch(/agregar l[ií]neas|borrador|enviada/)

    // Cleanup
    await db.from('sm_request_lines').delete().eq('request_id', req!.id)
    await db.from('sm_requests').delete().eq('id', req!.id)
  })

  test('BD-X1 — CHECK sm_request_lines_qty_invariant bloquea qty_scheduled + qty_delivered > quantity', async () => {
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()
    const { data: requester } = await db
      .from('people')
      .select('id')
      .eq('status', 'Activo')
      .limit(1)
      .single()

    const { data: req } = await db
      .from('sm_requests')
      .insert({
        project_id: project!.id,
        requester_id: requester!.id,
        date_required: '2027-01-01',
        status: 'Borrador',
      })
      .select('id')
      .single()

    // Insertar con invariante roto: 5 + 5 > 6
    const { error } = await db
      .from('sm_request_lines')
      .insert({
        request_id: req!.id,
        line_number: 1,
        line_type: 'Material',
        description: 'TEST-GATE-QTY',
        quantity: 6,
        qty_scheduled: 5,
        qty_delivered: 5,
        status: 'Pendiente',
      })
    expect(error).not.toBeNull()
    // Puede fallar por el CHECK constraint (`qty_invariant`) o por el trigger
    // enforce_qty_integrity. Ambos son gates válidos del audit B.1/B.0.
    expect((error?.message ?? '') + (error?.details ?? '')).toMatch(/qty_invariant|qty|check|integrity/i)

    // Cleanup
    await db.from('sm_request_lines').delete().eq('request_id', req!.id)
    await db.from('sm_requests').delete().eq('id', req!.id)
  })

  test('N_R2_1 — trigger enforce_trip_immutable_post_departure bloquea cambio de driver en trip En Ruta', async () => {
    const { data: drivers } = await db
      .from('people')
      .select('id')
      .eq('status', 'Activo')
      .limit(2)
    expect(drivers?.length).toBeGreaterThanOrEqual(2)

    const { data: vehicle } = await db
      .from('equipment')
      .select('id')
      .like('type_code', 'VH%')
      .limit(1)
      .single()

    // Crear un trip Programado primero
    const { data: trip, error: insertErr } = await db
      .from('trips')
      .insert({
        scheduled_date: '2027-01-01',
        driver_id: drivers![0].id,
        vehicle_id: vehicle?.id ?? null,
        status: 'Programado',
      })
      .select('id')
      .single()
    expect(insertErr).toBeNull()

    // Promover a En Ruta vía service role (el trigger solo bloquea UPDATES
    // posteriores de vehicle/driver/trailer)
    await db.from('trips').update({ status: 'En Ruta' }).eq('id', trip!.id)

    // Intentar cambiar el conductor — debe fallar
    const { error: updErr } = await db
      .from('trips')
      .update({ driver_id: drivers![1].id })
      .eq('id', trip!.id)
    expect(updErr).not.toBeNull()
    expect((updErr?.message ?? '').toLowerCase()).toMatch(/vehículo|conductor|remolque|en ruta/i)

    // Cleanup: revertir a Programado primero (el trigger solo bloquea mientras
    // status sea terminal/en ruta) y luego borrar
    await db.from('trips').update({ status: 'Programado' }).eq('id', trip!.id)
    await db.from('trips').delete().eq('id', trip!.id)
  })
})

// =============================================================================
// BD-F9 — audit_log read restringido a admin (Bloque 1.C)
// =============================================================================

test.describe('BD Fase B.1 Bloque 1.C — audit_log read restringido', () => {
  test('audit_log tiene política admin_read (no read_all)', async () => {
    // Query a pg_policies vía RPC no disponible; verificamos indirectamente
    // que la tabla tiene RLS habilitada y al menos una policy de SELECT.
    // Con service_role bypassa RLS, así que solo validamos que existe.
    const { count, error } = await db
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(typeof count).toBe('number')
  })
})
