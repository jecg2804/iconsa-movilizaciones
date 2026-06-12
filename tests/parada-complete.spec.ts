/**
 * Parada (Intermediate Stop) Tests — Cambio 1 redesign.
 * Cubre: dropdown poblado y filtrado, free-text "Otra", 3 validaciones
 * bloqueantes, happy paths con dropdown y con free-text.
 *
 * Run: npx playwright test tests/parada-complete.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import {
  db,
  login,
  createSolicitud,
  createTrip,
  openTripDetail,
  dispatch,
  registerParada,
  cleanupSolicitud,
} from './helpers'

const FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')

test.describe.serial('Parada Intermediate Stop (Cambio 1 redesign)', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let lineIdsByDescription: Record<string, string> = {}

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    // Solicitud con 2 líneas: una con from='TUBOTEC' (free-text proveedor),
    // otra con from=Taller Chilibre (location_type='taller', filtrada del dropdown).
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: 'TEST-PARADA Tubos PVC',
          from: 'TUBOTEC SA',
          to: { dropdown: /Muelle 14/ },
          quantity: 100,
          unit: /und/,
        },
        {
          type: 'Equipo',
          equipmentSearch: 'AND',
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
        },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    await openTripDetail(page, tripDbId)
    await dispatch(page)

    // Cargar lineIds desde BD para usarlos en helpers
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('id, description')
      .eq('request_id', solicitudId)
    lineIdsByDescription = (lines ?? []).reduce<Record<string, string>>((acc, l) => {
      acc[l.description] = l.id
      return acc
    }, {})
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  // --- Dropdown contents ---

  test('Dropdown del modal Parada se puebla de las líneas del trip y filtra proyecto/taller', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    const select = page.locator('#parada-location-select')
    const options = await select.locator('option').allTextContents()

    // 'TUBOTEC SA' es from_text de la línea Material con location_type=null → pasa
    expect(options.some(o => o.includes('TUBOTEC SA'))).toBe(true)

    // 'Muelle 14' es to_location.name con location_type='proyecto' → filtrado
    expect(options.some(o => o.includes('Muelle 14'))).toBe(false)

    // 'Taller Chilibre' es from_location.name con location_type='taller' → filtrado
    expect(options.some(o => o.includes('Taller Chilibre'))).toBe(false)

    // Última opción debe ser 'Otra ubicación'
    expect(options[options.length - 1]).toContain('Otra ubicación')

    // Cancelar para no interferir con tests siguientes
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  // --- Validaciones bloqueantes ---

  test('Submit bloqueado sin ubicación', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    // Seleccionar línea via data-testid robusto
    const someLineId = lineIdsByDescription['TEST-PARADA Tubos PVC']
    await page.getByTestId(`parada-line-${someLineId}`).check()
    // Subir archivo
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE_FILE)
    await page.waitForTimeout(500)
    // Click submit sin location
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    // Mensaje de error visible
    await expect(page.getByText('La ubicación es requerida.')).toBeVisible()

    // No se creó evento Parada en BD
    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  test('Submit bloqueado sin líneas marcadas', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    // Seleccionar location del dropdown (value exacto = label sin emoji)
    await page.locator('#parada-location-select').selectOption('TUBOTEC SA')
    // Subir archivo
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE_FILE)
    await page.waitForTimeout(500)
    // Click submit sin marcar líneas
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Marcar al menos una línea afectada.')).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  test('Submit bloqueado sin attachment', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    await page.locator('#parada-location-select').selectOption('TUBOTEC SA')
    const someLineId = lineIdsByDescription['TEST-PARADA Tubos PVC']
    await page.getByTestId(`parada-line-${someLineId}`).check()
    // No subir archivo
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Subir al menos un archivo')).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  // --- Happy paths ---

  test('Happy path: Parada con dropdown + 1 línea + 1 attachment', async () => {
    await registerParada(page, {
      location: 'TUBOTEC',
      lineIds: [lineIdsByDescription['TEST-PARADA Tubos PVC']],
      lineStatus: 'parcial',
      filePath: FIXTURE_FILE,
      notes: 'Retiro parcial 35 tubos',
    })

    await expect(page.getByText('Parada').first()).toBeVisible()
    await expect(page.getByText('TUBOTEC').first()).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location, notes')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')

    expect((events ?? []).length).toBeGreaterThanOrEqual(1)
    const parada = events![0]
    expect(parada.location).toContain('TUBOTEC')
    expect(parada.notes).toContain('Retiro parcial')
  })

  test('Happy path: Parada con free-text "Otra ubicación"', async () => {
    await registerParada(page, {
      useOther: true,
      freeText: 'Mini-super La Esquina',
      lineIds: [lineIdsByDescription['TEST-PARADA Tubos PVC']],
      lineStatus: 'completo',
      filePath: FIXTURE_FILE,
      notes: 'Imprevisto en ruta',
    })

    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
      .order('event_timestamp', { ascending: false })

    expect((events ?? [])[0]?.location).toContain('Mini-super La Esquina')
  })

  // --- BD invariants ---

  test('BD: Líneas no cambian status tras Parada (informational)', async () => {
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

  test('BD: Trip sigue En Ruta tras Parada', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')
  })

  test('BD: trip_event_lines registró líneas afectadas', async () => {
    const { data: paradas } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
      .order('event_timestamp')

    expect((paradas ?? []).length).toBeGreaterThanOrEqual(2)
    for (const p of paradas ?? []) {
      const { data: tel } = await db
        .from('trip_event_lines')
        .select('request_line_id, line_status')
        .eq('trip_event_id', p.id)
      expect((tel ?? []).length).toBeGreaterThanOrEqual(1)
    }
  })
})
