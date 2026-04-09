/**
 * Role Permission Tests — Verify each role sees correct buttons and has correct access.
 * NOTE: These tests require test accounts for each role in staging.
 * If accounts don't exist, tests will be skipped gracefully.
 * Run: npx playwright test tests/role-permissions.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, createTrip, openTripDetail, dispatch, cleanupSolicitud } from './helpers'

// Test accounts — these need to exist in staging with correct app_role
const ACCOUNTS = {
  admin: { email: 'jcucalon@iconsanet.com', password: 'Frijolin31!' },
  // Add other role accounts here when available:
  // logistica: { email: 'ccharris@iconsanet.com', password: '...' },
  // pm: { email: 'acaballero@iconsanet.com', password: '...' },
  // campo: { email: 'rdiaz@iconsanet.com', password: '...' },
  // almacen: { email: 'almacen@iconsanet.com', password: '...' },
}

test.describe('Admin Role Permissions', () => {
  let page: Page

  test.setTimeout(60000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, ACCOUNTS.admin)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('Admin sees all 5 sidebar sections', async () => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitudes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Programación' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mis Movilizaciones' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible()
  })

  test('Admin can access /solicitudes/nueva', async () => {
    await page.goto(`${BASE}/solicitudes/nueva`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Nueva Solicitud')).toBeVisible()
  })

  test('Admin can access /programacion', async () => {
    await page.goto(`${BASE}/programacion`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Programación').first()).toBeVisible()
  })

  test('Admin can access /admin', async () => {
    await page.goto(`${BASE}/admin`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    // Admin page should load without redirect
    expect(page.url()).toContain('admin')
  })
})

test.describe('Admin Event Button Visibility', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page, ACCOUNTS.admin)

    // Create a trip and dispatch it to see event buttons
    const sol = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST-ROLE-ADMIN', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 1, unit: /und/ },
      ],
    })
    solicitudId = sol.dbId
    const trip = await createTrip(page)
    tripDbId = trip.dbId
    await openTripDetail(page, tripDbId)
    await dispatch(page)
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  test('Admin sees Parada button after Salida', async () => {
    await expect(page.getByRole('button', { name: 'Registrar Parada' }).first()).toBeVisible()
  })

  test('Admin sees Entrega button', async () => {
    await expect(page.getByRole('button', { name: 'Registrar Entrega' })).toBeVisible()
  })

  test('Admin sees Incidencia button', async () => {
    await expect(page.getByRole('button', { name: /Incidencia/ })).toBeVisible()
  })

  test('Admin sees confirmation code', async () => {
    await expect(page.getByText('Código de confirmación')).toBeVisible()
  })

  test('Admin sees Revertir button', async () => {
    await expect(page.getByRole('button', { name: /Revertir/ })).toBeVisible()
  })
})

// Placeholder for other roles — uncomment when test accounts are available
/*
test.describe('PM Role Permissions', () => {
  test('PM sees only Entrega + Incidencia buttons', async () => {
    // Login as PM
    // Navigate to trip detail
    // Verify: Entrega visible, Incidencia visible
    // Verify: Salida NOT visible, Retorno NOT visible, Parada NOT visible
  })

  test('PM sees confirmation code in solicitud detail', async () => {
    // Navigate to solicitud with programmed trip
    // Verify code is visible
  })

  test('PM can create solicitudes', async () => {
    // Navigate to /solicitudes/nueva — should work
  })

  test('PM cannot access /admin', async () => {
    // Navigate to /admin — should redirect
  })
})

test.describe('Campo Role Permissions', () => {
  test('Campo does NOT see confirmation code', async () => {
    // Login as campo
    // Navigate to trip detail
    // Verify code NOT visible
  })

  test('Campo sees Salida, Llegada, Parada, Entrega, Incidencia', async () => {
    // Verify button visibility
  })

  test('Campo does NOT see Retorno', async () => {
    // Retorno is for logistica/admin only
  })
})
*/
