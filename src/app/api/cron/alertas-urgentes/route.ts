import { notifyAlertaDiariaUrgentes } from '@/lib/notifications/actions'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Check Bearer token (Vercel cron sends this automatically)
  const authHeader = request.headers.get('authorization') || ''
  const headerMatch = authHeader === `Bearer ${cronSecret}`

  // Fallback: check query param for manual testing
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret') || ''
  const queryMatch = querySecret === cronSecret

  if (!headerMatch && !queryMatch) {
    console.error('[Cron] Auth failed. Header present:', !!authHeader, 'Query present:', !!querySecret)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await notifyAlertaDiariaUrgentes()
  return NextResponse.json({ ok: true })
}
