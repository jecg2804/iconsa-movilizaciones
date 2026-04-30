/**
 * Tests BD-direct para Cambio 6.5 — verifican lógica de triggers + CHECKs aislada del UI.
 *
 * Por qué BD-direct (no E2E):
 * - Los triggers BD se ejecutan independiente del cliente. INSERT directo via db.from().insert()
 *   ejercita la misma lógica que pasaría por handleDelivery en frontend.
 * - Tests rápidos (~2-5s c/u vs ~60-90s E2E). Suite enfocada en la lógica nueva.
 * - Los flows UI (FE-3 toast, FE-4 validación) están cubiertos en E2E aparte
 *   (tests/cambio6-5-event-refinement.spec.ts).
 *
 * Cleanup: cleanupSolicitud explícito en afterEach. Razones:
 * - Supabase JS no expone transactions API; BEGIN/ROLLBACK requeriría RPC custom.
 * - cleanupSolicitud existe, está testeado en Cambio 6 (18 tests verde), maneja la cascada.
 * - Mismo patrón que tests E2E del Cambio 6.5 — consistencia de suite.
 *
 * Orden de tests: complejidad creciente. Si los CHECKs (1-2) fallan, los triggers
 * complejos también fallarán y debug es más difícil con setup pesado. Mejor empezar
 * por los simples para fail-fast.
 */

import { test, expect } from '@playwright/test'
import { db, cleanupSolicitud } from './helpers'

