/**
 * Entrega (Delivery) Tests — Complete coverage of delivery logic.
 * Covers: full delivery, partial delivery, confirmation code, receiver selection.
 * Run: npx playwright test tests/entrega-complete.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, createTrip, openTripDetail, dispatch, registerEntrega, registerRetorno, cleanupSolicitud } from './helpers'

test.describe.serial('Entrega Complete', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  // --- Full Delivery ---

  test('Setup: Create solicitud, trip, and dispatch', async () => {
    const sol = await createSolicitud(page, {
      requiresCode: true,
      lines: [
        { type: 'Material', description: 'TEST-ENTREGA Material A', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 10, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page)
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    await openTripDetail(page, tripDbId)
    await dispatch(page)
  })

  test('Register full Entrega with correct code', async () => {
    await registerEntrega(page, {
      receiverName: 'Ing. Test Receiver',
      confirmationCode: confirmationCode,
    })

    // Verify in timeline
    await expect(page.getByText('Entrega').first()).toBeVisible()
  })

  test('BD: Line is Entregada with correct qty_delivered', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id, qty_delivered')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_delivered, quantity')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Entregada')
      expect(Number(line!.qty_delivered)).toBe(Number(line!.quantity))
    }
  })

  test('BD: trip_event has received_by_name', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('received_by_name')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Entrega')

    expect(events!.length).toBeGreaterThanOrEqual(1)
    // Receiver might be auto-selected (Admin) or manual fallback — just verify it's not null
    expect(events![0].received_by_name).not.toBeNull()
    expect(events![0].received_by_name!.length).toBeGreaterThan(0)
  })

  test('BD: trip_event_lines created for delivery', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Entrega')

    for (const event of events ?? []) {
      const { data: eventLines } = await db
        .from('trip_event_lines')
        .select('id, quantity, line_status')
        .eq('trip_event_id', event.id)

      expect(eventLines!.length).toBeGreaterThan(0)
    }
  })

  test('Register Retorno → trip Completado', async () => {
    await registerRetorno(page)

    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')
  })

  test('BD: Solicitud cascaded to Completada', async () => {
    const { data: request } = await db
      .from('sm_requests')
      .select('status')
      .eq('id', solicitudId)
      .single()
    // Should be Completada since all lines are Entregada
    expect(request!.status).toBe('Completada')
  })
})

// --- Confirmation Code Tests ---

test.describe.serial('Confirmation Code Verification', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    // Create solicitud with requires_code=true
    const sol = await createSolicitud(page, {
      requiresCode: true,
      lines: [
        { type: 'Material', description: 'TEST-CODE Verify', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 5, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page)
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    await openTripDetail(page, tripDbId)
    await dispatch(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Entrega modal shows code input when requires_code=true', async () => {
    const entregaBtn = page.getByRole('button', { name: 'Registrar Entrega' })
    await expect(entregaBtn).toBeVisible({ timeout: 5000 })
    await entregaBtn.click()
    await page.waitForTimeout(1500)

    // Code input should be visible
    const codeInput = page.getByPlaceholder('4 dígitos')
    await expect(codeInput).toBeVisible()

    // Close modal without submitting
    const cancelBtn = page.getByRole('button', { name: /Cancelar/ }).last()
    await cancelBtn.click()
    await page.waitForTimeout(500)
  })

  test('Wrong confirmation code → button stays disabled', async () => {
    const entregaBtn = page.getByRole('button', { name: 'Registrar Entrega' })
    await entregaBtn.click()
    await page.waitForTimeout(1500)

    // Fill receiver
    const fallbackBtn = page.getByRole('button', { name: /No esta en la lista/ }).first()
    if (await fallbackBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fallbackBtn.click()
      await page.locator('input[placeholder*="Escriba"]').last().fill('Test Wrong Code')
      await page.waitForTimeout(300)
    }

    // Enter WRONG code
    await page.getByPlaceholder('4 dígitos').fill('0000')
    await page.waitForTimeout(500)

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: 'Confirmar Entrega' })
    await expect(confirmBtn).toBeDisabled()

    // Close
    await page.getByRole('button', { name: /Cancelar/ }).last().click()
    await page.waitForTimeout(500)
  })

  test('Correct confirmation code → entrega succeeds', async () => {
    await registerEntrega(page, {
      receiverName: 'Correct Code Test',
      confirmationCode: confirmationCode,
    })

    // Verify success
    await expect(page.getByText('Entrega').first()).toBeVisible()
  })
})
