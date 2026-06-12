/**
 * Verifica estado de BD staging post-audit. Confirmación de cleanup completo.
 */

import { db } from './setup'

const tables = [
  'sm_requests', 'sm_request_lines', 'trips', 'trip_line_assignments',
  'trip_events', 'trip_event_lines', 'delivery_observations',
  'pickup_orders', 'pickup_order_lines', 'external_orders', 'external_order_lines',
]

async function main() {
  console.log('=== BD staging state post-audit ===')
  for (const t of tables) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true })
    if (error) console.log(`${t}: ERROR ${error.message}`)
    else console.log(`${t}: ${count}`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
