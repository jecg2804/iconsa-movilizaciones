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

  for (const recipient of params.recipients) {
    const targetEmail = TEST_EMAIL ?? recipient.email

    if (!targetEmail) {
      await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: null,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'skipped',
        error_message: 'No email address',
        payload: params.data ?? {},
      })
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

      if (error) throw new Error(error.message)

      await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: targetEmail,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'sent',
        provider_message_id: result?.id ?? null,
        payload: params.data ?? {},
        sent_at: new Date().toISOString(),
      })
      sent++
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      await supabase.from('notification_log').insert({
        event_type: params.eventType,
        recipient_id: recipient.id,
        recipient_email: targetEmail,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        channel: 'email',
        status: 'failed',
        error_message: errorMsg,
        payload: params.data ?? {},
      })
      failed++
      console.error(`[Notification] failed for ${recipient.name}:`, errorMsg)
    }
  }

  return { sent, skipped, failed }
}
