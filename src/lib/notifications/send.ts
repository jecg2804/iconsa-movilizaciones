'use server'

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

// TEST MODE: cuando está seteado, TODOS los emails van a esta dirección
const TEST_EMAIL = process.env.NOTIFICATION_TEST_EMAIL

// FROM address — usa onboarding@resend.dev hasta verificar dominio
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'MovimientOS <onboarding@resend.dev>'

interface NotificationRecipient {
  id: string
  email: string | null
  name: string
}

interface SendResult {
  sent: number
  skipped: number
  failed: number
}

export async function sendNotification(params: {
  eventType: string
  referenceType: 'sm_request' | 'trip' | 'suggestion'
  referenceId: string
  recipients: NotificationRecipient[]
  subject: string
  html: string
  data?: Record<string, unknown>
}): Promise<SendResult> {
  const supabase = createServiceClient()
  let sent = 0, skipped = 0, failed = 0

  if (params.recipients.length === 0) {
    console.warn(`[Notification] WARNING: 0 recipients for event "${params.eventType}" ref=${params.referenceId}. No emails will be sent.`)
    return { sent, skipped, failed }
  }

  console.log(`[Notification] ${params.eventType}: sending to ${params.recipients.length} recipient(s)`)

  // Filtrar recipients por notification_preferences
  const recipientIds = params.recipients.map(r => r.id)
  const { data: prefsData } = await supabase
    .from('people')
    .select('id, notification_preferences')
    .in('id', recipientIds)

  const prefsMap = new Map(
    (prefsData ?? []).map(p => [p.id, p.notification_preferences as Record<string, boolean> | null])
  )

  const eligibleRecipients = params.recipients.filter(r => {
    const prefs = prefsMap.get(r.id)
    if (!prefs || Object.keys(prefs).length === 0) return true // Legacy — no prefs, send
    if (prefs.receive_all === true) return true
    // Si el eventType no tiene key en prefs, enviar por default
    if (!(params.eventType in prefs)) return true
    return prefs[params.eventType] === true
  })

  console.log(`[Notification] ${params.eventType}: ${eligibleRecipients.length}/${params.recipients.length} eligible after prefs filter`)

  for (const recipient of eligibleRecipients) {
    const targetEmail = TEST_EMAIL ?? recipient.email

    if (!targetEmail) {
      const { error: logErr } = await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: null,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'skipped',
        error_message: 'No email address',
        payload: (params.data ?? {}) as { [key: string]: string | number | boolean | null | undefined },
      })
      if (logErr) console.error('[Notification] Failed to log skip to notification_log:', logErr.message)
      skipped++
      continue
    }

    // DEDUP: skip si mismo evento+recipient enviado en últimos 5 minutos
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('event_type', params.eventType)
      .eq('reference_id', params.referenceId)
      .eq('recipient_id', recipient.id)
      .eq('status', 'sent')
      .gte('created_at', fiveMinAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      skipped++
      continue
    }

    try {
      const subject = TEST_EMAIL
        ? `[TEST → ${recipient.name}] ${params.subject}`
        : params.subject

      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject,
        html: params.html,
      })

      if (error) {
        console.error(`[Notification] Resend error for ${recipient.name}: ${error.message} (name: ${error.name})`)
        throw new Error(error.message)
      }

      const { error: logErr } = await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: targetEmail,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'sent',
        provider_message_id: result?.id ?? null,
        payload: (params.data ?? {}) as { [key: string]: string | number | boolean | null | undefined },
        sent_at: new Date().toISOString(),
      })
      if (logErr) console.error('[Notification] Failed to log sent to notification_log:', logErr.message)
      sent++
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      const { error: logErr } = await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: targetEmail,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'failed',
        error_message: errorMsg,
        payload: (params.data ?? {}) as { [key: string]: string | number | boolean | null | undefined },
      })
      if (logErr) console.error('[Notification] Failed to log error to notification_log:', logErr.message)
      failed++
      console.error(`[Notification] failed for ${recipient.name}:`, errorMsg)
    }
  }

  console.log(`[Notification] ${params.eventType} result: sent=${sent} skipped=${skipped} failed=${failed}`)
  return { sent, skipped, failed }
}

/** Usuarios con receive_all: true — reciben TODAS las notificaciones */
export async function getReceiveAllUsers(): Promise<{ id: string; email: string | null; name: string }[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, email, name')
    .eq('status', 'Activo')
    .eq('notifications_enabled', true)
    .not('email', 'is', null)
    .contains('notification_preferences', { receive_all: true })
  if (error) console.error('[Notification] getReceiveAllUsers error:', error.message)
  return data ?? []
}
