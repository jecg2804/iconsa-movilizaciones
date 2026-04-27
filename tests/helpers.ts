/**
 * Shared test helpers for MovimientOS E2E tests.
 * Every test file imports from here — single source of truth for selectors and utilities.
 */

import { type Page, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

// --- Supabase service client (bypasses RLS for BD verification) ---
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// --- Constants ---
export const BASE = 'http://localhost:3000'
export const ADMIN = { email: 'jcucalon@iconsanet.com', password: 'Frijolin31!' }

// --- Login ---
export async function login(page: Page, creds = ADMIN) {
  await page.goto(`${BASE}/login`)
  await page.waitForTimeout(1000)
  if (page.url().includes('dashboard') || page.url().includes('solicitudes') || page.url().includes('programacion')) {
    return // already logged in
  }
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(creds.email)
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(creds.password)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

// --- Custom Select dropdown interaction ---
export async function pick(page: Page, btnName: string | RegExp, optText: string | RegExp) {
  await page.getByRole('button', { name: btnName }).click()
  await page.waitForTimeout(300)
  const opt = page.getByRole('option', { name: optText })
  if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await opt.click()
  } else {
    const search = page.locator('input[placeholder="Buscar..."]').last()
    if (await search.isVisible().catch(() => false)) {
      await search.fill(typeof optText === 'string' ? optText : '')
      await page.waitForTimeout(500)
      await page.getByRole('option').first().click()
    }
  }
  await page.waitForTimeout(300)
}

// --- Use fallback text input (for locations/equipment not in dropdown) ---
export async function pickFallback(page: Page, value: string) {
  await page.getByRole('button', { name: /No esta en la lista/ }).first().click()
  await page.locator('input[placeholder*="Escriba"]').last().fill(value)
  await page.waitForTimeout(200)
}

// --- Screenshot helper ---
export async function snap(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png` })
}

// --- Create a solicitud with N lines and return the DB ID ---
export async function createSolicitud(
  page: Page,
  opts: {
    project?: RegExp
    date?: string
    lines: Array<{
      type: 'Equipo' | 'Material'
      equipmentSearch?: string
      description?: string
      from: string | { dropdown: RegExp }
      to: string | { dropdown: RegExp }
      quantity?: number
      unit?: RegExp
    }>
    send?: boolean // default true — send the solicitud (Borrador → Enviada)
  },
): Promise<{ dbId: string; displayId: string }> {
  await page.goto(`${BASE}/solicitudes/nueva`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Select project
  await pick(page, /Proyecto/, opts.project ?? /Muelle 14/)

  // Set date
  await page.getByRole('textbox', { name: 'Fecha Requerida' }).fill(opts.date ?? '2026-04-15')

  // Add each line
  for (const line of opts.lines) {
    const addBtn = page.getByRole('button', { name: /Agregar Linea/ }).first()
    await expect(addBtn).toBeVisible({ timeout: 5000 })
    await addBtn.click()
    await page.waitForTimeout(800)

    // Type toggle
    if (line.type === 'Material') {
      await page.getByRole('button', { name: 'Material' }).click()
      await page.waitForTimeout(300)
    }

    // Equipment (for Equipo type)
    if (line.type === 'Equipo' && line.equipmentSearch) {
      await page.locator('button', { hasText: 'Buscar equipo...' }).click()
      await page.locator('input[placeholder="Buscar..."]').last().fill(line.equipmentSearch)
      await page.waitForTimeout(800)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(300)
    }

    // Description (for Material type)
    if (line.type === 'Material' && line.description) {
      await page.getByRole('textbox', { name: /Descripcion del material/ }).fill(line.description)
    }

    // From location
    if (typeof line.from === 'string') {
      // Fallback text
      await page.getByText('No esta en la lista').first().click()
      await page.locator('input[placeholder*="Escriba"]').last().fill(line.from)
    } else {
      await pick(page, 'Desde', line.from.dropdown)
    }

    // To location
    if (typeof line.to === 'string') {
      // Need to find the "No esta en la lista" for the "to" field
      const fallbacks = page.getByText('No esta en la lista')
      if (await fallbacks.nth(1).isVisible().catch(() => false)) {
        await fallbacks.nth(1).click()
      } else {
        await fallbacks.first().click()
      }
      await page.locator('input[placeholder*="Escriba"]').last().fill(line.to)
    } else {
      await pick(page, 'Hasta', line.to.dropdown)
    }

    // Quantity
    if (line.quantity) {
      await page.getByRole('spinbutton', { name: /Cantidad/ }).fill(String(line.quantity))
    }

    // Unit
    if (line.unit) {
      await pick(page, 'Unidad', line.unit)
    }

    // Save line
    await page.getByRole('button', { name: /Guardar Linea/ }).click()
    await page.waitForTimeout(1500)

    // Handle duplicate warning
    const continueBtn = page.getByRole('button', { name: /Continuar de todas formas/ })
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.scrollIntoViewIfNeeded()
      await continueBtn.click()
      await page.waitForTimeout(1500)
    }
  }

  // Send or save as draft
  const send = opts.send !== false
  if (send) {
    await page.getByRole('button', { name: /Enviar Solicitud/ }).click()
  } else {
    await page.getByRole('button', { name: /Guardar Borrador/ }).click()
  }
  await page.waitForTimeout(2000)

  // Get DB ID — find by unique description tag in lines
  const firstLineDesc = opts.lines[0].description ?? opts.lines[0].equipmentSearch ?? ''
  let data: { id: string; request_id: string } | null = null

  if (firstLineDesc) {
    // Find solicitud via its first line's description (unique per test)
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('request_id')
      .ilike('description', `%${firstLineDesc}%`)
      .order('created_at', { ascending: false })
      .limit(1)

    if (lines && lines.length > 0) {
      const { data: req } = await db
        .from('sm_requests')
        .select('id, request_id')
        .eq('id', lines[0].request_id)
        .single()
      data = req
    }
  }

  // Fallback to most recent
  if (!data) {
    const { data: recent } = await db
      .from('sm_requests')
      .select('id, request_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    data = recent
  }

  return { dbId: data?.id ?? '', displayId: data?.request_id ?? '' }
}

// --- Create a trip from backlog lines and return the DB ID ---
export async function createTrip(
  page: Page,
  opts?: {
    isPickup?: boolean
    conductor?: RegExp
    vehicle?: RegExp
    date?: string
    lineCount?: number // how many lines to add (default: all available)
    solicitudId?: string // if provided, find trip linked to this solicitud (prevents data collision)
  },
): Promise<{ dbId: string; displayId: string; confirmationCode: string }> {
  await page.goto(`${BASE}/programacion`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Select lines from backlog
  const checkboxes = page.locator('input[type="checkbox"]')
  const count = await checkboxes.count()
  const maxLines = opts?.lineCount ?? count
  for (let i = 0; i < Math.min(count, maxLines); i++) {
    const cb = checkboxes.nth(i)
    if (await cb.isVisible().catch(() => false)) {
      await cb.click()
      await page.waitForTimeout(200)
    }
  }

  // Click programar button
  const programarBtn = page.getByRole('button', { name: /Programar|Nueva Movilización|Crear Movilización/ }).first()
  await expect(programarBtn).toBeVisible({ timeout: 3000 })
  await programarBtn.click()
  await page.waitForURL('**/viaje/nuevo**', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // Wait for form
  await expect(page.getByText('Cargando formulario')).not.toBeVisible({ timeout: 15000 })

  // Toggle pickup checkbox
  const retiroLabel = page.getByText('Retiro en Chilibre')
  if (await retiroLabel.isVisible().catch(() => false)) {
    const retiroCheckbox = page.locator('input[type="checkbox"]').first()
    const isChecked = await retiroCheckbox.isChecked()
    if (opts?.isPickup && !isChecked) {
      await retiroLabel.click()
      await page.waitForTimeout(500)
    } else if (!opts?.isPickup && isChecked) {
      await retiroLabel.click()
      await page.waitForTimeout(500)
    }
  }

  // Date
  await page.locator('input[type="date"]').first().fill(opts?.date ?? '2026-04-15')

  // Conductor
  if (!opts?.isPickup) {
    await pick(page, /Conductor/, opts?.conductor ?? /Rafael|Conductor|Diaz/)
    await pick(page, /Veh/, opts?.vehicle ?? /CAB|VOL|PIC/)
  }

  // Assign lines — click "Agregar" buttons
  await page.waitForTimeout(1000)
  const agregarBtns = page.getByRole('button', { name: 'Agregar' })
  const btnCount = await agregarBtns.count()
  const linesToAdd = opts?.lineCount ?? btnCount
  for (let i = 0; i < Math.min(btnCount, linesToAdd); i++) {
    await agregarBtns.first().click()
    await page.waitForTimeout(500)
  }

  // Save
  const guardarBtn = page.getByRole('button', { name: /Guardar Movilización/ })
  await expect(guardarBtn).toBeEnabled({ timeout: 5000 })
  await guardarBtn.click()
  await page.waitForTimeout(3000)

  // Get trip from BD
  let data: { id: string; trip_id: string; confirmation_code: string | null } | null = null

  // If solicitudId provided, find trip linked to that solicitud's lines
  if (opts?.solicitudId) {
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('id')
      .eq('request_id', opts.solicitudId)
      .limit(1)
    if (lines && lines.length > 0) {
      const { data: assignment } = await db
        .from('trip_line_assignments')
        .select('trip_id')
        .eq('request_line_id', lines[0].id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (assignment) {
        const { data: trip } = await db
          .from('trips')
          .select('id, trip_id, confirmation_code')
          .eq('id', assignment.trip_id)
          .single()
        data = trip
      }
    }
  }

  // Fallback: most recent Programado trip
  if (!data) {
    const { data: trip } = await db
      .from('trips')
      .select('id, trip_id, confirmation_code')
      .eq('status', 'Programado')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    data = trip
  }

  return {
    dbId: data?.id ?? '',
    displayId: data?.trip_id ?? '',
    confirmationCode: data?.confirmation_code ?? '',
  }
}

// --- Navigate to trip detail in mis-viajes ---
export async function openTripDetail(page: Page, tripDbId: string) {
  await page.goto(`${BASE}/mis-viajes/${tripDbId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

// --- Dispatch (Salida) ---
export async function dispatch(page: Page) {
  const salidaBtn = page.getByRole('button', { name: 'Registrar Salida' })
  await expect(salidaBtn).toBeVisible({ timeout: 10000 })
  await salidaBtn.click()
  await page.waitForTimeout(1500)

  const confirmBtn = page.getByRole('button', { name: 'Confirmar Despacho' })
  await expect(confirmBtn).toBeVisible({ timeout: 5000 })
  await confirmBtn.click()
  await page.waitForTimeout(3000)
}

// --- Register Parada ---
/**
 * Registra una Parada en el trip detail page (Cambio 1 redesign).
 *
 * - Si useOther=true: selecciona "Otra ubicación" y rellena freeText.
 * - Si useOther=false (default): selecciona la opción de location del dropdown
 *   por label regex.
 * - lineIds: ids de líneas a marcar (≥1 requerido por el modal).
 *   Usa data-testid={parada-line-{lineId}} agregado en ParadaModal.
 * - lineStatus: aplicado al primer status select tras la primera línea checkeada
 *   (simplificación — todas las líneas heredan el mismo status si lineStatus se pasa).
 * - filePath: path absoluto a archivo a subir (≥1 requerido).
 * - notes: opcional, notas generales.
 */
export async function registerParada(
  page: Page,
  opts: {
    location?: string
    useOther?: boolean
    freeText?: string
    lineIds: string[]
    lineStatus?: 'completo' | 'parcial' | 'no_disponible'
    filePath: string
    notes?: string
  },
) {
  await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
  await page.waitForTimeout(500)

  // Ubicación
  const locationSelect = page.locator('#parada-location-select')
  if (opts.useOther) {
    await locationSelect.selectOption({ value: '__OTHER__' })
    const freeTextInput = page.locator('input[placeholder="Escriba la ubicación"]')
    await freeTextInput.fill(opts.freeText ?? '')
  } else {
    if (!opts.location) throw new Error('registerParada: location requerido cuando useOther=false')
    // Buscar opción cuyo texto contenga `location` y usar su value (string)
    const optionValue = await locationSelect
      .locator('option')
      .filter({ hasText: opts.location })
      .first()
      .getAttribute('value')
    if (!optionValue) {
      throw new Error(`registerParada: no encontré opción que matchee '${opts.location}'`)
    }
    await locationSelect.selectOption(optionValue)
  }

  // Líneas afectadas — data-testid robusto agregado en ParadaModal Task 4
  for (const lineId of opts.lineIds) {
    await page.getByTestId(`parada-line-${lineId}`).check()
  }

  // Status de línea (aplica al primer line-status select dentro del modal)
  if (opts.lineStatus && opts.lineStatus !== 'completo') {
    const lineStatusSelect = page.getByLabel('Estado de la línea').first()
    await lineStatusSelect.selectOption(opts.lineStatus)
  }

  // Foto de factura
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(opts.filePath)
  await page.waitForTimeout(800)

  // Notas
  if (opts.notes) {
    await page.locator('#parada-notes').fill(opts.notes)
  }

  // Confirm — modal's "Registrar Parada" button (2nd con ese name)
  await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
  await page.waitForTimeout(3000)
}

// --- Register Entrega ---
export async function registerEntrega(
  page: Page,
  opts: { receiverName?: string; confirmationCode?: string },
) {
  const entregaBtn = page.getByRole('button', { name: 'Registrar Entrega' })
  await expect(entregaBtn).toBeVisible({ timeout: 5000 })
  await entregaBtn.click()
  await page.waitForTimeout(1500)

  // Receiver — try fallback text first, then dropdown
  const fallbackLink = page.getByText('No esta en la lista').first()
  if (await fallbackLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fallbackLink.click()
    await page.waitForTimeout(300)
    // Fill the text input that appears after clicking fallback
    const fallbackInput = page.locator('input[placeholder*="Escriba"]').last()
    await fallbackInput.fill(opts.receiverName ?? 'Ing. Test')
    // Trigger change event
    await fallbackInput.press('Tab')
    await page.waitForTimeout(500)
  } else {
    // Try selecting from dropdown
    await pick(page, /Recibido por/, /Admin|Jacome/)
  }

  // Confirmation code (placeholder is "4 dígitos")
  if (opts.confirmationCode) {
    const codeInput = page.getByPlaceholder('4 dígitos')
    if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codeInput.fill(opts.confirmationCode)
      await page.waitForTimeout(500)
    }
  }

  // Confirm
  const confirmBtn = page.getByRole('button', { name: 'Confirmar Entrega' })
  await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
  await confirmBtn.click()
  await page.waitForTimeout(3000)
}

// --- Register Preparación (pickup flow) ---
export async function registerPreparation(page: Page) {
  const prepBtn = page.getByRole('button', { name: 'Registrar Preparación' })
  await expect(prepBtn).toBeVisible({ timeout: 5000 })
  await prepBtn.click()
  await page.waitForTimeout(1500)

  const confirmBtn = page.getByRole('button', { name: 'Material Listo' })
  await expect(confirmBtn).toBeVisible({ timeout: 3000 })
  await confirmBtn.click()
  await page.waitForTimeout(2000)
}

// --- Register Retiro (pickup flow — completa el trip) ---
export async function registerRetiro(
  page: Page,
  opts: { confirmationCode: string },
) {
  // Botón principal del trip cuando es pickup → abre PickupModal
  const retiroBtn = page.getByRole('button', { name: 'Confirmar Retiro' }).first()
  await expect(retiroBtn).toBeVisible({ timeout: 5000 })
  await retiroBtn.click()
  await page.waitForTimeout(1500)

  // Código de confirmación (obligatorio en PickupModal)
  const codeInput = page.getByPlaceholder('4 dígitos')
  await expect(codeInput).toBeVisible({ timeout: 3000 })
  await codeInput.fill(opts.confirmationCode)
  await page.waitForTimeout(500)

  // Confirmar interno del modal
  const confirmBtn = page.getByRole('button', { name: 'Confirmar Retiro' }).last()
  await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
  await confirmBtn.click()
  await page.waitForTimeout(3000)
}

// --- Register Retorno ---
export async function registerRetorno(page: Page) {
  const retornoBtn = page.getByRole('button', { name: /Retorno/ })
  if (await retornoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await retornoBtn.click()
    await page.waitForTimeout(800)

    // Guard dialog aparece si hay líneas En Transito — confirmar primero
    const guardConfirmBtn = page.getByRole('button', { name: 'Sí, registrar Retorno' })
    if (await guardConfirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await guardConfirmBtn.click()
      await page.waitForTimeout(800)
    }

    // EventModal de Retorno
    const confirmBtn = page.getByRole('button', { name: /Confirmar|Registrar/ }).last()
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(2000)
    }
  }
}

// --- Clean up test data by deleting a solicitud and its cascade ---
export async function cleanupSolicitud(solicitudId: string) {
  if (!solicitudId) return
  // Get line IDs
  const { data: lines } = await db
    .from('sm_request_lines')
    .select('id')
    .eq('request_id', solicitudId)
  const lineIds = (lines ?? []).map(l => l.id)

  // Get trip assignments
  if (lineIds.length > 0) {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('trip_id')
      .in('request_line_id', lineIds)
    const tripIds = [...new Set((assignments ?? []).map(a => a.trip_id))]

    // Delete trip data
    for (const tripId of tripIds) {
      await db.from('trip_event_lines').delete().eq('trip_event_id',
        (await db.from('trip_events').select('id').eq('trip_id', tripId)).data?.map(e => e.id) ?? []
      )
      await db.from('trip_events').delete().eq('trip_id', tripId)
      await db.from('trip_line_assignments').delete().eq('trip_id', tripId)
      await db.from('trips').delete().eq('id', tripId)
    }
  }

  // Delete lines and solicitud
  await db.from('sm_request_lines').delete().eq('request_id', solicitudId)
  await db.from('sm_requests').delete().eq('id', solicitudId)
}
