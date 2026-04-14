/**
 * Reversion Tests — Verify reverting each event type works correctly.
 * Run: npx playwright test tests/reversion-complete.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, createTrip, openTripDetail, dispatch, registerParada, registerEntrega, registerRetorno, cleanupSolicitud } from './helpers'

// Helper to revert the last revertible event
async function revertLastEvent(page: Page, reason: string) {
  const revertBtn = page.getByRole('button', { name: /Revertir/ })
  await expect(revertBtn).toBeVisible({ timeout: 5000 })
  await revertBtn.click()
  await page.waitForTimeout(500)

  // Fill reason in RevertModal
  const reasonInput = page.locator('textarea').last()
  await reasonInput.fill(reason)
  await page.waitForTimeout(300)

  // Confirm revert
  const confirmBtn = page.getByRole('button', { name: /Confirmar Reversión|Revertir/ }).last()
  await confirmBtn.click()
  await page.waitForTimeout(3000)
}

test.describe.serial('Revert Salida', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-REVERT-SALIDA', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 5, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    await openTripDetail(page, tripDbId)
    await dispatch(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Revert Salida → trip returns to Programado', async () => {
    await revertLastEvent(page, 'Test: revirtiendo salida')

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Programado')
  })

  test('BD: Lines return to Programada after Salida revert', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Programada')
    }
  })

  test('BD: Reversion event exists with reverts_event_id', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('event_type, reverts_event_id, notes')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Reversion')

    expect(events!.length).toBeGreaterThanOrEqual(1)
    expect(events![0].reverts_event_id).not.toBeNull()
    expect(events![0].notes).toContain('revirtiendo salida')
  })

  test('Can dispatch again after revert', async () => {
    await dispatch(page)

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')
  })
})

test.describe.serial('Revert Entrega', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-REVERT-ENTREGA', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 10, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode
    await openTripDetail(page, tripDbId)
    await dispatch(page)
    await registerEntrega(page, { receiverName: 'Test Revert', confirmationCode })
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('BD: Line is Entregada before revert', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_delivered')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Entregada')
      expect(Number(line!.qty_delivered)).toBeGreaterThan(0)
    }
  })

  test('Revert Entrega → line returns to En Transito', async () => {
    await revertLastEvent(page, 'Test: revirtiendo entrega')

    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_delivered')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('En Transito')
      expect(Number(line!.qty_delivered)).toBe(0)
    }
  })

  test('BD: Trip still En Ruta after Entrega revert', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')
  })

  test('Can deliver again after revert (no double-counting)', async () => {
    await registerEntrega(page, { receiverName: 'Test Re-deliver', confirmationCode })

    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_delivered, quantity')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Entregada')
      // qty_delivered should equal quantity (not 2x from double delivery)
      expect(Number(line!.qty_delivered)).toBe(Number(line!.quantity))
    }
  })
})

test.describe.serial('Revert Parada', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-REVERT-PARADA', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 3, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    await openTripDetail(page, tripDbId)
    await dispatch(page)
    await registerParada(page, { location: 'PROVEEDOR TEST', stopType: 'retiro', notes: 'Will revert' })
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('BD: Parada exists before revert', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events!.length).toBe(1)
  })

  test('Revert Parada → no state changes (informational)', async () => {
    await revertLastEvent(page, 'Test: revirtiendo parada')

    // Trip should still be En Ruta
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')

    // Lines should still be En Transito
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)
    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('En Transito')
    }
  })

  test('BD: Reversion event points to Parada', async () => {
    const { data: reversions } = await db
      .from('trip_events')
      .select('reverts_event_id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Reversion')

    expect(reversions!.length).toBe(1)

    // The reverted event should be the Parada
    const { data: original } = await db
      .from('trip_events')
      .select('event_type')
      .eq('id', reversions![0].reverts_event_id!)
      .single()
    expect(original!.event_type).toBe('Parada')
  })
})

test.describe.serial('Revert Retorno — no toca actual_arrival (bug fix 2026-04-13)', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-REVERT-RETORNO-ARRIVAL', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 3, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode
    await openTripDetail(page, tripDbId)
    await dispatch(page)
    await registerEntrega(page, { receiverName: 'Test Revert Retorno Arrival', confirmationCode })
    await registerRetorno(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Set a mock actual_arrival via SQL then revert Retorno → arrival stays set', async () => {
    // Simulate that Llegada había ocurrido y registrado hora
    const mockArrival = new Date().toISOString()
    await db.from('trips').update({ actual_arrival: mockArrival }).eq('id', tripDbId)

    // Revert Retorno (debería volver a En Ruta sin tocar actual_arrival)
    await revertLastEvent(page, 'Test: revert retorno preserva actual_arrival')

    const { data: trip } = await db
      .from('trips')
      .select('status, actual_arrival')
      .eq('id', tripDbId)
      .single()

    expect(trip!.status).toBe('En Ruta')
    // actual_arrival NO debe haber sido limpiado por el revert
    expect(trip!.actual_arrival).not.toBeNull()
  })
})
