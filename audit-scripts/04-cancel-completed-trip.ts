/**
 * F#9 — cancelTrip sin guard contra trip ya cerrado.
 *
 * Hipótesis:
 *   cancelTrip hace UPDATE { status: 'Cancelado' } sin .eq('status', 'Programado'|'En Ruta').
 *   Si trip ya está 'Completado', el UPDATE igual procede y trip pasa de 'Completado' →
 *   'Cancelado'. Trigger trg_recalc_from_trip_status_change dispara y recalcula líneas.
 *   Histórico operacional dañado: ya no podemos distinguir "trip cerró bien" vs
 *   "trip se canceló post-cierre".
 *
 * Verificación:
 *   1. Crear trip + assignment
 *   2. Salida → Entrega completa → Retorno (trip pasa a 'Completado')
 *   3. UPDATE trips status='Cancelado' como hace cancelTrip
 *   4. Verificar trip pasó a 'Cancelado' aunque ya estaba 'Completado'
 *   5. Verificar líneas y TLA post-recalc
 */

import { db, getOneProject, getOnePerson, getOneRate, getOneCostCode,
  createSolicitud, addLine, advanceSolicitud, createTrip, addAssignment,
  dispatch, snapshot, cleanup } from './setup'

async function main() {
  console.log('=========================================')
  console.log('F#9 — cancelTrip sin guard trip Completado')
  console.log('=========================================')

  const projectId = await getOneProject()
  const person = await getOnePerson()
  const rateId = await getOneRate()
  const { costCodeId, categoryId } = await getOneCostCode(projectId)

  const requestId = await createSolicitud({ projectId, requesterId: person.id, costCodeId, categoryId, status: 'Borrador' })
  const lineId = await addLine({ requestId, qty: 5, description: 'F9-test' })
  await advanceSolicitud(requestId, 'Enviada')

  const trip = await createTrip({ rateId })
  await addAssignment({ tripId: trip.id, requestLineId: lineId, qty: 5 })
  await advanceSolicitud(requestId, 'En Proceso')

  await dispatch({ tripId: trip.id, lines: [{ requestLineId: lineId, qtyDispatched: 5 }] })

  // Entrega completa
  const { data: deliveryEvent } = await db.from('trip_events').insert({
    trip_id: trip.id,
    event_type: 'Entrega',
    event_timestamp: new Date().toISOString(),
    received_by_name: 'F9 Receiver',
  }).select('id').single()
  await db.from('trip_event_lines').insert({
    trip_event_id: deliveryEvent!.id,
    request_line_id: lineId,
    quantity: 5,
    line_status: 'ok',
  })

  // Retorno (cierra trip)
  await db.from('trip_events').insert({
    trip_id: trip.id,
    event_type: 'Retorno',
    event_timestamp: new Date().toISOString(),
  })
  await db.from('trips').update({ status: 'Completado' }).eq('id', trip.id)

  await snapshot('post-Retorno (trip Completado)', { requestId, tripId: trip.id })

  // Replicar cancelTrip (UPDATE sin guard de status)
  console.log('\n--- Replicar cancelTrip (UPDATE sin guard de status original) ---')
  const { error: cancelErr } = await db.from('trips')
    .update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel post-Completado',
    })
    .eq('id', trip.id)

  if (cancelErr) {
    console.log(`  UPDATE failed: ${cancelErr.message}`)
  } else {
    console.log('  UPDATE OK — trip cambió status')
  }

  await snapshot('post-cancelTrip (debería seguir Completado)', { requestId, tripId: trip.id })

  // Análisis
  const { data: finalTrip } = await db.from('trips')
    .select('status, cancellation_reason').eq('id', trip.id).single()
  console.log('\n=== ANÁLISIS ===')
  console.log(`  trips.status post-call = ${finalTrip?.status}`)
  console.log(`  cancellation_reason = "${finalTrip?.cancellation_reason}"`)

  if (finalTrip?.status === 'Cancelado') {
    console.log('  ❌ HISTORIAL CORROMPIDO: trip pasó de Completado → Cancelado')
    console.log('  → Ya no podemos distinguir "trip cerró bien" vs "trip se canceló post-cierre"')
    console.log('  → Línea final puede haber pasado de Entregada → Cancelada (ver snapshot)')
  } else if (finalTrip?.status === 'Completado') {
    console.log('  ✓ Trigger BD bloqueó la transición')
  } else {
    console.log(`  ⚠ Estado inesperado: ${finalTrip?.status}`)
  }

  await cleanup({ requestId, tripIds: [trip.id] })
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
