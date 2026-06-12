/**
 * F#2 — removeLineFromPickupOrder sin guard qty_delivered>0.
 *
 * Hipótesis:
 *   El hook DELETE sin chequear qty_delivered. Si línea ya tiene entrega parcial
 *   en el pickup (caso edge: completePickupOrder seteo qty_delivered y después
 *   alguien quiere remover una línea), el DELETE silenciosamente elimina la
 *   línea, qty_delivered desaparece de cuenta, recalc dispara, sm_request_lines
 *   .qty_delivered baja.
 *
 * Verificación:
 *   1. Crear solicitud + línea qty=10
 *   2. Crear pickup_order con la línea (POL.quantity_assigned=10)
 *   3. Snapshot pre: sm_request_lines qty_scheduled=10, qty_delivered=0
 *   4. Forzar POL.qty_delivered=5 (simular completePickupOrder parcial — aunque
 *      el hook actual hace todo-o-nada, BD lo permite si el FE lo set parcial)
 *   5. Snapshot post-deliver: sm_request_lines.qty_delivered=5
 *   6. DELETE POL via hook removeLineFromPickupOrder (sin guard)
 *   7. Snapshot post-DELETE
 *   8. Verificar qty_delivered de la línea baja a 0
 */

import { db, getOneProject, getOnePerson, getOneRate, getOneCostCode,
  createSolicitud, addLine, advanceSolicitud, snapshot, cleanup } from './setup'

async function main() {
  console.log('=========================================')
  console.log('F#2 — removeLine sin guard qty_delivered>0')
  console.log('=========================================')

  const projectId = await getOneProject()
  const person = await getOnePerson()
  await getOneRate()
  const { costCodeId, categoryId } = await getOneCostCode(projectId)

  const requestId = await createSolicitud({ projectId, requesterId: person.id, costCodeId, categoryId, status: 'Borrador' })
  const lineId = await addLine({ requestId, qty: 10, description: 'F2-test' })
  await advanceSolicitud(requestId, 'Enviada')

  // Crear pickup_order
  const today = new Date().toISOString().slice(0, 10)
  const { data: po, error: poErr } = await db.from('pickup_orders').insert({
    status: 'Aprobado',
    approved_by: person.id,
    approved_at: new Date().toISOString(),
    scheduled_date: today,
  }).select('id').single()
  if (poErr || !po) throw new Error(`pickup_orders insert: ${poErr?.message}`)

  const { data: pol, error: polErr } = await db.from('pickup_order_lines').insert({
    pickup_order_id: po.id,
    request_line_id: lineId,
    quantity_assigned: 10,
    qty_delivered: 0,
  }).select('id').single()
  if (polErr || !pol) throw new Error(`pickup_order_lines insert: ${polErr?.message}`)

  await snapshot('pre — POL recién creado', { requestId, pickupOrderId: po.id })

  // Forzar POL.qty_delivered=5 (simular parcial — aunque hook hace todo-o-nada,
  // verificamos comportamiento BD si el qty_delivered termina con valor)
  console.log('\n--- UPDATE POL.qty_delivered=5 (simular delivery parcial) ---')
  await db.from('pickup_order_lines').update({ qty_delivered: 5 }).eq('id', pol.id)

  await snapshot('post-UPDATE qty_delivered=5', { requestId, pickupOrderId: po.id })

  // DELETE POL — replicar lógica de removeLineFromPickupOrder (sin guard)
  console.log('\n--- DELETE POL (replicar removeLineFromPickupOrder hook) ---')
  const { error: delErr } = await db.from('pickup_order_lines').delete().eq('id', pol.id)
  if (delErr) console.log(`  DELETE failed: ${delErr.message}`)
  else console.log('  DELETE OK')

  await snapshot('post-DELETE POL', { requestId, pickupOrderId: po.id })

  // Análisis
  const { data: finalLine } = await db.from('sm_request_lines')
    .select('status, qty_delivered, qty_scheduled').eq('id', lineId).single()

  console.log('\n=== ANÁLISIS ===')
  console.log(`  Línea final: status=${finalLine?.status}, qty_delivered=${finalLine?.qty_delivered}, qty_scheduled=${finalLine?.qty_scheduled}`)

  if (Number(finalLine?.qty_delivered) === 0 && Number(finalLine?.qty_scheduled) === 0) {
    console.log('  ❌ DATA LOSS: qty_delivered=5 desapareció post-DELETE.')
    console.log('  → Si esto fue una entrega real, el récord operacional se perdió.')
    console.log('  → audit_log puede tener trace pero la UI no la muestra.')
  } else if (Number(finalLine?.qty_delivered) === 5) {
    console.log('  ✓ qty_delivered preservado — trigger BD compensó')
  } else {
    console.log(`  ⚠ Estado inesperado: qty_delivered=${finalLine?.qty_delivered}, qty_scheduled=${finalLine?.qty_scheduled}`)
  }

  await cleanup({ requestId, pickupOrderIds: [po.id] })
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
