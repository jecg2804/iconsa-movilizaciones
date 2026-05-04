/**
 * F#13 — cancelSolicitud cuando hay trip En Ruta + línea En Transito.
 *
 * Hipótesis:
 *   El paso 4 de cancelSolicitud solo elimina TLAs de líneas 'Programada'.
 *   Líneas 'En Transito' quedan con TLA activo en trip 'En Ruta', pero la
 *   línea pasa a 'Cancelada'. Si el conductor entrega físicamente después,
 *   el trigger BD-5 sube qty_delivered en TLA. El trigger BD-4 recalc tiene
 *   branch defensivo "preserve Cancelada". Drift: TLA dice "entregado", línea
 *   dice "Cancelada".
 *
 * Verificación:
 *   1. Crear solicitud con 1 línea, qty=10
 *   2. Trip + assignment qty=10
 *   3. Dispatch (Salida) → línea 'En Transito'
 *   4. cancelSolicitud (replicar lógica del hook): cancela líneas 'En Transito'
 *      a 'Cancelada' SIN borrar TLA
 *   5. Snapshot post-cancel
 *   6. INSERT trip_event Entrega + trip_event_lines (simular conductor entrega)
 *   7. Snapshot post-Entrega
 *   8. Verificar drift TLA vs línea
 */

import { db, getOneProject, getOnePerson, getOneRate, getOneCostCode,
  createSolicitud, addLine, advanceSolicitud, createTrip, addAssignment,
  dispatch, snapshot, cleanup } from './setup'

async function main() {
  console.log('=========================================')
  console.log('F#13 — cancel solicitud con trip En Ruta')
  console.log('=========================================')

  const projectId = await getOneProject()
  const person = await getOnePerson()
  const rateId = await getOneRate()
  const { costCodeId, categoryId } = await getOneCostCode(projectId)

  const requestId = await createSolicitud({ projectId, requesterId: person.id, costCodeId, categoryId, status: 'Borrador' })
  const lineId = await addLine({ requestId, qty: 10, description: 'F13-test' })
  await advanceSolicitud(requestId, 'Enviada')

  const trip = await createTrip({ rateId })
  await addAssignment({ tripId: trip.id, requestLineId: lineId, qty: 10 })
  await advanceSolicitud(requestId, 'En Proceso')

  await dispatch({ tripId: trip.id, lines: [{ requestLineId: lineId, qtyDispatched: 10 }] })

  await snapshot('post-Salida (línea En Transito)', { requestId, tripId: trip.id })

  // Replicar cancelSolicitud paso 4 + 5 + 6 (sin tocar TLA porque línea no es 'Programada')
  console.log('\n--- Ejecutando cancelSolicitud (replicado del hook) ---')
  console.log('  Paso 4: SKIP DELETE TLA (línea es En Transito, no Programada)')
  console.log('  Paso 5: UPDATE línea status=Cancelada')
  await db.from('sm_request_lines').update({ status: 'Cancelada' }).eq('id', lineId)
  console.log('  Paso 6: UPDATE solicitud status=Cancelada')
  await db.from('sm_requests').update({ status: 'Cancelada' }).eq('id', requestId)

  await snapshot('post-cancelSolicitud', { requestId, tripId: trip.id })

  // Simular conductor entrega físicamente (INSERT trip_event Entrega + lines)
  console.log('\n--- Simulando conductor entrega físicamente ---')
  const { data: event } = await db.from('trip_events').insert({
    trip_id: trip.id,
    event_type: 'Entrega',
    event_timestamp: new Date().toISOString(),
    received_by_name: 'Test Receiver',
  }).select('id').single()

  if (!event) throw new Error('Event insert failed')

  const { error: telErr } = await db.from('trip_event_lines').insert({
    trip_event_id: event.id,
    request_line_id: lineId,
    quantity: 10,
    line_status: 'ok',
  })

  if (telErr) {
    console.log(`  TEL INSERT failed: ${telErr.message}`)
    console.log('  ✓ BD blocked the delivery — buena defensa')
  } else {
    console.log('  TEL INSERT OK — trigger BD-5 disparó')
  }

  await snapshot('post-Entrega físicamente', { requestId, tripId: trip.id })

  // Análisis del drift
  const { data: finalLine } = await db.from('sm_request_lines')
    .select('status, qty_delivered, qty_scheduled').eq('id', lineId).single()
  const { data: finalTla } = await db.from('trip_line_assignments')
    .select('qty_delivered, qty_rejected').eq('trip_id', trip.id).eq('request_line_id', lineId).single()

  console.log('\n=== ANÁLISIS DEL DRIFT ===')
  console.log(`  Línea: status=${finalLine?.status}, qty_delivered=${finalLine?.qty_delivered}, qty_scheduled=${finalLine?.qty_scheduled}`)
  console.log(`  TLA: qty_delivered=${finalTla?.qty_delivered}, qty_rejected=${finalTla?.qty_rejected}`)

  if (finalLine?.status === 'Cancelada' && Number(finalTla?.qty_delivered) > 0) {
    console.log('  ❌ DRIFT CONFIRMADO: línea Cancelada con TLA.qty_delivered > 0')
    console.log('  → Conductor entregó físicamente, BD registra entrega, pero línea queda Cancelada.')
    console.log('  → PM cree que canceló pero el material salió.')
    console.log('  → audit_log debería tener trace pero la UI no mostraría inconsistencia.')
  } else if (finalLine?.status === 'Cancelada' && Number(finalTla?.qty_delivered) === 0) {
    console.log('  ✓ Sin drift: TLA no se actualizó (BD bloqueó la entrega o trigger respeta Cancelada en TLA)')
  } else {
    console.log(`  ⚠ Estado inesperado: línea=${finalLine?.status}, TLA.qty_delivered=${finalTla?.qty_delivered}`)
  }

  await cleanup({ requestId, tripIds: [trip.id] })
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
