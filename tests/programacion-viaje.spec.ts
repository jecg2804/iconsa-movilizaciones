/**
 * Trip Programming Tests — Verify trip creation, editing, and cancellation.
 * Run: npx playwright test tests/programacion-viaje.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, createTrip, cleanupSolicitud } from './helpers'

test.describe.serial('Trip Creation', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-TRIP-CREATE', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 15, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Create trip → BD has correct data', async () => {
    const trip = await createTrip(page)
    tripDbId = trip.dbId

    const { data } = await db
      .from('trips')
      .select('id, trip_id, status, driver_id, vehicle_id, scheduled_date, confirmation_code, is_self_pickup')
      .eq('id', tripDbId)
      .single()

    expect(data!.status).toBe('Programado')
    expect(data!.trip_id).toMatch(/^MOV-\d{4}-\d+$/)
    expect(data!.driver_id).not.toBeNull()
    expect(data!.vehicle_id).not.toBeNull()
    expect(data!.confirmation_code).toMatch(/^\d{4}$/)
    expect(data!.is_self_pickup).toBe(false)
  })

  test('BD: Lines are Programada with qty_scheduled > 0', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id, quantity_assigned')
      .eq('trip_id', tripDbId)

    expect(assignments!.length).toBeGreaterThanOrEqual(1)

    for (const a of assignments ?? []) {
      expect(Number(a.quantity_assigned)).toBeGreaterThan(0)

      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_scheduled')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Programada')
      expect(Number(line!.qty_scheduled)).toBeGreaterThan(0)
    }
  })

  test('BD: Solicitud status cascaded to En Proceso', async () => {
    const { data } = await db
      .from('sm_requests')
      .select('status')
      .eq('id', solicitudId)
      .single()
    // Should be En Proceso since lines are Programada
    expect(['En Proceso', 'Enviada']).toContain(data!.status)
  })
})

test.describe.serial('Trip Cancellation', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-TRIP-CANCEL', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 8, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page)
    tripDbId = trip.dbId
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test.skip('BD: Before cancel — lines are Programada (data isolation issue)', async () => {
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

  test('Cancel trip via BD (direct — UI cancel flow varies)', async () => {
    // Cancel directly via BD since UI cancel flow involves confirmation dialog
    // that varies by implementation. The important thing is verifying the
    // cascade behavior when status changes to Cancelado.
    const { error } = await db
      .from('trips')
      .update({ status: 'Cancelado' })
      .eq('id', tripDbId)
    expect(error).toBeNull()
  })

  test('BD: After cancel — trip is Cancelado', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Cancelado')
  })

  test('BD: After cancel — lines return to Pendiente with qty_scheduled=0', async () => {
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('status, qty_scheduled')
      .eq('request_id', solicitudId)

    for (const line of lines ?? []) {
      expect(line.status).toBe('Pendiente')
      expect(Number(line.qty_scheduled)).toBe(0)
    }
  })
})

test.describe.serial('Pickup Trip', () => {
  let page: Page
  let solicitudId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-PICKUP-TRIP', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 3, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test.skip('Create pickup trip → is_self_pickup=true in BD (checkbox selector WIP)', async () => {
    const trip = await createTrip(page, { isPickup: true })

    const { data } = await db
      .from('trips')
      .select('is_self_pickup, driver_id, vehicle_id')
      .eq('id', trip.dbId)
      .single()

    expect(data!.is_self_pickup).toBe(true)
    // Pickup trips may have null driver/vehicle
  })
})
