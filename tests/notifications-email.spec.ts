/**
 * Notification Tests — Verify notification_log entries are created for key events.
 * Does NOT verify email delivery, only that the system attempted to send.
 * Run: npx playwright test tests/notifications-email.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, login, createSolicitud, createTrip, openTripDetail, dispatch, registerEntrega, registerRetorno, cleanupSolicitud } from './helpers'

test.describe.serial('Notification Log Verification', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let confirmationCode: string
  let startTime: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
    // Use a time 5 seconds from now to avoid picking up notifications from other tests
    await page.waitForTimeout(2000)
    startTime = new Date().toISOString()
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Create and send solicitud → notification logged', async () => {
    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-NOTIF', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 1, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    await page.waitForTimeout(3000) // wait for notification to be processed

    // Check notification_log for solicitud_enviada
    const { data: logs } = await db
      .from('notification_log')
      .select('id, event_type, status')
      .eq('event_type', 'solicitud_enviada')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(5)

    // Should have at least 1 notification attempt
    expect(logs!.length).toBeGreaterThanOrEqual(1)
  })

  test('Dispatch trip → salida_registrada notification logged', async () => {
    const trip = await createTrip(page)
    tripDbId = trip.dbId
    confirmationCode = trip.confirmationCode

    await openTripDetail(page, tripDbId)
    await dispatch(page)
    await page.waitForTimeout(3000)

    const { data: logs } = await db
      .from('notification_log')
      .select('id, event_type, status')
      .eq('event_type', 'salida_registrada')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(5)

    expect(logs!.length).toBeGreaterThanOrEqual(1)
  })

  test('Register Entrega → entrega_confirmada notification logged', async () => {
    await registerEntrega(page, { receiverName: 'Test Notif', confirmationCode })
    await page.waitForTimeout(3000)

    const { data: logs } = await db
      .from('notification_log')
      .select('id, event_type, status')
      .eq('event_type', 'entrega_confirmada')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(5)

    expect(logs!.length).toBeGreaterThanOrEqual(1)
  })

  test('Register Retorno → retorno_registrado notification logged', async () => {
    await registerRetorno(page)
    await page.waitForTimeout(3000)

    const { data: logs } = await db
      .from('notification_log')
      .select('id, event_type, status')
      .eq('event_type', 'retorno_registrado')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(5)

    expect(logs!.length).toBeGreaterThanOrEqual(1)
  })
})