test.describe('Cambio 6.5 — BD triggers (BD-direct)', () => {
  let projectId: string
  let personId: string
  let rateId: string
  const createdSolicitudIds: string[] = []

  test.beforeAll(async () => {
    // Resolver IDs master de staging — usados como FKs en setup
    const { data: project, error: pErr } = await db
      .from('projects')
      .select('id')
      .eq('code', '25-506')
      .single()
    if (pErr || !project) throw new Error(`No se encontró project Muelle 14 (25-506): ${pErr?.message}`)
    projectId = project.id

    const { data: person, error: peErr } = await db
      .from('people')
      .select('id')
      .eq('email', 'jcucalon@iconsanet.com')
      .single()
    if (peErr || !person) throw new Error(`No se encontró person admin: ${peErr?.message}`)
    personId = person.id

    const { data: rate, error: rErr } = await db
      .from('mobilization_rates')
      .select('id')
      .limit(1)
      .single()
    if (rErr || !rate) throw new Error(`No se encontró ningún mobilization_rate: ${rErr?.message}`)
    rateId = rate.id
  })

  test.afterEach(async () => {
    for (const id of createdSolicitudIds) {
      await cleanupSolicitud(id).catch(() => {})
    }
    createdSolicitudIds.length = 0
  })

  /**
   * Helper interno: crea solicitud + N líneas + trip + assignments con estado configurable.
   * Inserta directo via db (bypassa UI). Trackea solicitud en createdSolicitudIds para cleanup.
   *
   * @param opts.lines Array de líneas. Cada line: qty (quantity de la línea), dispatched/delivered/rejected
   *   son valores opcionales para inicializar el assignment en estado avanzado (post-Salida, post-Entrega, etc.)
   * @param opts.tripStatus Default 'En Ruta' (post-Salida). Otros: 'Programado' (pre-Salida), 'Completado', 'Cancelado'.
   * @param opts.skipAssignments Si true, NO crea assignments — solo solicitud + líneas + trip vacío. Útil para Test #1, #2.
   */
  async function setupSolicitudWithTrip(opts: {
    lines: Array<{ qty: number; dispatched?: number; delivered?: number; rejected?: number }>
    tripStatus?: 'Programado' | 'En Ruta' | 'Completado' | 'Cancelado'
    skipAssignments?: boolean
  }) {
    const today = new Date().toISOString().slice(0, 10)
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // 1. Solicitud — crear en 'Borrador' para que el trigger
    //    enforce_line_add_delete_only_in_borrador permita agregar líneas
    const { data: req, error: reqErr } = await db
      .from('sm_requests')
      .insert({
        project_id: projectId,
        requester_id: personId,
        date_required: today,
        status: 'Borrador',
      })
      .select('id')
      .single()
    if (reqErr || !req) throw new Error(`Failed to create solicitud: ${reqErr?.message}`)
    createdSolicitudIds.push(req.id)

    // 2. Líneas — insertar mientras solicitud está en Borrador
    const lineIds: string[] = []
    for (let i = 0; i < opts.lines.length; i++) {
      const ln = opts.lines[i]
      const { data: line, error: lnErr } = await db
        .from('sm_request_lines')
        .insert({
          request_id: req.id,
          description: `BD-direct line ${stamp}-${i}`,
          line_number: i + 1,
          line_type: 'Material',
          quantity: ln.qty,
          status: opts.tripStatus === 'Programado' ? 'Programada' : 'En Transito',
        })
        .select('id')
        .single()
      if (lnErr || !line) throw new Error(`Failed to create line ${i}: ${lnErr?.message}`)
      lineIds.push(line.id)
    }

    // 2b. Avanzar solicitud a 'En Proceso' post-líneas (cascade trigger lo haría
    //     normalmente cuando se programa una línea — replicamos manualmente)
    const { error: updErr } = await db
      .from('sm_requests')
      .update({ status: 'En Proceso' })
      .eq('id', req.id)
    if (updErr) throw new Error(`Failed to update solicitud status: ${updErr.message}`)

    // 3. Trip
    const { data: trip, error: trErr } = await db
      .from('trips')
      .insert({
        rate_id: rateId,
        scheduled_date: today,
        status: opts.tripStatus ?? 'En Ruta',
      })
      .select('id')
      .single()
    if (trErr || !trip) throw new Error(`Failed to create trip: ${trErr?.message}`)

    // 4. Assignments (skip si pidieron solo trip vacío)
    const assignmentIds: string[] = []
    if (!opts.skipAssignments) {
      for (let i = 0; i < lineIds.length; i++) {
        const ln = opts.lines[i]
        const { data: tla, error: tlaErr } = await db
          .from('trip_line_assignments')
          .insert({
            trip_id: trip.id,
            request_line_id: lineIds[i],
            quantity_assigned: ln.qty,
            qty_dispatched: ln.dispatched ?? 0,
            qty_delivered: ln.delivered ?? 0,
            qty_rejected: ln.rejected ?? 0,
          })
          .select('id')
          .single()
        if (tlaErr || !tla) throw new Error(`Failed to create assignment ${i}: ${tlaErr?.message}`)
        assignmentIds.push(tla.id)
      }
    }

    return { solicitudId: req.id, tripId: trip.id, lineIds, assignmentIds }
  }

  // ─────────────── TEST 1: CHECK qty_rejected >= 0 ───────────────
  test('1. CHECK qty_rejected_non_negative rechaza valores negativos (BD-3)', async () => {
    const { tripId, lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 5 }],
      skipAssignments: true,
    })

    const { error } = await db.from('trip_line_assignments').insert({
      trip_id: tripId,
      request_line_id: lineIds[0],
      quantity_assigned: 5,
      qty_dispatched: 5,
      qty_delivered: 0,
      qty_rejected: -1,
    })

    expect(error).not.toBeNull()
    expect(error?.message ?? '').toMatch(/qty_rejected_non_negative|check constraint/i)
  })

  // ─────────────── TEST 2: CHECK qty_delivered + qty_rejected <= qty_dispatched ───────────────
  test('2. CHECK qty_delivered_plus_rejected_le_dispatched rechaza suma > dispatched (BD-2)', async () => {
    const { tripId, lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 10 }],
      skipAssignments: true,
    })

    // qty_dispatched=5, qty_delivered=3, qty_rejected=3 → 6 > 5 → debe fallar
    const { error } = await db.from('trip_line_assignments').insert({
      trip_id: tripId,
      request_line_id: lineIds[0],
      quantity_assigned: 10,
      qty_dispatched: 5,
      qty_delivered: 3,
      qty_rejected: 3,
    })

    expect(error).not.toBeNull()
    expect(error?.message ?? '').toMatch(/qty_delivered_plus_rejected_le_dispatched|check constraint/i)
  })

  // ─────────────── TEST 3: UNIQUE INDEX one_revert_per_event ───────────────
  test('3. UNIQUE INDEX one_revert_per_event rechaza doble revert del mismo evento (BD-9)', async () => {
    const { tripId, lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 4, dispatched: 4, delivered: 4 }],
    })

    // Insertar evento Entrega original
    const { data: origEvent, error: oErr } = await db
      .from('trip_events')
      .insert({
        trip_id: tripId,
        event_type: 'Entrega',
        registered_by: personId,
      })
      .select('id')
      .single()
    if (oErr || !origEvent) throw new Error(`Failed to insert original event: ${oErr?.message}`)

    // trip_event_lines del original (necesario para que el sync_revert tenga qué leer)
    await db.from('trip_event_lines').insert({
      trip_event_id: origEvent.id,
      request_line_id: lineIds[0],
      line_status: 'ok',
      quantity: 4,
    })

    // Primer revert — debe pasar
    const { error: rev1Err } = await db.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Reversion',
      reverts_event_id: origEvent.id,
      registered_by: personId,
      notes: 'Primer revert',
    })
    expect(rev1Err).toBeNull()

    // Segundo revert del MISMO evento — debe fallar con UNIQUE violation 23505
    const { error: rev2Err } = await db.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Reversion',
      reverts_event_id: origEvent.id,
      registered_by: personId,
      notes: 'Segundo revert (debe fallar)',
    })
    expect(rev2Err).not.toBeNull()
    expect(rev2Err?.code).toBe('23505')
  })

  // ─────────────── TEST 4: sync forward rejected aumenta qty_rejected ───────────────
  test('4. sync_assignment_on_delivery_event: rejected aumenta qty_rejected, qty_delivered=0 (BD-5)', async () => {
    const { tripId, lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 5, dispatched: 5 }],
    })

    // Insertar evento Entrega + trip_event_lines con line_status='rejected', qty=5
    const { data: ev } = await db
      .from('trip_events')
      .insert({
        trip_id: tripId,
        event_type: 'Entrega',
        registered_by: personId,
      })
      .select('id')
      .single()
    if (!ev) throw new Error('Failed to insert event')

    await db.from('trip_event_lines').insert({
      trip_event_id: ev.id,
      request_line_id: lineIds[0],
      line_status: 'rejected',
      quantity: 5,
    })

    // Verificar trigger BD-5 disparó: assignment.qty_rejected=5, qty_delivered=0, qty_dispatched=5 (preservado)
    const { data: tla } = await db
      .from('trip_line_assignments')
      .select('qty_dispatched, qty_delivered, qty_rejected')
      .eq('request_line_id', lineIds[0])
      .single()
    expect(Number(tla?.qty_dispatched)).toBe(5)
    expect(Number(tla?.qty_delivered)).toBe(0)
    expect(Number(tla?.qty_rejected)).toBe(5)

    // Verificar recalc_qty_for_line: línea status='Pendiente' (todo se rechazó, cero entregado, nada activo)
    // Nota: depende de que el trip esté NOT IN ('Cancelado','Completado'). Si el trip está 'En Ruta' y
    // qty_scheduled_active = quantity_assigned - delivered - rejected = 5-0-5 = 0, branch En Transito no aplica.
    // Cae a 'Pendiente' porque qty_delivered=0 y quantity_assigned_active>0 → 'Programada' (queda en programación).
    // Verifiquemos qty_scheduled de la línea (debería ser 0 post-rejected total):
    const { data: line } = await db
      .from('sm_request_lines')
      .select('status, qty_scheduled, qty_delivered')
      .eq('id', lineIds[0])
      .single()
    expect(Number(line?.qty_scheduled)).toBe(0)
    expect(Number(line?.qty_delivered)).toBe(0)
    // Status: como quantity_assigned_active(5) > 0 pero qty_scheduled_active=0 y qty_delivered=0,
    // la lógica del recalc cae a 'Programada' (rama 5: quantity_assigned_active > 0).
    expect(line?.status).toBe('Programada')
  })

  // ─────────────── TEST 5: Retorno no modifica líneas/assignments ───────────────
  test('5. Retorno no modifica líneas ni assignments — solo trip.status (BD-4 branch defensivo + Retorno no-op)', async () => {
    const { tripId, lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 5, dispatched: 5, delivered: 5 }],
    })

    // Snapshot pre-Retorno
    const { data: lineBefore } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, qty_scheduled')
      .eq('id', lineIds[0])
      .single()
    const { data: tlaBefore } = await db
      .from('trip_line_assignments')
      .select('qty_dispatched, qty_delivered, qty_rejected, quantity_assigned')
      .eq('request_line_id', lineIds[0])
      .single()

    // Insertar evento Retorno + UPDATE trip.status (lo que hace handleRetorno hoy)
    await db.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Retorno',
      registered_by: personId,
    })
    await db.from('trips').update({ status: 'Completado' }).eq('id', tripId)

    // Snapshot post-Retorno
    const { data: lineAfter } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, qty_scheduled')
      .eq('id', lineIds[0])
      .single()
    const { data: tlaAfter } = await db
      .from('trip_line_assignments')
      .select('qty_dispatched, qty_delivered, qty_rejected, quantity_assigned')
      .eq('request_line_id', lineIds[0])
      .single()
    const { data: trip } = await db.from('trips').select('status').eq('id', tripId).single()

    expect(lineAfter).toEqual(lineBefore)
    expect(tlaAfter).toEqual(tlaBefore)
    expect(trip?.status).toBe('Completado')
  })

  // ─────────────── TEST 6: H1 aumentar quantity siempre permitido ───────────────
  test('6. H1 enforce_quantity_immutable: aumentar quantity siempre permitido (BD-7)', async () => {
    const { lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 5, dispatched: 5, delivered: 5 }],
    })

    // Aumentar de 5 a 10 — siempre debe pasar, sin importar dispatched/delivered
    const { error } = await db.from('sm_request_lines').update({ quantity: 10 }).eq('id', lineIds[0])
    expect(error).toBeNull()

    const { data: line } = await db
      .from('sm_request_lines')
      .select('quantity')
      .eq('id', lineIds[0])
      .single()
    expect(Number(line?.quantity)).toBe(10)
  })

  // ─────────────── TEST 7: H1 bloqueado por qty_dispatched ───────────────
  test('7. H1 enforce_quantity_immutable: reducir quantity bloqueado por qty_dispatched (BD-7 cond 1)', async () => {
    const { lineIds } = await setupSolicitudWithTrip({
      lines: [{ qty: 10, dispatched: 10 }],
    })

    // Intentar reducir 10 → 5 (qty_dispatched_total=10) — debe fallar
    const { error } = await db.from('sm_request_lines').update({ quantity: 5 }).eq('id', lineIds[0])
    expect(error).not.toBeNull()
    expect(error?.message ?? '').toMatch(/cantidad ya despachada/i)
  })

  // ─────────────── TEST 8: H1 bloqueado por qty_delivered (vía pickup_order_lines) ───────────────
  test('8. H1 enforce_quantity_immutable: reducir quantity bloqueado por qty_delivered (BD-7 cond 2)', async () => {
    // NOTA SOBRE AISLAMIENTO DE LA CONDICIÓN 2 (qty_delivered):
    //
    // En trip_line_assignments, qty_delivered <= qty_dispatched siempre (CHECK Cambio 6.5).
    // Eso implica que si hay qty_delivered>0 en assignments, hay qty_dispatched>=qty_delivered.
    // Reducir quantity por debajo de qty_delivered también dispararía la condición 1 (dispatched)
    // primero — el trigger H1 chequea las 3 en orden: dispatched, delivered, assigned_active.
    //
    // Para AISLAR la condición 2, usamos pickup_order_lines (modelo todo-o-nada de Cambio 3/5):
    // pickup_order_lines NO tiene qty_dispatched (esa columna solo existe en trip_line_assignments).
    // Charris setea qty_delivered = quantity_assigned directamente al completar el pickup.
    // En ese caso, qty_dispatched_total (suma sobre trip_line_assignments) = 0, pero
    // qty_delivered_total (suma sobre las 3 fuentes) > 0 — solo la condición 2 puede disparar.
    //
    // Setup BD-direct: línea con quantity=10, sin trip_line_assignments, con 1 pickup_order_line
    // que tiene qty_delivered=4. Intentar reducir quantity a 3 → cond 1 NO aplica (sin dispatched),
    // cond 2 sí (qty_delivered_total=4 > 3).

    const today = new Date().toISOString().slice(0, 10)
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Solicitud — Borrador para permitir agregar líneas (trigger enforce_line_add_delete_only_in_borrador)
    const { data: req, error: reqErr } = await db
      .from('sm_requests')
      .insert({
        project_id: projectId,
        requester_id: personId,
        date_required: today,
        status: 'Borrador',
      })
      .select('id')
      .single()
    if (reqErr || !req) throw new Error(`Failed to create solicitud: ${reqErr?.message}`)
    createdSolicitudIds.push(req.id)

    // Línea
    const { data: line, error: lnErr } = await db
      .from('sm_request_lines')
      .insert({
        request_id: req.id,
        description: `BD-direct H1 cond2 ${stamp}`,
        line_number: 1,
        line_type: 'Material',
        quantity: 10,
        status: 'Parcial',
      })
      .select('id')
      .single()
    if (lnErr || !line) throw new Error(`Failed to create line: ${lnErr?.message}`)

    // Avanzar a 'En Proceso' post-línea
    const { error: updErr } = await db
      .from('sm_requests')
      .update({ status: 'En Proceso' })
      .eq('id', req.id)
    if (updErr) throw new Error(`Failed to update solicitud: ${updErr.message}`)

    // Pickup order Entregado con qty_delivered=4
    const { data: po, error: poErr } = await db
      .from('pickup_orders')
      .insert({
        scheduled_date: today,
        status: 'Entregado',
        approved_by: personId,
      })
      .select('id')
      .single()
    if (poErr || !po) throw new Error(`Failed to create pickup_order: ${poErr?.message}`)

    const { error: polErr } = await db.from('pickup_order_lines').insert({
      pickup_order_id: po.id,
      request_line_id: line.id,
      quantity_assigned: 4,
      qty_delivered: 4,
    })
    if (polErr) throw new Error(`Failed to create pickup_order_line: ${polErr.message}`)

    // Intentar reducir quantity 10 → 3 (qty_delivered_total=4 > 3) — debe fallar por cond 2
    const { error } = await db.from('sm_request_lines').update({ quantity: 3 }).eq('id', line.id)
    expect(error).not.toBeNull()
    expect(error?.message ?? '').toMatch(/cantidad ya entregada/i)

    // Cleanup pickup_order — cleanupSolicitud no lo cubre (Cambio 5 nuevo)
    await db.from('pickup_order_lines').delete().eq('pickup_order_id', po.id)
    await db.from('pickup_orders').delete().eq('id', po.id)
  })
})
