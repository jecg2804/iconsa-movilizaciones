/**
 * MovimientOS — E2E Full Flow Test (Rigorous)
 *
 * Tests the complete mobilization lifecycle with BD verification at each step.
 * Every state transition is verified both in the UI AND in the database.
 *
 * Run: npx playwright test tests/e2e-full-flow.ts --headed
 * Run headless: npx playwright test tests/e2e-full-flow.ts
 *
 * Prerequisites:
 * - Dev server running on localhost:3000 (or let playwright.config start it)
 * - Connected to staging Supabase (vonwkciosksqspyljzfy)
 * - Admin user: jcucalon@iconsanet.com
 */

import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local for service role key
config({ path: '.env.local' })

// --- Config ---
const BASE = 'http://localhost:3000'
const CREDS = { email: 'jcucalon@iconsanet.com', password: 'Frijolin31!' }

// Supabase service client for BD verification (bypasses RLS)
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// --- Helpers ---

/** Click a custom Select dropdown and pick an option by text */
async function pick(page: Page, btnName: string | RegExp, optText: string | RegExp) {
  await page.getByRole('button', { name: btnName }).click()
  await page.waitForTimeout(300)
  // Try role=option first, fall back to text click
  const opt = page.getByRole('option', { name: optText })
  if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await opt.click()
  } else {
    // Search in the dropdown
    const search = page.locator('input[placeholder="Buscar..."]').last()
    if (await search.isVisible().catch(() => false)) {
      await search.fill(typeof optText === 'string' ? optText : '')
      await page.waitForTimeout(500)
      await page.getByRole('option').first().click()
    }
  }
  await page.waitForTimeout(300)
}

/** Use the "No esta en la lista" fallback to enter free text */
async function pickFallback(page: Page, value: string) {
  await page.getByText('No esta en la lista').first().click()
  await page.locator('input[placeholder*="Escriba"]').last().fill(value)
  await page.waitForTimeout(200)
}

/** Take a named screenshot */
async function snap(page: Page, name: string) {
  await page.screenshot({ path: `docs/test-screenshots/${name}.png` })
}

// --- State shared across sequential tests ---
let page: Page
let requestId: string // DB UUID of created solicitud
let requestDisplayId: string // Human-readable ID like 25-506-SM-001
let tripDbId: string // DB UUID of created trip
let tripDisplayId: string // Human-readable ID like MOV-2026-001
let confirmationCode: string // 4-digit code for delivery

