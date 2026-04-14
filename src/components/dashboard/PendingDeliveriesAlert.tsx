'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { AlertOctagon, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface PendingLine {
  trip_db_id: string
  trip_id: string
  line_id: string
  line_description: string
  request_code: string
  qty_dispatched: number
  qty_delivered: number
  quantity: number
  unit_code: string
}

const lookbackDays = 30

export function PendingDeliveriesAlert() {
  const supabase = useMemo(() => createClient(), [])
  const { person, role } = useAuth()

  const canSee = role === 'logistica' || role === 'admin'

  const [lines, setLines] = useState<PendingLine[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmLine, setConfirmLine] = useState<PendingLine | null>(null)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    // Trips Completados recientes
    const { data: completedTrips } = await supabase
      .from('trips')
      .select('id, trip_id, updated_at')
      .eq('status', 'Completado')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })

    if (!completedTrips || completedTrips.length === 0) {
      setLines([])
      setLoading(false)
      return
    }

    // Assignments de esos trips cuyas líneas sigan En Transito
    const tripIds = completedTrips.map((t) => t.id)
    const { data: rows } = await supabase
      .from('trip_line_assignments')
      .select(`
        trip_id,
        request_line_id,
        qty_dispatched,
        qty_delivered,
        quantity_assigned,
        line:request_line_id (
          id,
          description,
          status,
          quantity,
          qty_delivered,
          unit:unit_id ( code ),
          request:request_id ( request_id )
        )
      `)
      .in('trip_id', tripIds)

    type LineRel = {
      id: string
      description: string
      status: string
      quantity: number
      qty_delivered: number | null
      unit: { code: string } | { code: string }[] | null
      request: { request_id: string } | { request_id: string }[] | null
    }
    type Row = {
      trip_id: string
      request_line_id: string
      qty_dispatched: number | null
      qty_delivered: number | null
      quantity_assigned: number
      line: LineRel | LineRel[] | null
    }

    const tripMap = new Map(completedTrips.map((t) => [t.id, t.trip_id]))
    const pending: PendingLine[] = []

    for (const r of (rows ?? []) as Row[]) {
      const line = Array.isArray(r.line) ? r.line[0] : r.line
      if (!line || line.status !== 'En Transito') continue
      const unit = Array.isArray(line.unit) ? line.unit[0] : line.unit
      const req = Array.isArray(line.request) ? line.request[0] : line.request
      pending.push({
        trip_db_id: r.trip_id,
        trip_id: tripMap.get(r.trip_id) ?? r.trip_id,
        line_id: line.id,
        line_description: line.description,
        request_code: req?.request_id ?? '',
        qty_dispatched: r.qty_dispatched ?? r.quantity_assigned,
        qty_delivered: line.qty_delivered ?? 0,
        quantity: line.quantity,
        unit_code: unit?.code ?? '',
      })
    }

    setLines(pending)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (canSee) fetchPending()
  }, [canSee, fetchPending])

  const handleCancel = useCallback(async () => {
    if (!confirmLine || !reason.trim()) return
    setCancelling(true)

    const now = new Date().toISOString()

    // 1. INSERT Incidencia con razón en trip_events
    await supabase.from('trip_events').insert({
      trip_id: confirmLine.trip_db_id,
      event_type: 'Incidencia',
      event_timestamp: now,
      registered_by: person?.id ?? null,
      notes: `Línea cancelada — ${confirmLine.line_description}. Razón: ${reason.trim()}`,
    })

    // 2. UPDATE sm_request_lines → Cancelada, qty_scheduled=0, append notes
    const { data: current } = await supabase
      .from('sm_request_lines')
      .select('notes')
      .eq('id', confirmLine.line_id)
      .single()

    const prevNotes = current?.notes ?? ''
    const cancellationNote = `[${now.slice(0, 10)}] Cancelada: ${reason.trim()}`
    const nextNotes = prevNotes ? `${prevNotes}\n${cancellationNote}` : cancellationNote

    await supabase
      .from('sm_request_lines')
      .update({
        status: 'Cancelada',
        qty_scheduled: 0,
        notes: nextNotes,
        updated_by: person?.id ?? null,
      })
      .eq('id', confirmLine.line_id)

    setCancelling(false)
    setConfirmLine(null)
    setReason('')
    fetchPending()
  }, [confirmLine, reason, supabase, person, fetchPending])

  if (!canSee) return null
  if (loading) return null
  if (lines.length === 0) return null

  return (
    <>
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertOctagon className="h-5 w-5 text-red-600" />
          <h3 className="text-sm font-semibold text-red-900">
            Entregas pendientes en viajes cerrados ({lines.length})
          </h3>
        </div>
        <p className="text-xs text-red-800 mb-3">
          Estos viajes fueron marcados como Retorno pero las líneas siguen En Transito.
          Registra la entrega tardía o cancela la línea.
        </p>
        <ul className="space-y-2">
          {lines.map((l) => (
            <li
              key={`${l.trip_db_id}-${l.line_id}`}
              className="rounded border border-red-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-navy">{l.trip_id}</span>
                    <span className="text-iconsa-gray">·</span>
                    <span className="font-mono text-iconsa-gray">{l.request_code}</span>
                  </div>
                  <p className="mt-0.5 text-gray-900 truncate">{l.line_description}</p>
                  <p className="mt-0.5 text-xs text-iconsa-gray">
                    Despachado {l.qty_dispatched} · Entregado {l.qty_delivered} de {l.quantity} {l.unit_code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/mis-viajes/${l.trip_db_id}?action=Entrega`}
                    className="inline-flex items-center gap-1 rounded-md border border-navy bg-white px-2.5 py-1 text-xs font-medium text-navy hover:bg-navy/5"
                  >
                    Registrar Entrega
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setConfirmLine(l)
                      setReason('')
                    }}
                  >
                    Cancelar línea
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={confirmLine !== null}
        title="Cancelar línea"
        description={`Esta línea dejará de aparecer en el backlog y quedará marcada como Cancelada. La cantidad entregada hasta ahora (${confirmLine?.qty_delivered ?? 0}) se preserva.`}
        items={confirmLine ? [`${confirmLine.request_code} · ${confirmLine.line_description}`] : []}
        confirmLabel="Cancelar línea"
        cancelLabel="No, mantener"
        variant="danger"
        loading={cancelling}
        confirmDisabled={!reason.trim()}
        onCancel={() => {
          setConfirmLine(null)
          setReason('')
        }}
        onConfirm={handleCancel}
      >
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Razón de cancelación *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ej: Material no se usó en obra, cliente rechazó, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
        />
      </ConfirmDialog>
    </>
  )
}
