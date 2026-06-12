/**
 * BL-EXCLUSIVITY — línea en 3 fulfillments simultáneos.
 *
 * Hipótesis del BACKLOG:
 *   sm_request_lines puede tener entradas en trip_line_assignments +
 *   pickup_order_lines + external_order_lines. NO hay CHECK constraint que
 *   lo impida. Recalc cuenta cantidades 3 veces si alguna validación falla.
 *
 * Verificación:
 *   1. Crear línea qty=10
 *   2. Asignar a TLA qty=4
 *   3. Asignar a POL qty=4
 *   4. Asignar a EOL qty=4
 *   5. Verificar si BD acepta o rechaza (qty_invariant CHECK debería atrapar)
 *   6. Si acepta: snapshot línea — qty_scheduled puede ser 12 > quantity (10)
 */

import { db, getOneProject, getOnePerson, getOneRate, getOneCostCode,
  createSolicitud, addLine, advanceSolicitud, createTrip, addAssignment,
  snapshot, cleanup } from './setup'

async function main() {
  console.log('=========================================')
  console.log('BL-EXCLUSIVITY — línea en 3 fulfillments')
  console.log('=========================================')

  const projectId = await getOneProject()
  const person = await getOnePerson()
  const rateId = await getOneRate()
  const { costCodeId, categoryId } = await getOneCostCode(projectId)

  const requestId = await createSolicitud({ projectId, requesterId: person.id, costCodeId, categoryId, status: 'Borrador' })
  const lineId = await addLine({ requestId, qty: 10, description: 'BL-EXCLUSIVITY' })
  await advanceSolicitud(requestId, 'Enviada')

  await snapshot('pre — solo línea, sin asignaciones', { requestId })

  const trip = await createTrip({ rateId })
  const tripIds: string[] = [trip.id]
  const pickupIds: string[] = []
  const externalIds: string[] = []

  console.log('\n--- 1. INSERT TLA qty=4 ---')
  try {
    await addAssignment({ tripId: trip.id, requestLineId: lineId, qty: 4 })
    console.log('  TLA OK')
  } catch (err) {
    console.log(`  TLA failed: ${(err as Error).message}`)
  }

  await snapshot('post-TLA', { requestId, tripId: trip.id })

  console.log('\n--- 2. INSERT POL qty=4 ---')
  const today = new Date().toISOString().slice(0, 10)
  const { data: po } = await db.from('pickup_orders').insert({
    status: 'Aprobado',
    approved_by: person.id,
    approved_at: new Date().toISOString(),
    scheduled_date: today,
  }).select('id').single()
  if (po) {
    pickupIds.push(po.id)
    const { error: polErr } = await db.from('pickup_order_lines').insert({
      pickup_order_id: po.id,
      request_line_id: lineId,
      quantity_assigned: 4,
      qty_delivered: 0,
    })
    if (polErr) console.log(`  POL failed: ${polErr.message}`)
    else console.log('  POL OK')
  }

  await snapshot('post-POL', { requestId, tripId: trip.id, pickupOrderId: po?.id ?? undefined })

  console.log('\n--- 3. INSERT EOL qty=4 (total assigned = 12 > qty=10) ---')
  const { data: eo } = await db.from('external_orders').insert({
    status: 'Aprobado',
    approved_by: person.id,
    approved_at: new Date().toISOString(),
    scheduled_date: today,
    provider_name: 'TestProvider',
    invoice_amount: 100,
    invoice_attachments: [{ url: 'test', name: 'test', size: 0, type: 'pdf' }],
  }).select('id').single()
  if (eo) {
    externalIds.push(eo.id)
    const { error: eolErr } = await db.from('external_order_lines').insert({
      external_order_id: eo.id,
      request_line_id: lineId,
      quantity_assigned: 4,
      qty_delivered: 0,
    })
    if (eolErr) {
      console.log(`  EOL failed: ${eolErr.message}`)
      console.log('  ✓ BD bloqueó (probably qty_invariant CHECK)')
    } else {
      console.log('  EOL OK — BD aceptó 12>10')
    }
  }

  await snapshot('post-EOL', { requestId, tripId: trip.id, pickupOrderId: po?.id ?? undefined, externalOrderId: eo?.id ?? undefined })

  // Análisis final
  const { data: finalLine } = await db.from('sm_request_lines')
    .select('quantity, qty_scheduled, qty_delivered, status').eq('id', lineId).single()
  console.log('\n=== ANÁLISIS ===')
  console.log(`  Línea: quantity=${finalLine?.quantity}, qty_scheduled=${finalLine?.qty_scheduled}, qty_delivered=${finalLine?.qty_delivered}, status=${finalLine?.status}`)

  if (Number(finalLine?.qty_scheduled) > Number(finalLine?.quantity)) {
    console.log(`  ❌ INVARIANTE ROTA: qty_scheduled=${finalLine?.qty_scheduled} > quantity=${finalLine?.quantity}`)
  } else if (Number(finalLine?.qty_scheduled) === Number(finalLine?.quantity)) {
    console.log('  ✓ qty_scheduled = quantity (BD bloqueó la última inserción)')
  } else {
    console.log(`  ⚠ qty_scheduled=${finalLine?.qty_scheduled} < quantity=${finalLine?.quantity}`)
  }

  await cleanup({ requestId, tripIds, pickupOrderIds: pickupIds, externalOrderIds: externalIds })
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
