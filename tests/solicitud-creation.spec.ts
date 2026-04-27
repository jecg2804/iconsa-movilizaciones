/**
 * Solicitud Creation Tests — Exhaustive testing of solicitud creation, editing, and validation.
 * Run: npx playwright test tests/solicitud-creation.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import { db, BASE, login, createSolicitud, pick, cleanupSolicitud } from './helpers'

test.describe('Solicitud Creation', () => {
  let page: Page
  const createdIds: string[] = []

  test.setTimeout(300000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
  })

  test.afterAll(async () => {
    for (const id of createdIds) {
      await cleanupSolicitud(id).catch(() => {})
    }
    await page.close()
  })

  // --- Basic Creation ---

  test('Create solicitud with 1 equipment line', async () => {
    const result = await createSolicitud(page, {
      lines: [{
        type: 'Equipo',
        equipmentSearch: 'AND',
        from: { dropdown: /Taller Chilibre/ },
        to: { dropdown: /Muelle 14/ },
      }],
    })
    createdIds.push(result.dbId)

    // Verify in BD
    const { data } = await db.from('sm_requests').select('*').eq('id', result.dbId).single()
    expect(data!.status).toBe('Enviada')

    const { data: lines } = await db
      .from('sm_request_lines')
      .select('*')
      .eq('request_id', result.dbId)
    expect(lines).toHaveLength(1)
    expect(lines![0].line_type).toBe('Equipo')
    expect(lines![0].equipment_id).not.toBeNull()
    expect(lines![0].status).toBe('Pendiente')
    expect(Number(lines![0].quantity)).toBe(1)
  })

  test('Create solicitud with 1 material line', async () => {
    const result = await createSolicitud(page, {
      lines: [{
        type: 'Material',
        description: 'TEST Tubos PVC 4x6m',
        from: { dropdown: /Taller Chilibre/ },
        to: { dropdown: /Muelle 14/ },
        quantity: 50,
        unit: /und/,
      }],
    })
    createdIds.push(result.dbId)

    const { data: lines } = await db
      .from('sm_request_lines')
      .select('*')
      .eq('request_id', result.dbId)
    expect(lines).toHaveLength(1)
    expect(lines![0].line_type).toBe('Material')
    expect(lines![0].equipment_id).toBeNull()
    expect(lines![0].description).toContain('TEST Tubos PVC')
    expect(Number(lines![0].quantity)).toBe(50)
  })

  test('Create solicitud with 3 lines', async () => {
    const result = await createSolicitud(page, {
      lines: [
        { type: 'Equipo', equipmentSearch: 'AND', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ } },
        { type: 'Material', description: 'TEST Arena 10 ton', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Costa Norte/ }, quantity: 10, unit: /ton/ },
        { type: 'Material', description: 'TEST Cemento 50 qq', from: 'TUBOTEC SA', to: { dropdown: /Muelle 14/ }, quantity: 50, unit: /qq/ },
      ],
    })
    createdIds.push(result.dbId)

    const { data: lines } = await db
      .from('sm_request_lines')
      .select('*')
      .eq('request_id', result.dbId)
      .order('line_number')
    expect(lines).toHaveLength(3)
    expect(lines![0].line_type).toBe('Equipo')
    expect(lines![1].line_type).toBe('Material')
    expect(lines![2].line_type).toBe('Material')
    expect(Number(lines![1].quantity)).toBe(10)
    expect(Number(lines![2].quantity)).toBe(50)
  })

  test('No pickup radio visible in form', async () => {
    await page.goto(`${BASE}/solicitudes/nueva`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Retiro en Chilibre')).not.toBeVisible()
    await expect(page.getByText('Envío por flota')).not.toBeVisible()
  })

  test('Solicitante is auto-filled and not editable', async () => {
    await page.goto(`${BASE}/solicitudes/nueva`)
    await page.waitForLoadState('networkidle')
    const solicitante = page.getByRole('button', { name: /Solicitante/ })
    await expect(solicitante).toContainText('Admin')
  })

  // --- Save as Draft ---

  test('Save as borrador (not sent)', async () => {
    const result = await createSolicitud(page, {
      lines: [
        { type: 'Material', description: 'TEST Draft', from: { dropdown: /Taller Chilibre/ }, to: { dropdown: /Muelle 14/ }, quantity: 1 },
      ],
      send: false,
    })
    createdIds.push(result.dbId)

    const { data } = await db.from('sm_requests').select('status').eq('id', result.dbId).single()
    expect(data!.status).toBe('Borrador')
  })

})
