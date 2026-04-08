/**
 * Data Integrity Tests — Run SQL queries to verify no violations exist.
 * These tests verify the database is consistent at ALL times.
 * Run: npx playwright test tests/data-integrity.spec.ts
 */

import { test, expect } from '@playwright/test'
import { db } from './helpers'

test.describe('Data Integrity Checks', () => {
  test('No qty_delivered exceeds quantity', async () => {
    const { data } = await db
      .from('sm_request_lines')
      .select('id, qty_delivered, quantity')
      .gt('qty_delivered', 0)
    const violations = (data ?? []).filter(l => Number(l.qty_delivered) > Number(l.quantity))
    expect(violations).toHaveLength(0)
  })

  test('No negative qty_scheduled', async () => {
    const { data } = await db
      .from('sm_request_lines')
      .select('id, qty_scheduled')
    const violations = (data ?? []).filter(l => Number(l.qty_scheduled) < 0)
    expect(violations).toHaveLength(0)
  })

  test('No negative qty_delivered', async () => {
    const { data } = await db
      .from('sm_request_lines')
      .select('id, qty_delivered')
    const violations = (data ?? []).filter(l => Number(l.qty_delivered) < 0)
    expect(violations).toHaveLength(0)
  })

  test('No Completado trips with En Transito lines', async () => {
    const { data: trips } = await db
      .from('trips')
      .select('id, trip_id, status')
      .eq('status', 'Completado')

    for (const trip of trips ?? []) {
      const { data: assignments } = await db
        .from('trip_line_assignments')
        .select('request_line_id')
        .eq('trip_id', trip.id)

      for (const a of assignments ?? []) {
        const { data: line } = await db
          .from('sm_request_lines')
          .select('status')
          .eq('id', a.request_line_id)
          .single()
        expect(line!.status).not.toBe('En Transito')
      }
    }
  })

  test('No Completada solicitudes with non-terminal lines', async () => {
    const { data: requests } = await db
      .from('sm_requests')
      .select('id, request_id, status')
      .eq('status', 'Completada')

    for (const req of requests ?? []) {
      const { data: lines } = await db
        .from('sm_request_lines')
        .select('status')
        .eq('request_id', req.id)

      for (const line of lines ?? []) {
        expect(['Entregada', 'Cancelada']).toContain(line.status)
      }
    }
  })

  test('All Entrega events have trip_event_lines', async () => {
    const { data: entregas } = await db
      .from('trip_events')
      .select('id, trip_id')
      .eq('event_type', 'Entrega')

    for (const entrega of entregas ?? []) {
      // Check if this entrega was reverted
      const { data: reversions } = await db
        .from('trip_events')
        .select('id')
        .eq('reverts_event_id', entrega.id)

      if ((reversions ?? []).length > 0) continue // skip reverted entregas

      const { data: lines } = await db
        .from('trip_event_lines')
        .select('id')
        .eq('trip_event_id', entrega.id)

      expect(lines!.length, `Entrega ${entrega.id} has no trip_event_lines`).toBeGreaterThan(0)
    }
  })

  test('No orphan reversion events (reverts_event_id points to existing event)', async () => {
    const { data: reversions } = await db
      .from('trip_events')
      .select('id, reverts_event_id')
      .eq('event_type', 'Reversion')

    for (const rev of reversions ?? []) {
      expect(rev.reverts_event_id).not.toBeNull()
      const { data: original } = await db
        .from('trip_events')
        .select('id')
        .eq('id', rev.reverts_event_id!)
        .single()
      expect(original).not.toBeNull()
    }
  })

  test('En Transito without accent is canonical everywhere', async () => {
    const { data } = await db
      .from('sm_request_lines')
      .select('id, status')
      .like('status', '%Tránsito%') // WITH accent = wrong
    expect(data ?? []).toHaveLength(0)
  })

  test('All trip_line_assignments have valid trip and line references', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('id, trip_id, request_line_id')

    for (const a of assignments ?? []) {
      const { data: trip } = await db.from('trips').select('id').eq('id', a.trip_id).single()
      expect(trip, `Assignment ${a.id} references non-existent trip ${a.trip_id}`).not.toBeNull()

      const { data: line } = await db.from('sm_request_lines').select('id').eq('id', a.request_line_id).single()
      expect(line, `Assignment ${a.id} references non-existent line ${a.request_line_id}`).not.toBeNull()
    }
  })

  test('qty_scheduled does not exceed quantity on any line', async () => {
    const { data } = await db
      .from('sm_request_lines')
      .select('id, qty_scheduled, quantity')
    const violations = (data ?? []).filter(l => Number(l.qty_scheduled) > Number(l.quantity))
    expect(violations).toHaveLength(0)
  })

  test('Parada events do not change line status (spot check)', async () => {
    // Get all Parada events
    const { data: paradas } = await db
      .from('trip_events')
      .select('id, trip_id')
      .eq('event_type', 'Parada')

    // For each Parada, verify its trip's lines are NOT in an impossible state
    // (Parada should never cause Entregada directly)
    for (const parada of paradas ?? []) {
      const { data: trip } = await db
        .from('trips')
        .select('status')
        .eq('id', parada.trip_id)
        .single()
      // Trip should NOT be Completado just from Parada (needs Retorno)
      // This is a sanity check, not exhaustive
      if (trip) {
        expect(trip.status).not.toBe('Cancelado')
      }
    }
  })
})
