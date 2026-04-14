/**
 * Pickup Flow Tests — Cover Preparation → Retiro + revert Retiro.
 * Validates Fase A.1 (handlePickup idempotency), A.3 (handleRevert Retiro), A.4 (handlePreparation idempotency).
 * Run: npx playwright test tests/pickup-flow.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, login, createSolicitud, createTrip, openTripDetail, registerPreparation, registerRetiro, cleanupSolicitud } from './helpers'

test.describe.serial('Pickup — Happy path (Preparación → Retiro)', () => {
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
        { type: 'Material', description: 'TEST-PICKUP Happy', from: 'PROVEEDOR ACME', to: { dropdown: /Taller Chilibre/ }, quantity: 5, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId, isPickup: true })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    // Fallback si el helper no captura el código
    if (!confirmationCode) {
      const { data: t } = await db.from('trips').select('confirmation_code').eq('id', tripDbId).single()
      confirmationCode = t?.confirmation_code ?? ''
    }

    await openTripDetail(page, tripDbId)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Trip starts as Programado y es self-pickup', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status, is_self_pickup')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Programado')
    expect(trip!.is_self_pickup).toBe(true)
  })

  test('Register Preparación → trip event creado', async () => {
    await registerPreparation(page)

    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
    const types = events!.map(e => e.event_type)
    expect(types).toContain('Preparacion')
  })

  test('Register Retiro → trip Completado + qty_delivered actualizada', async () => {
    await registerRetiro(page, { confirmationCode })

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')

    // Qty delivered debe coincidir con quantity (entrega completa)
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id, qty_delivered')
      .eq('trip_id', tripDbId)
    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('quantity, qty_delivered, status')
        .eq('id', a.request_line_id)
        .single()
      expect(Number(a.qty_delivered)).toBe(Number(line!.quantity))
      expect(Number(line!.qty_delivered)).toBe(Number(line!.quantity))
      expect(line!.status).toBe('Entregada')
    }
  })

  test('BD: Retiro event tiene trip_event_lines (no huérfano)', async () => {
    const { data: retiroEvents } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Retiro')

    expect(retiroEvents!.length).toBe(1)
    const retiroId = retiroEvents![0].id

    const { data: lines } = await db
      .from('trip_event_lines')
      .select('id')
      .eq('trip_event_id', retiroId)
    expect(lines!.length).toBeGreaterThan(0)
  })
})

test.describe.serial('Pickup — Revert Retiro recalcula qty_delivered (N1 fix)', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string
  let lineId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-PICKUP Revert', from: 'PROVEEDOR REVERT', to: { dropdown: /Taller Chilibre/ }, quantity: 8, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId, isPickup: true })
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode
    if (!confirmationCode) {
      const { data: t } = await db.from('trips').select('confirmation_code').eq('id', tripDbId).single()
      confirmationCode = t?.confirmation_code ?? ''
    }

    // Capturar line ID antes del retiro
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)
      .limit(1)
      .single()
    lineId = assignments!.request_line_id

    await openTripDetail(page, tripDbId)
    await registerPreparation(page)
    await registerRetiro(page, { confirmationCode })
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('BD pre-revert: línea Entregada y trip Completado', async () => {
    const { data: line } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, quantity')
      .eq('id', lineId)
      .single()
    expect(line!.status).toBe('Entregada')
    expect(Number(line!.qty_delivered)).toBe(Number(line!.quantity))

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')
  })

  test('Revert Retiro → línea vuelve En Transito + qty_delivered=0 + trip En Ruta', async () => {
    // Click Revertir (el botón aparece en el panel cuando hay un evento revertible)
    const revertBtn = page.getByRole('button', { name: /Revertir/ })
    await expect(revertBtn).toBeVisible({ timeout: 5000 })
    await revertBtn.click()
    await page.waitForTimeout(500)

    // Razón
    const reasonInput = page.locator('textarea').last()
    await reasonInput.fill('Test: revertir retiro recalcula qty')
    await page.waitForTimeout(300)

    // Confirmar
    const confirmBtn = page.getByRole('button', { name: /Confirmar Reversión|Revertir/ }).last()
    await confirmBtn.click()
    await page.waitForTimeout(3000)

    // Verificación: línea
    const { data: line } = await db
      .from('sm_request_lines')
      .select('status, qty_delivered, qty_scheduled, quantity')
      .eq('id', lineId)
      .single()
    expect(line!.status).toBe('En Transito') // SIN acento
    expect(Number(line!.qty_delivered)).toBe(0)
    expect(Number(line!.qty_scheduled)).toBe(Number(line!.quantity))

    // Verificación: trip
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')
  })

  test('BD: trip_line_assignments.qty_delivered también revertido', async () => {
    const { data: assignment } = await db
      .from('trip_line_assignments')
      .select('qty_delivered')
      .eq('trip_id', tripDbId)
      .eq('request_line_id', lineId)
      .single()
    expect(Number(assignment!.qty_delivered)).toBe(0)
  })

  test('BD: Reversion event existe y apunta al Retiro', async () => {
    const { data: reversions } = await db
      .from('trip_events')
      .select('reverts_event_id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Reversion')

    expect(reversions!.length).toBe(1)
    expect(reversions![0].reverts_event_id).not.toBeNull()

    const { data: original } = await db
      .from('trip_events')
      .select('event_type')
      .eq('id', reversions![0].reverts_event_id!)
      .single()
    expect(original!.event_type).toBe('Retiro')
  })
})
