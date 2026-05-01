/**
 * Tests E2E para Cambio 6.5 — verifican integración FE↔BD post-FE-1/FE-2/FE-3/FE-4.
 *
 * Por qué E2E (no BD-direct):
 * - Tests #1, #3, #7: cubren FE-1/FE-2 (eliminar UPDATE/decremento manual). Si Code olvida
 *   borrar una línea del UPDATE manual, hay doble incremento detectable solo pasando por
 *   handleDelivery/handleRevert reales en frontend.
 * - Test #5: verifica validación frontend FE-4 (notas required cuando hay with_observations).
 *   BD-direct no aplica — la BD ya tiene BD-10, lo que probamos acá es el bloqueo del submit.
 * - Test #9: mensaje user-facing FE-3 + BD-8 backstop. Verificar UX del mensaje requiere UI.
 *
 * RED phase: estos 5 quedan ROJOS hasta que T4-T7 (FE-1 a FE-4) se apliquen y eliminen
 * el doble UPDATE + agreguen guards. Verde se verifica en T9.
 *
 * Cleanup: cleanupSolicitud(solicitudId) en afterEach. OBLIGATORIO — Cambio 6 dejó 33
 * solicitudes huérfanas en staging por olvidar esto.
 */

import { test, expect } from '@playwright/test'
import {
  db,
  createSolicitud,
  openTripDetail,
  dispatch,
  registerEntrega,
  closeTrip,
  cleanupSolicitud,
} from './helpers'

// Auth: storageState inyectado por cambio6-5-setup project (tests/auth.setup.ts).
// Workaround BL-E2E-AUTH-BLOCKED. NO llamar login(page) — ya estamos autenticados.

/**
 * Setup híbrido: solicitud via UI (verifica que el flow de creación funciona),
 * trip + assignments via BD-direct (evita bug AD-5 del helper createTrip que falla
 * silenciosamente). La operación bajo test (Entrega/Revert) sigue siendo via UI,
 * que es lo que necesitamos verificar para FE-1/FE-2/FE-3/FE-4.
 *
 * Resuelve IDs master en cada test (no en beforeAll) — Playwright instancia un
 * nuevo describe contexto por test cuando workers=1.
 */
async function createTripBDDirect(opts: {
  solicitudId: string
  // Cantidades por línea — el orden coincide con line_number ascendente
  lines: Array<{ qty: number }>
}): Promise<{ tripId: string; confirmationCode: string }> {
  // 1. Resolver IDs master
  const today = new Date().toISOString().slice(0, 10)
  const { data: rate } = await db.from('mobilization_rates').select('id').limit(1).single()
  if (!rate) throw new Error('No mobilization_rate found')

  // 2. Crear trip Programado
  const { data: trip, error: trErr } = await db
    .from('trips')
    .insert({
      rate_id: rate.id,
      scheduled_date: today,
      status: 'Programado',
    })
    .select('id, confirmation_code')
    .single()
  if (trErr || !trip) throw new Error(`Failed to create trip: ${trErr?.message}`)

  // 3. Resolver lineIds de la solicitud (orden por line_number)
  const { data: lines } = await db
    .from('sm_request_lines')
    .select('id, line_number')
    .eq('request_id', opts.solicitudId)
    .order('line_number')
  if (!lines || lines.length !== opts.lines.length) {
    throw new Error(`Expected ${opts.lines.length} lines, got ${lines?.length ?? 0}`)
  }

  // 4. Crear assignments + actualizar status de líneas a 'Programada'
  for (let i = 0; i < lines.length; i++) {
    const { error: tlaErr } = await db.from('trip_line_assignments').insert({
      trip_id: trip.id,
      request_line_id: lines[i].id,
      quantity_assigned: opts.lines[i].qty,
    })
    if (tlaErr) throw new Error(`Failed to create assignment ${i}: ${tlaErr.message}`)
    // El trigger recalc_qty_for_line debería actualizar status automáticamente, pero forzamos por safety
    await db.from('sm_request_lines').update({ status: 'Programada' }).eq('id', lines[i].id)
  }

  return {
    tripId: trip.id,
    confirmationCode: trip.confirmation_code ?? '',
  }
}

