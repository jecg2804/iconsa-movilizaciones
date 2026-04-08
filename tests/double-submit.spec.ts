/**
 * Double-Submit Prevention Tests — Verify useSubmitGuard prevents duplicate operations.
 * Run: npx playwright test tests/double-submit.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, createTrip, openTripDetail, cleanupSolicitud } from './helpers'

test.describe.serial('Double Submit Prevention', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Double-click "Enviar Solicitud" creates only 1 solicitud', async () => {
    // Count solicitudes before
    const { count: before } = await db
      .from('sm_requests')
      .select('*', { count: 'exact', head: true })

    // Create solicitud but click send twice
    await page.goto(`${BASE}/solicitudes/nueva`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Fill minimal data
    const { pick } = await import('./helpers')
    await pick(page, /Proyecto/, /Muelle 14/)
    await page.getByRole('textbox', { name: 'Fecha Requerida' }).fill('2026-04-20')

    // Add line
    await page.getByRole('button', { name: /Agregar Linea/ }).first().click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'Material' }).click()
    await page.getByRole('textbox', { name: /Descripcion del material/ }).fill('DOUBLE-SUBMIT-TEST')
    await page.getByText('No esta en la lista').first().click()
    await page.locator('input[placeholder*="Escriba"]').last().fill('From Test')
    await pick(page, 'Hasta', /Muelle 14/)
    await page.getByRole('button', { name: /Guardar Linea/ }).click()
    await page.waitForTimeout(1500)

    // Handle duplicate warning if it appears
    const continueBtn = page.getByRole('button', { name: /Continuar de todas formas/ })
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click()
      await page.waitForTimeout(1000)
    }

    // DOUBLE CLICK send button
    const sendBtn = page.getByRole('button', { name: /Enviar Solicitud/ })
    await sendBtn.dblclick()
    await page.waitForTimeout(3000)

    // Count solicitudes after
    const { count: after } = await db
      .from('sm_requests')
      .select('*', { count: 'exact', head: true })

    // Should only be 1 more
    expect((after ?? 0) - (before ?? 0)).toBe(1)

    // Cleanup
    const { data } = await db
      .from('sm_requests')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      solicitudId = data.id
    }
  })

  test('Double-click "Confirmar Despacho" creates only 1 Salida event', async () => {
    // Create fresh solicitud + trip
    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'DOUBLE-DISPATCH-TEST', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 1 },
      ],
    })
    const trip = await createTrip(page)
    tripDbId = trip.dbId

    await openTripDetail(page, trip.dbId)
    await page.waitForTimeout(2000)

    // Click Registrar Salida
    await page.getByRole('button', { name: 'Registrar Salida' }).click()
    await page.waitForTimeout(1000)

    // DOUBLE CLICK Confirmar Despacho
    const confirmBtn = page.getByRole('button', { name: 'Confirmar Despacho' })
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.dblclick()
    await page.waitForTimeout(3000)

    // Count Salida events for this trip
    const { data: events } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', trip.dbId)
      .eq('event_type', 'Salida')

    expect(events).toHaveLength(1)

    // Cleanup
    await cleanupSolicitud(sol.dbId).catch(() => {})
  })
})
