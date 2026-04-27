/**
 * Retorno Tests — Complete coverage of trip return logic.
 * Covers: normal retorno, retorno without delivery, retorno with partial delivery.
 * Run: npx playwright test tests/retorno-complete.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { db, BASE, login, createSolicitud, createTrip, openTripDetail, dispatch, registerEntrega, registerRetorno, registerParada, cleanupSolicitud } from './helpers'

test.describe.serial('Retorno — Normal flow (after full delivery)', () => {
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
        { type: 'Material', description: 'TEST-RETORNO Normal', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 5, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    await openTripDetail(page, tripDbId)
    await dispatch(page)
    await registerEntrega(page, { receiverName: 'Test Normal Retorno', confirmationCode })
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Register Retorno after delivery → trip Completado', async () => {
    await registerRetorno(page)

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')
  })

  test('BD: All lines are Entregada', async () => {
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
      expect(line!.status).toBe('Entregada')
    }
  })

  test('BD: Complete event sequence exists', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .order('event_timestamp')

    const types = events!.map(e => e.event_type)
    expect(types).toContain('Salida')
    expect(types).toContain('Entrega')
    expect(types).toContain('Retorno')
  })
})

test.describe.serial('Retorno — Without delivery (truck comes back empty)', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-RETORNO NoDelivery', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 8, unit: /und/ },
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

  test('Register Retorno WITHOUT Entrega → trip still Completado', async () => {
    await registerRetorno(page)

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    // Trip completes regardless — truck came back
    expect(trip!.status).toBe('Completado')
  })

  test('BD: Retorno puro — undelivered lines STAY En Transito (no-op)', async () => {
    // Regla nueva: Retorno no toca cantidades. Las líneas siguen En Transito con el
    // viaje Completado — visibles en el dashboard "Entregas pendientes en viajes cerrados".
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id, qty_dispatched, quantity_assigned')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_scheduled, qty_delivered')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('En Transito')
      expect(Number(line!.qty_delivered)).toBe(0)
    }
  })

  test('BD: qty_dispatched preserved (NOT reset to 0)', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('qty_dispatched, quantity_assigned')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      // Previamente el safety net reseteaba qty_dispatched a 0. Ahora debe quedar intacto.
      expect(Number(a.qty_dispatched)).toBe(Number(a.quantity_assigned))
    }
  })
})

test.describe.serial('Retorno — After Paradas (complete timeline)', () => {
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
        { type: 'Material', description: 'TEST-RETORNO Paradas', from: 'PROVEEDOR X', to: { dropdown: /Muelle 14/ }, quantity: 20, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    await openTripDetail(page, tripDbId)
    await dispatch(page)

    // Cargar lineIds para data-testid robusto en helper
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('id')
      .eq('request_id', solicitudId)
    const lineIds = (lines ?? []).map(l => l.id)
    const FIXTURE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')

    await registerParada(page, {
      useOther: true,
      freeText: 'PROVEEDOR X',
      lineIds: [lineIds[0]],
      filePath: FIXTURE,
      notes: 'Pickup completo',
    })
    await registerParada(page, {
      useOther: true,
      freeText: 'Bodega Temp',
      lineIds: [lineIds[0]],
      filePath: FIXTURE,
      notes: 'Drop temporal',
    })

    // Get fresh confirmation code from BD in case helper didn't capture it
    if (!confirmationCode) {
      const { data: t } = await db.from('trips').select('confirmation_code').eq('id', tripDbId).single()
      confirmationCode = t?.confirmation_code ?? ''
    }
    await registerEntrega(page, { receiverName: 'Test Parada Retorno', confirmationCode })
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Register Retorno after Paradas + Entrega', async () => {
    await registerRetorno(page)

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')
  })

  test('BD: Full event sequence preserved', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .order('event_timestamp')

    const types = events!.map(e => e.event_type)
    expect(types[0]).toBe('Salida')
    expect(types.filter(t => t === 'Parada')).toHaveLength(2)
    expect(types).toContain('Entrega')
    expect(types[types.length - 1]).toBe('Retorno')
  })
})