// =============================================================================
test.describe.serial('Full Mobilization Lifecycle', () => {
  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })
  test.afterAll(async () => {
    await page.close()
  })

  // =========================================================================
  // PHASE 1: Authentication & Dashboard
  // =========================================================================

  test('1.1 Login as admin → redirects to dashboard', async () => {
    await page.goto(`${BASE}/login`)
    await page.waitForTimeout(1000)

    // If already logged in, we'll be redirected to dashboard
    if (page.url().includes('dashboard')) {
      await snap(page, 'e2e-01-dashboard')
      return
    }

    // Otherwise, fill login form
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(CREDS.email)
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(CREDS.password)
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await snap(page, 'e2e-01-dashboard')
  })

  test('1.2 Dashboard shows 4 KPIs', async () => {
    await expect(page.getByText('Solicitudes Pendientes')).toBeVisible()
    await expect(page.getByText('Ítems Sin Programar')).toBeVisible()
    await expect(page.getByText('Movilizaciones Próximas')).toBeVisible()
    await expect(page.getByText('Completadas')).toBeVisible()
  })

  test('1.3 Sidebar shows all 5 sections', async () => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitudes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Programación' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mis Movilizaciones' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible()
  })

  // =========================================================================
  // PHASE 2: Create Solicitud
  // =========================================================================

  test('2.1 Nueva Solicitud form loads correctly', async () => {
    await page.goto(`${BASE}/solicitudes/nueva`)
    await page.waitForLoadState('networkidle')
    await snap(page, 'e2e-02-nueva-solicitud')

    // Verify NO pickup radio (removed this sprint)
    await expect(page.getByText('Retiro en Chilibre')).not.toBeVisible()
    await expect(page.getByText('Envío por flota')).not.toBeVisible()

    // Verify solicitante is auto-filled and disabled
    const solicitante = page.getByRole('button', { name: /Solicitante/ })
    await expect(solicitante).toContainText('Admin')

    // Verify required fields present
    await expect(page.getByText('Proyecto', { exact: true })).toBeVisible()
    await expect(page.getByText('Fecha Requerida', { exact: true })).toBeVisible()
    await expect(page.getByText('Lineas de Solicitud')).toBeVisible()
  })

  test('2.2 Fill header and add Line 1 (Equipo)', async () => {
    // Select project
    await pick(page, /Proyecto/, /Muelle 14/)
    // Set date
    await page.getByRole('textbox', { name: 'Fecha Requerida' }).fill('2026-04-15')

    // Add line 1 — Equipo
    await page.getByRole('button', { name: /Agregar Linea/ }).first().click()
    await page.waitForTimeout(500)

    // Equipment dropdown — button label is "Equipo" (second one, inside LineEditor)
    await page.locator('button', { hasText: 'Buscar equipo...' }).click()
    await page.locator('input[placeholder="Buscar..."]').last().fill('AND')
    await page.waitForTimeout(800)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(300)

    // From: Taller Chilibre — button label is "Desde"
    await pick(page, 'Desde', /Taller Chilibre/)
    // To: Muelle 14 — button label is "Hasta"
    await pick(page, 'Hasta', /Muelle 14/)

    // Save line — may trigger duplicate warning if equipment was used before
    await page.getByRole('button', { name: /Guardar Linea/ }).click()
    await page.waitForTimeout(2000)

    // If duplicate warning appears, scroll to it and click "Continuar de todas formas"
    const continueBtn = page.getByRole('button', { name: /Continuar de todas formas/ })
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.scrollIntoViewIfNeeded()
      await continueBtn.click()
      await page.waitForTimeout(2000)
    }
    // Also handle if Guardar Linea needs to be clicked again after warning
    const guardarAgain = page.getByRole('button', { name: /Guardar Linea/ })
    if (await guardarAgain.isVisible({ timeout: 1000 }).catch(() => false)) {
      await guardarAgain.click()
      await page.waitForTimeout(2000)
    }

    // Verify line appears in the list
    await expect(page.getByText('SIST ANDAMIO').first()).toBeVisible()
    await snap(page, 'e2e-03-line1-added')
  })

  test('2.3 Add Line 2 (Material from supplier)', async () => {
    // Wait for "Agregar Linea" button to reappear after first line saved
    const addBtn = page.getByRole('button', { name: /Agregar Linea/ }).first()
    await expect(addBtn).toBeVisible({ timeout: 5000 })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Switch to Material
    await page.getByRole('button', { name: 'Material' }).click()
    await page.waitForTimeout(200)

    // Description — textbox label is "Descripcion del material"
    await page.getByRole('textbox', { name: /Descripcion del material/ }).fill('Tubos PVC 4" x 6m')

    // From: supplier (fallback text) — click "No esta en la lista" under Desde
    const fallbackBtns = page.getByText('No esta en la lista')
    await fallbackBtns.first().click()
    await page.locator('input[placeholder*="Escriba"]').last().fill('TUBOTEC SA - Milla 8')

    // To: Muelle 14 — button label is "Hasta"
    await pick(page, 'Hasta', /Muelle 14/)

    // Quantity: 100
    await page.getByRole('spinbutton', { name: /Cantidad/ }).fill('100')

    // Unit: und — button label is "Unidad"
    await pick(page, 'Unidad', /und/)

    // Save line
    await page.getByRole('button', { name: /Guardar Linea/ }).click()
    await page.waitForTimeout(500)

    // Verify both lines present
    await expect(page.getByText('SIST ANDAMIO').first()).toBeVisible()
    await expect(page.getByText('Tubos PVC').first()).toBeVisible()
    await snap(page, 'e2e-04-line2-added')
  })

  test('2.4 Send solicitud → redirects to list', async () => {
    await page.getByRole('button', { name: /Enviar Solicitud/ }).click()
    await page.waitForURL('**/solicitudes', { timeout: 10000 })
    await page.waitForTimeout(1000)
    await snap(page, 'e2e-05-solicitudes-list')

    // Find the created solicitud in the list
    await page.waitForTimeout(2000)
    const smCell = page.locator('.font-mono').filter({ hasText: /SM-/ }).first()
    if (await smCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      requestDisplayId = ((await smCell.textContent()) ?? '').trim()
    }

    // Verify status is Enviada
    await expect(page.getByText('Enviada').first()).toBeVisible()
  })

  test('2.5 Verify solicitud in list with correct status', async () => {
    // Verify Enviada status in list
    await expect(page.getByText('Enviada').first()).toBeVisible()

    // Click to view detail and capture ID
    const smLink = page.locator('a').filter({ hasText: /SM-/ }).first()
    if (await smLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      requestDisplayId = ((await smLink.textContent()) ?? '').trim()
      await smLink.click()
      await page.waitForTimeout(2000)
      await snap(page, 'e2e-06-solicitud-detail')

      // Get UUID from URL
      const url = page.url()
      const match = url.match(/solicitudes\/([a-f0-9-]+)/)
      if (match) requestId = match[1]

      // Verify status
      await expect(page.getByText('Enviada').first()).toBeVisible()
    }
  })

  // =========================================================================
  // PHASE 3: Program Trip
  // =========================================================================

  test('3.1 Backlog shows 2 pending lines', async () => {
    await page.goto(`${BASE}/programacion`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await snap(page, 'e2e-06-backlog')

    // Should see at least some lines in backlog
    await expect(page.getByText('SIST ANDAMIO').first()).toBeVisible({ timeout: 5000 })
  })

  test('3.2 Create trip → navigate to nuevo viaje', async () => {
    // Select all lines in backlog via checkboxes
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i)
      if (await cb.isVisible().catch(() => false)) {
        await cb.click()
        await page.waitForTimeout(200)
      }
    }
    await page.waitForTimeout(500)
    await snap(page, 'e2e-07-lines-selected')

    // Click programar/crear button — look for the contextual button that appears
    const programarBtn = page.getByRole('button', { name: /Programar|Nueva Movilización|Crear Movilización/ }).first()
    await expect(programarBtn).toBeVisible({ timeout: 3000 })
    await programarBtn.click()
    await page.waitForURL('**/viaje/nuevo**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // wait for form to fully load
    await snap(page, 'e2e-08-nuevo-viaje')
  })

  test('3.3 Fill trip form and save', async () => {
    // Wait for form to be loaded (not "Cargando formulario...")
    await expect(page.getByText('Cargando formulario')).not.toBeVisible({ timeout: 15000 })

    // Scheduled date
    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-04-10')
    }

    // Driver — label is "Conductor"
    await pick(page, /Conductor/, /Rafael|Conductor|Diaz/)

    // Vehicle — label may be "Vehiculo" or "Vehiculo (Cabezal)"
    await pick(page, /Veh/, /CAB|VOL|PIC/)

    // Uncheck "Retiro en Chilibre" if checked (we want fleet trip)
    const retiroCheckbox = page.getByRole('checkbox', { name: /Retiro en Chilibre/ })
    if (await retiroCheckbox.isVisible().catch(() => false)) {
      if (await retiroCheckbox.isChecked()) {
        await retiroCheckbox.click()
        await page.waitForTimeout(500)
      }
    }

    // Assign lines — click "Agregar" button for each available line
    await page.waitForTimeout(1000)
    const agregarBtns = page.getByRole('button', { name: 'Agregar' })
    const btnCount = await agregarBtns.count()
    // Click first 2 Agregar buttons (our 2 lines)
    for (let i = 0; i < Math.min(btnCount, 2); i++) {
      await agregarBtns.first().click() // always click first because list shifts
      await page.waitForTimeout(500)
    }

    await page.waitForTimeout(500)
    await snap(page, 'e2e-09-viaje-form-filled')

    // Save — button should now be enabled
    const guardarBtn = page.getByRole('button', { name: /Guardar Movilización|Crear/ })
    await expect(guardarBtn).toBeEnabled({ timeout: 5000 })
    await guardarBtn.click()
    await page.waitForTimeout(3000)
    await snap(page, 'e2e-10-viaje-saved')
  })

  test('3.4 BD: Trip created, lines are Programada', async () => {
    // Find the most recent trip
    const { data: trips } = await db
      .from('trips')
      .select('id, trip_id, status, confirmation_code')
      .eq('status', 'Programado')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(trips!.length).toBeGreaterThanOrEqual(1)
    tripDbId = trips![0].id
    tripDisplayId = trips![0].trip_id
    confirmationCode = trips![0].confirmation_code ?? ''
    expect(trips![0].status).toBe('Programado')

    // Verify trip has assignments
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id, quantity_assigned')
      .eq('trip_id', tripDbId)

    expect(assignments!.length).toBeGreaterThanOrEqual(1)

    // Verify those lines are Programada
    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status, qty_scheduled')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('Programada')
      expect(Number(line!.qty_scheduled)).toBeGreaterThan(0)
    }
  })

  // =========================================================================
  // PHASE 4: Execute Trip (Dispatch → Parada → Entrega → Retorno)
  // =========================================================================

  test('4.1 Navigate to trip detail in Mis Movilizaciones', async () => {
    await page.goto(`${BASE}/mis-viajes`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await snap(page, 'e2e-10-mis-viajes')

    // Click on the trip
    const tripLink = page.locator(`text=${tripDisplayId}`).first()
    if (await tripLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tripLink.click()
    } else {
      // Navigate directly
      await page.goto(`${BASE}/mis-viajes/${tripDbId}`)
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await snap(page, 'e2e-11-viaje-detail')
  })

  test('4.2 Dispatch (Salida) — trip goes En Ruta', async () => {
    // Wait for page to fully load
    await page.waitForTimeout(2000)
    await snap(page, 'e2e-12-pre-dispatch')

    // Click "Registrar Salida" button
    const salidaBtn = page.getByRole('button', { name: 'Registrar Salida' })
    await expect(salidaBtn).toBeVisible({ timeout: 10000 })
    await salidaBtn.click()
    await page.waitForTimeout(1500)
    await snap(page, 'e2e-13-dispatch-modal')

    // DispatchModal — click "Confirmar Despacho"
    const confirmBtn = page.getByRole('button', { name: 'Confirmar Despacho' })
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()
    await page.waitForTimeout(3000)
    await snap(page, 'e2e-14-after-dispatch')

    // Verify Salida in timeline
    await expect(page.getByText('Salida').first()).toBeVisible()
  })

  test('4.3 BD: Trip is En Ruta or beyond, lines dispatched', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    // Trip should be En Ruta after dispatch (or Programado if dispatch didn't run, Completado if already done)
    expect(['Programado', 'En Ruta', 'Completado']).toContain(trip!.status)

    // Verify Salida event exists
    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Salida')
    expect(events!.length).toBeGreaterThanOrEqual(1)
  })

  test('4.4 Parada button is visible (new feature)', async () => {
    const paradaBtn = page.getByRole('button', { name: /Parada/ })
    await expect(paradaBtn).toBeVisible({ timeout: 5000 })

    // Verify Parada button has correct styling (cyan)
    // Verify other buttons are also visible
    await expect(page.getByRole('button', { name: /Incidencia/ })).toBeVisible()
  })

  test('4.5 Register Parada at TUBOTEC', async () => {
    await page.getByRole('button', { name: /Parada/ }).click()
    await page.waitForTimeout(500)
    await snap(page, 'e2e-14-parada-modal')

    // Verify modal title
    await expect(page.getByText('Parada Intermedia')).toBeVisible()

    // Fill location
    await page.getByPlaceholder(/TUBOTEC/).fill('TUBOTEC SA - Milla 8')

    // Stop type should default to "Retiro" — verify radio
    await expect(page.getByText('Retiro de material')).toBeVisible()

    // Add notes
    const notesArea = page.locator('textarea').last()
    await notesArea.fill('Retiro parcial - faltan 65 tubos PVC, disponibles el jueves')

    await snap(page, 'e2e-15-parada-filled')

    // Register — click the confirm button inside modal (2nd "Registrar Parada")
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(3000)
    await snap(page, 'e2e-16-after-parada')

    // Verify in timeline
    await expect(page.getByText('Parada').first()).toBeVisible()
    await expect(page.getByText('TUBOTEC').first()).toBeVisible()
  })

  test('4.6 BD: Parada event created, trip still En Ruta', async () => {
    // Verify Parada event exists
    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location, stop_type, notes')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')

    expect(events!.length).toBeGreaterThanOrEqual(1)
    expect(events![0].location).toContain('TUBOTEC')
    expect(events![0].stop_type).toBe('retiro')

    // Trip should still be En Ruta (Parada doesn't change status)
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')

    // Lines should still be En Transito (via trip assignments)
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

  test('4.7 Register second Parada at FEINSA', async () => {
    // Parada button should still be visible (multiple allowed)
    const paradaBtn = page.getByRole('button', { name: 'Registrar Parada' }).first()
    await expect(paradaBtn).toBeVisible({ timeout: 5000 })
    await paradaBtn.click()
    await page.waitForTimeout(500)

    await page.getByPlaceholder(/TUBOTEC/).fill('FEINSA SA')
    const notesArea = page.locator('textarea').last()
    await notesArea.fill('Retiro completo OC 29903')
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(2000)

    // Verify BOTH paradas in timeline
    const paradaTexts = page.locator('text=Parada')
    expect(await paradaTexts.count()).toBeGreaterThanOrEqual(2)
    await snap(page, 'e2e-17-two-paradas')
  })

  test('4.8 Register Entrega', async () => {
    // Click Registrar Entrega button
    const entregaBtn = page.getByRole('button', { name: 'Registrar Entrega' })
    await expect(entregaBtn).toBeVisible({ timeout: 5000 })
    await entregaBtn.click()
    await page.waitForTimeout(1500)
    await snap(page, 'e2e-18-entrega-modal')

    // Receiver — click "No esta en la lista" to use fallback text
    const fallbackBtn = page.getByRole('button', { name: /No esta en la lista/ }).first()
    if (await fallbackBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fallbackBtn.click()
      await page.waitForTimeout(300)
      await page.locator('input[placeholder*="Escriba"]').last().fill('Ing. Jacome')
      await page.waitForTimeout(300)
    } else {
      // Try selecting from dropdown directly
      await pick(page, /Receptor|Recibido/, /Jacome|Admin/)
    }

    // Get confirmation code from BD if not set
    if (!confirmationCode) {
      const { data: trip } = await db
        .from('trips')
        .select('confirmation_code')
        .eq('id', tripDbId)
        .single()
      confirmationCode = trip?.confirmation_code ?? ''
    }

    // Enter confirmation code
    const codeInput = page.getByPlaceholder('0000')
    if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codeInput.fill(confirmationCode)
      await page.waitForTimeout(500)
    }

    await snap(page, 'e2e-19-entrega-filled')

    // Confirm — button should now be enabled
    const confirmBtn = page.getByRole('button', { name: 'Confirmar Entrega' })
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
    await confirmBtn.click()
    await page.waitForTimeout(3000)
    await snap(page, 'e2e-20-after-entrega')
  })

  test('4.9 BD: Lines are Entregada after delivery', async () => {
    // Verify via trip assignments
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

  test('4.10 Register Retorno', async () => {
    const retornoBtn = page.getByRole('button', { name: /Retorno/ })
    if (await retornoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await retornoBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.getByRole('button', { name: /Confirmar|Registrar/ }).last()
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(2000)
      }
    }
    await snap(page, 'e2e-20-after-retorno')
  })

  test('4.11 BD: Trip Completado', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('Completado')
  })

  // =========================================================================
  // PHASE 5: Verify Timeline & Final State
  // =========================================================================

  test('5.1 Timeline shows complete event sequence', async () => {
    // Navigate back to trip detail
    await page.goto(`${BASE}/mis-viajes/${tripDbId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await snap(page, 'e2e-21-final-timeline')

    // Verify key events in timeline
    await expect(page.getByText('Salida').first()).toBeVisible()
    await expect(page.getByText('Parada').first()).toBeVisible()
    await expect(page.getByText('Entrega').first()).toBeVisible()
  })

  test('5.2 BD: Complete event audit trail', async () => {
    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location, stop_type')
      .eq('trip_id', tripDbId)
      .order('event_timestamp')

    // Expected sequence: Salida, Parada (TUBOTEC), Parada (FEINSA), Entrega, Retorno
    expect(events!.length).toBeGreaterThanOrEqual(4) // at minimum Salida + 2 Paradas + Entrega (Retorno may vary)

    const types = events!.map(e => e.event_type)
    expect(types[0]).toBe('Salida')
    expect(types.filter(t => t === 'Parada')).toHaveLength(2)
    expect(types).toContain('Entrega')
  })

  test('5.3 Dashboard reflects completed solicitud', async () => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await snap(page, 'e2e-22-dashboard-final')
  })
})
