import { notifyAlertaDiariaUrgentes } from '@/lib/notifications/actions'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Solo aceptar Bearer token (Vercel cron lo envía automáticamente)
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await notifyAlertaDiariaUrgentes()
  return NextResponse.json({ ok: true })
}
