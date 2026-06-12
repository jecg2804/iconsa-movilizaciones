/**
 * F#3 — cancelPickupOrder silent failure cuando status != 'Aprobado'.
 *
 * Hipótesis:
 *   El UPDATE tiene .eq('status', 'Aprobado') defensive WHERE. Si el order ya
 *   está 'Entregado' o 'Cancelado', el UPDATE no toca filas pero retorna sin
 *   error. El hook devuelve { ok: true, deliveredCount, deliveredQty }. Usuario
 *   cree que canceló pero no.
 *
 * Verificación:
 *   1. Crear pickup_order con líneas, completar (status='Entregado')
 *   2. Llamar UPDATE como hace cancelPickupOrder
 *   3. Verificar status NO cambió a 'Cancelado'
 *   4. Verificar la respuesta NO indica failure
 */

import { db, getOneProject, getOnePerson, getOneCostCode,
  createSolicitud, addLine, advanceSolicitud, snapshot, cleanup } from './setup'

async function main() {
  console.log('=========================================')
  console.log('F#3 — cancelPickupOrder silent failure')
  console.log('=========================================')

  const projectId = await getOneProject()
  const person = await getOnePerson()
  const { costCodeId, categoryId } = await getOneCostCode(projectId)

  const requestId = await createSolicitud({ projectId, requesterId: person.id, costCodeId, categoryId, status: 'Borrador' })
  const lineId = await addLine({ requestId, qty: 5, description: 'F3-test' })
  await advanceSolicitud(requestId, 'Enviada')

  const today = new Date().toISOString().slice(0, 10)
  const { data: po } = await db.from('pickup_orders').insert({
    status: 'Aprobado',
    approved_by: person.id,
    approved_at: new Date().toISOString(),
    scheduled_date: today,
  }).select('id, pickup_id').single()
  if (!po) throw new Error('po insert failed')

  await db.from('pickup_order_lines').insert({
    pickup_order_id: po.id,
    request_line_id: lineId,
    quantity_assigned: 5,
    qty_delivered: 0,
  })

  await snapshot('pre — order Aprobado', { requestId, pickupOrderId: po.id })

  // Completar el pickup_order (UPDATE qty_delivered + status='Entregado')
  await db.from('pickup_order_lines').update({ qty_delivered: 5 })
    .eq('pickup_order_id', po.id)
  await db.from('pickup_orders').update({
    status: 'Entregado',
    completed_at: new Date().toISOString(),
    completed_by: person.id,
  }).eq('id', po.id)

  await snapshot('post-completePickup (status=Entregado)', { requestId, pickupOrderId: po.id })

  // Replicar cancelPickupOrder con order ya en 'Entregado'
  console.log('\n--- Replicar cancelPickupOrder con status=Entregado ---')
  const { data: result, error: cancelErr } = await db.from('pickup_orders')
    .update({
      status: 'Cancelado',
      cancelled_at: new Date().toISOString(),
      cancelled_by: person.id,
      cancellation_reason: 'Test cancel post-Entregado',
    })
    .eq('id', po.id)
    .eq('status', 'Aprobado')
    .select('id')

  console.log(`  UPDATE result: data=${JSON.stringify(result)}, error=${cancelErr?.message ?? 'none'}`)
  console.log(`  data.length = ${result?.length ?? 'null'}`)

  await snapshot('post-cancelPickupOrder (debería seguir Entregado)', { requestId, pickupOrderId: po.id })

  // Análisis: el hook actual NO chequea result.length. Devuelve { ok: true } cuando no hay error.
  console.log('\n=== ANÁLISIS ===')
  const { data: postPO } = await db.from('pickup_orders').select('status').eq('id', po.id).single()
  console.log(`  pickup_orders.status post-call = ${postPO?.status}`)

  if (postPO?.status === 'Entregado' && cancelErr === null) {
    console.log('  ❌ SILENT FAILURE: el UPDATE NO modificó filas (status sigue Entregado)')
    console.log('  → El hook devuelve { ok: true } pero NO canceló')
    console.log('  → UI muestra "cancelado" mientras la BD sigue "Entregado"')
    console.log(`  → result.length=${result?.length} indicaría 0 filas afectadas si lo chequearan`)
  } else {
    console.log(`  ⚠ Estado inesperado: status=${postPO?.status}`)
  }

  await cleanup({ requestId, pickupOrderIds: [po.id] })
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