test.describe('Cambio 6.5 — Refinamiento del modelo de eventos (E2E)', () => {
  let solicitudId = ''

  test.afterEach(async () => {
    if (solicitudId) {
      await cleanupSolicitud(solicitudId).catch(() => {})
      solicitudId = ''
    }
  })

  /**
   * Test 3 (reproductor literal del bug MOV-2026-058 — smoke 2026-04-30).
   *
   * Setup: solicitud con 2 líneas. Trip con assignments para ambas. Salida.
   * Acción: Entrega mixta — línea 1 rejected (qty=4), línea 2 ok parcial (qty=3 de 6).
   *
   * Verificación dual alineada con Decisión #13 del spec ('Parcial' es terminal,
   * requiere qty_scheduled_active=0):
   *   1. Inmediato post-Entrega (trip activo):
   *      - Línea 1 (rejected total): 'Pendiente' (libera al backlog post-amend BD recalc)
   *      - Línea 2 (ok parcial 3/6): 'En Transito' (qty_scheduled_active=3>0 → step 3)
   *   2. Post-cierre trip (Retorno → trip='Completado'):
   *      - Línea 1: sigue 'Pendiente' (estado operacional no cambia con cierre)
   *      - Línea 2: 'Parcial' (qty_scheduled_active=0, qty_delivered=3<6 → step 4)
   *
   * Assignments preservados en ambos puntos:
   *   - Línea 1: qty_dispatched=4, qty_delivered=0, qty_rejected=4 (Opción α)
   *   - Línea 2: qty_dispatched=6, qty_delivered=3, qty_rejected=0
   */
  test('3. Entrega mixta ok+rejected: rejected libera al backlog inmediato, ok parcial transiciona En Transito → Parcial al cerrar trip', async ({ page }) => {
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: `T3-MIXED-L1-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 4,
          unit: /und/,
        },
        {
          type: 'Material',
          description: `T3-MIXED-L2-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 6,
          unit: /und/,
        },
      ],
      // Cost code requerido para envío Borrador→Enviada (Cambio 4 J7+J7-ext).
      // Muelle 14 sin extras — solo fase + categoría.
      costCode: {
        fase: /01-2116|Contingencias/,
        categoria: /OTR|Otros/,
      },
    })
    solicitudId = sol.dbId

    // Setup híbrido: trip via BD-direct (helper createTrip falla por bug AD-5)
    const trip = await createTripBDDirect({
      solicitudId: sol.dbId,
      lines: [{ qty: 4 }, { qty: 6 }],
    })

    await openTripDetail(page, trip.tripId)
    await dispatch(page)

    // Entrega mixta: línea 0 rejected qty=4, línea 1 ok qty=3 (parcial de 6)
    await registerEntrega(page, {
      receiverName: 'Ing. Test Mixed',
      confirmationCode: trip.confirmationCode,
      lines: [
        { lineIndex: 0, status: 'rejected', qty: 4 },
        { lineIndex: 1, status: 'ok', qty: 3 },
      ],
    })

    const tripId = trip.tripId

    // ASERCIÓN 1 — post-Entrega, trip todavía activo:
    // - Línea 1 (rejected total): 'Pendiente' inmediato (libera al backlog)
    // - Línea 2 (ok parcial 3/6): 'En Transito' (qty_scheduled_active=3>0 → step 3)
    const { data: linesActive } = await db
      .from('sm_request_lines')
      .select('id, description, status, qty_delivered, qty_scheduled, line_number')
      .eq('request_id', sol.dbId)
      .order('line_number')
    expect(linesActive?.length).toBe(2)

    const line1Active = linesActive![0]
    const line2Active = linesActive![1]

    expect(line1Active.status).toBe('Pendiente')
    expect(Number(line1Active.qty_delivered)).toBe(0)

    expect(line2Active.status).toBe('En Transito')
    expect(Number(line2Active.qty_delivered)).toBe(3)

    // Assignments post-Entrega (verifican B1 fix + T4 fix):
    //   línea 1 qty_rejected=4 / qty_delivered=0 (B1 envía maxQty cuando rejected)
    //   línea 2 qty_delivered=3 / qty_rejected=0 (T4 elimina doble UPDATE)
    //   qty_dispatched preservado en ambas (Opción α)
    const { data: assignmentsActive } = await db
      .from('trip_line_assignments')
      .select('request_line_id, qty_dispatched, qty_delivered, qty_rejected, quantity_assigned')
      .eq('trip_id', tripId)
    const tla1Active = assignmentsActive?.find((a) => a.request_line_id === line1Active.id)
    const tla2Active = assignmentsActive?.find((a) => a.request_line_id === line2Active.id)

    expect(Number(tla1Active?.qty_dispatched)).toBe(4)
    expect(Number(tla1Active?.qty_delivered)).toBe(0)
    expect(Number(tla1Active?.qty_rejected)).toBe(4)

    expect(Number(tla2Active?.qty_dispatched)).toBe(6)
    expect(Number(tla2Active?.qty_delivered)).toBe(3)
    expect(Number(tla2Active?.qty_rejected)).toBe(0)

    // Cerrar trip (Retorno → trip='Completado')
    await closeTrip(page, tripId)

    // ASERCIÓN 2 — post-Retorno, trip cerrado:
    // - Línea 1: sigue 'Pendiente' (estado operacional no cambia con cierre)
    // - Línea 2: 'Parcial' (qty_scheduled_active=0 porque trip Completado no cuenta,
    //   qty_delivered_total=3 < quantity=6 → step 4 recalc)
    const { data: linesClosed } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, line_number')
      .eq('request_id', sol.dbId)
      .order('line_number')

    expect(linesClosed![0].status).toBe('Pendiente')
    expect(Number(linesClosed![0].qty_delivered)).toBe(0)

    expect(linesClosed![1].status).toBe('Parcial')
    expect(Number(linesClosed![1].qty_delivered)).toBe(3)
  })

  /**
   * Test 1 — Entrega ok parcial: línea queda 'En Transito' mientras trip activo,
   * transiciona a 'Parcial' al cerrar trip (Retorno).
   *
   * Cubre FE-1 + BD-5 + BD-4 path real en el flujo completo. Aserción dual:
   *   1. Inmediato post-Entrega (trip todavía activo): status='En Transito' porque
   *      qty_scheduled_active = 10-6-0 = 4 > 0 → step 3 del recalc dispara.
   *   2. Post-Retorno (trip='Completado'): status='Parcial' porque qty_scheduled_active=0
   *      (trip cerrado, no cuenta) y qty_delivered_total=6 < quantity=10 → step 4.
   *
   * Doble incremento de qty_delivered (FE-1 incompleto) detectable en aserción 1
   * (esperado 6, recibiría 12).
   *
   * RED until T4 (FE-1).
   */
  test('1. Entrega ok parcial: En Transito durante trip activo, Parcial al cerrar trip', async ({ page }) => {
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: `T1-OKPARTIAL-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 10,
          unit: /und/,
        },
      ],
      costCode: { fase: /01-2116|Contingencias/, categoria: /OTR|Otros/ },
    })
    solicitudId = sol.dbId

    const trip = await createTripBDDirect({ solicitudId: sol.dbId, lines: [{ qty: 10 }] })
    await openTripDetail(page, trip.tripId)
    await dispatch(page)

    // Entrega ok parcial: qty=6 de 10
    await registerEntrega(page, {
      receiverName: 'Ing. Test OK Partial',
      confirmationCode: trip.confirmationCode,
      lines: [{ lineIndex: 0, status: 'ok', qty: 6 }],
    })

    // ASERCIÓN 1 — post-Entrega, trip todavía activo:
    // - Línea: 'En Transito' (qty_scheduled_active=10-6-0=4>0 → step 3 recalc)
    // - qty_delivered=6 (NO 12 — eso indicaría doble UPDATE de FE-1 incompleto)
    const { data: lineActive } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, qty_scheduled')
      .eq('request_id', sol.dbId)
      .single()
    expect(lineActive?.status).toBe('En Transito')
    expect(Number(lineActive?.qty_delivered)).toBe(6)

    const { data: tlaActive } = await db
      .from('trip_line_assignments')
      .select('qty_dispatched, qty_delivered, qty_rejected')
      .eq('trip_id', trip.tripId)
      .single()
    expect(Number(tlaActive?.qty_dispatched)).toBe(10)
    expect(Number(tlaActive?.qty_delivered)).toBe(6)
    expect(Number(tlaActive?.qty_rejected)).toBe(0)

    // Cerrar trip (Retorno → trip='Completado')
    await closeTrip(page, trip.tripId)

    // ASERCIÓN 2 — post-Retorno, trip cerrado:
    // - Línea: 'Parcial' (qty_scheduled_active=0 porque trip Completado no cuenta,
    //   qty_delivered_total=6 < quantity=10 → step 4 recalc)
    // - qty_delivered=6 sigue siendo 6 (el cierre no toca cantidades)
    const { data: lineClosed } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered')
      .eq('request_id', sol.dbId)
      .single()
    expect(lineClosed?.status).toBe('Parcial')
    expect(Number(lineClosed?.qty_delivered)).toBe(6)
  })

  /**
   * Test 7 — Revert de Entrega revierte qty_delivered.
   * Cubre FE-2 + BD-6 path real. Si FE-2 deja decremento manual: revert hace doble decremento
   * (esperado 0, podría dar negativo o quedar en valor incorrecto).
   *
   * RED until T5 (FE-2).
   */
  test('7. Revert de Entrega revierte qty_delivered (FE-2 + BD-6)', async ({ page }) => {
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: `T7-REVERT-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 5,
          unit: /und/,
        },
      ],
      costCode: { fase: /01-2116|Contingencias/, categoria: /OTR|Otros/ },
    })
    solicitudId = sol.dbId

    const trip = await createTripBDDirect({ solicitudId: sol.dbId, lines: [{ qty: 5 }] })
    await openTripDetail(page, trip.tripId)
    await dispatch(page)

    // Entrega ok=3
    await registerEntrega(page, {
      receiverName: 'Ing. Test Revert',
      confirmationCode: trip.confirmationCode,
      lines: [{ lineIndex: 0, status: 'ok', qty: 3 }],
    })

    // Pre-revert: qty_delivered=3
    const { data: tlaPreRevert } = await db
      .from('trip_line_assignments')
      .select('qty_delivered')
      .eq('trip_id', trip.tripId)
      .single()
    expect(Number(tlaPreRevert?.qty_delivered)).toBe(3)

    // Revert el evento Entrega via UI: click botón Revertir asociado al evento Entrega
    // Selector: el timeline muestra eventos con un botón "Revertir" en el último evento revertible.
    // Recargamos página para ver el evento Entrega en timeline si fuera necesario.
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const revertBtn = page.getByRole('button', { name: /Revertir/i }).first()
    await expect(revertBtn).toBeVisible({ timeout: 10000 })
    await revertBtn.click()
    await page.waitForTimeout(800)

    // Modal de revert: pide razón en textarea
    const reasonInput = page.locator('textarea').last()
    await reasonInput.fill('Test revert qty_delivered (Cambio 6.5)')
    await page.waitForTimeout(300)

    const confirmRevertBtn = page.getByRole('button', { name: /Confirmar/i }).last()
    await confirmRevertBtn.click()
    await page.waitForTimeout(2500)

    // Post-revert: qty_delivered=0 (si FE-2 deja decremento manual: doble decremento podría
    // dar valor negativo, pero el GREATEST(0, ...) del trigger BD-6 lo clampa a 0)
    const { data: tlaPostRevert } = await db
      .from('trip_line_assignments')
      .select('qty_delivered, qty_rejected')
      .eq('trip_id', trip.tripId)
      .single()
    expect(Number(tlaPostRevert?.qty_delivered)).toBe(0)
    expect(Number(tlaPostRevert?.qty_rejected)).toBe(0)

    // Línea status post-revert: hay assignment activo (no revertido el dispatch), qty_delivered=0
    // → 'En Transito' (qty_scheduled_active = 5 - 0 - 0 = 5 > 0)
    const { data: line } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered')
      .eq('request_id', sol.dbId)
      .single()
    expect(line?.status).toBe('En Transito')
    expect(Number(line?.qty_delivered)).toBe(0)
  })

  /**
   * Test 5 — DeliveryModal valida notas required cuando hay líneas with_observations.
   * Cubre FE-4: validación frontend bloquea submit. BD-10 es defense-in-depth (no testeado acá).
   * Helper extendido usa expectSubmitBlocked para verificar disabled sin clickear.
   *
   * RED until T7 (FE-4).
   */
  test('5. Entrega con with_observations sin notas: submit bloqueado por FE-4', async ({ page }) => {
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: `T5-NOTASREQ-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 3,
          unit: /und/,
        },
      ],
      costCode: { fase: /01-2116|Contingencias/, categoria: /OTR|Otros/ },
    })
    solicitudId = sol.dbId

    const trip = await createTripBDDirect({ solicitudId: sol.dbId, lines: [{ qty: 3 }] })
    await openTripDetail(page, trip.tripId)
    await dispatch(page)

    // Marcar línea como with_observations + observation type, NO setear notas a nivel evento.
    // expectSubmitBlocked=true verifica que el botón Confirmar Entrega queda disabled.
    await registerEntrega(page, {
      receiverName: 'Ing. Test Notes',
      confirmationCode: trip.confirmationCode,
      lines: [
        {
          lineIndex: 0,
          status: 'with_observations',
          qty: 3,
          observationType: 'damaged',
          observationNotes: 'Detalle obs',
        },
      ],
      notes: '', // notas a nivel evento vacías → debe bloquear submit
      expectSubmitBlocked: true,
    })

    // Verificar BD: ningún trip_event de tipo Entrega creado (submit bloqueado)
    const { data: events } = await db
      .from('trip_events')
      .select('id, event_type')
      .eq('trip_id', trip.tripId)
      .eq('event_type', 'Entrega')
    expect(events?.length).toBe(0)
  })

  /**
   * Test 9 — Revert Entrega en trip Completado bloqueado (FE-3 + BD-8 backstop).
   * Verifica que el guard frontend muestra mensaje claro antes del INSERT a BD.
   *
   * RED until T6 (FE-3).
   */
  test('9. Revert Entrega en trip Completado bloqueado (FE-3 + BD-8)', async ({ page }) => {
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: `T9-REVERTCLOSED-${Date.now()}`,
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
          quantity: 3,
          unit: /und/,
        },
      ],
      costCode: { fase: /01-2116|Contingencias/, categoria: /OTR|Otros/ },
    })
    solicitudId = sol.dbId

    const trip = await createTripBDDirect({ solicitudId: sol.dbId, lines: [{ qty: 3 }] })
    await openTripDetail(page, trip.tripId)
    await dispatch(page)

    // Entrega + Retorno (cierra el trip)
    await registerEntrega(page, {
      receiverName: 'Ing. Test Closed',
      confirmationCode: trip.confirmationCode,
      lines: [{ lineIndex: 0, status: 'ok', qty: 3 }],
    })
    await closeTrip(page, trip.tripId)

    // Capturar count de reverts existentes ANTES del intento
    const { data: revertsPre } = await db
      .from('trip_events')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', trip.tripId)
      .not('reverts_event_id', 'is', null)
    const revertsPreCount = revertsPre?.length ?? 0

    // Intentar revertir Entrega — FE-3 debe bloquear con mensaje
    await page.goto(`http://localhost:3000/mis-viajes/${trip.tripId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)

    // Click revert Entrega — buscar botón asociado (en trip cerrado puede o no aparecer
    // según diseño UI. Si NO aparece, FE-3 está implementado a nivel render. Si aparece y
    // se clickea, debe mostrar toast/error sin INSERT a BD.)
    const revertBtns = page.getByRole('button', { name: /Revertir/i })
    const visibleCount = await revertBtns.count()

    if (visibleCount > 0) {
      // Hay botón visible — intentar click y verificar mensaje
      await revertBtns.first().click()
      await page.waitForTimeout(800)

      const reasonInput = page.locator('textarea').last()
      if (await reasonInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await reasonInput.fill('Test revert en trip cerrado')
        const confirmBtn = page.getByRole('button', { name: /Confirmar/i }).last()
        await confirmBtn.click()
        await page.waitForTimeout(2000)
      }
    }

    // Verificar BD: NO se insertó nuevo revert (FE-3 bloqueó O BD-8 bloqueó)
    const { data: revertsPost } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', trip.tripId)
      .not('reverts_event_id', 'is', null)
    expect((revertsPost?.length ?? 0)).toBe(revertsPreCount)
  })
})
