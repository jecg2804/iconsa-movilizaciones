// 12 templates de notificación email — cada uno retorna { subject, html }

import {
  emailLayout,
  dataRow,
  dataTable,
  ctaButton,
  alertBanner,
  confirmationCodeBox,
} from './layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rein-eisenwerk.com'

interface TemplateResult {
  subject: string
  html: string
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// =============================================================================
// 1. SOLICITUD ENVIADA → Charris
// =============================================================================
export function solicitudEnviada(data: {
  requestId: string
  projectName: string
  requesterName: string
  dateRequired: string
  lineCount: number
  referenceId: string
}): TemplateResult {
  const days = daysUntil(data.dateRequired)
  const urgentBanner = days <= 3
    ? alertBanner(`⚠️ URGENTE: Fecha requerida en ${days} día${days !== 1 ? 's' : ''}`, 'danger')
    : ''

  const body = `
<p>Se ha recibido una nueva solicitud que requiere programación.</p>
${urgentBanner}
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Proyecto', data.projectName) +
  dataRow('Solicitante', data.requesterName) +
  dataRow('Fecha requerida', formatDate(data.dateRequired)) +
  dataRow('Líneas', `${data.lineCount} ítem${data.lineCount !== 1 ? 's' : ''}`)
)}
${ctaButton('Ver Solicitud →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  return {
    subject: `Nueva Solicitud ${data.requestId} — ${data.projectName}`,
    html: emailLayout('Nueva Solicitud de Movilización', body),
  }
}

// =============================================================================
// 2. SOLICITUD EDITADA → Charris
// =============================================================================
export function solicitudEditada(data: {
  requestId: string
  projectName: string
  editedBy: string
  referenceId: string
}): TemplateResult {
  const body = `
<p>La solicitud ha sido modificada. Revise los cambios.</p>
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Proyecto', data.projectName) +
  dataRow('Modificada por', data.editedBy)
)}
${ctaButton('Ver Cambios →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  return {
    subject: `Solicitud ${data.requestId} Modificada — ${data.projectName}`,
    html: emailLayout('Solicitud Modificada', body),
  }
}

// =============================================================================
// 3. SOLICITUD CANCELADA → Charris
// =============================================================================
export function solicitudCancelada(data: {
  requestId: string
  projectName: string
  cancelledBy: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner('La solicitud ha sido cancelada.', 'warning')}
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Proyecto', data.projectName) +
  dataRow('Cancelada por', data.cancelledBy)
)}
${ctaButton('Ver Solicitud →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  return {
    subject: `Solicitud ${data.requestId} Cancelada — ${data.projectName}`,
    html: emailLayout('Solicitud Cancelada', body),
  }
}

// =============================================================================
// 4. SOLICITUD COMPLETADA → PM solicitante
// =============================================================================
export function solicitudCompletada(data: {
  requestId: string
  projectName: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner('Tu solicitud ha sido completada exitosamente.', 'success')}
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Proyecto', data.projectName)
)}
${ctaButton('Ver Detalles →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  return {
    subject: `Solicitud ${data.requestId} Completada`,
    html: emailLayout('Solicitud Completada', body),
  }
}

// =============================================================================
// 5. LÍNEAS PROGRAMADAS → PM solicitante
// =============================================================================
export function lineasProgramadas(data: {
  requestId: string
  tripId: string
  scheduledDate: string
  vehicleDescription: string
  confirmationCode: string
  referenceId: string
  tripReferenceId: string
}): TemplateResult {
  const body = `
<p>Tu solicitud ha sido programada para movilización.</p>
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Fecha programada', formatDate(data.scheduledDate)) +
  dataRow('Equipo de movilización', data.vehicleDescription)
)}
${confirmationCodeBox(data.confirmationCode)}
${ctaButton('Ver Detalles →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  return {
    subject: `Solicitud ${data.requestId} Programada — Viaje ${data.tripId}`,
    html: emailLayout('Solicitud Programada', body),
  }
}

// =============================================================================
// 6. VIAJE CANCELADO → PM(s) afectados
// =============================================================================
export function viajeCancelado(data: {
  tripId: string
  requestIds: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner('El viaje ha sido cancelado. Las líneas fueron devueltas al backlog.', 'warning')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Solicitudes afectadas', data.requestIds)
)}
${ctaButton('Ver Backlog →', `${APP_URL}/programacion`)}`

  return {
    subject: `Viaje ${data.tripId} Cancelado`,
    html: emailLayout('Viaje Cancelado', body),
  }
}

// =============================================================================
// 7. VIAJE REPROGRAMADO → PM(s) afectados
// =============================================================================
export function viajeReprogramado(data: {
  tripId: string
  previousDate: string
  newDate: string
  requestIds: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner('El viaje ha sido reprogramado.', 'info')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Fecha anterior', formatDate(data.previousDate)) +
  dataRow('Nueva fecha', formatDate(data.newDate)) +
  dataRow('Solicitudes afectadas', data.requestIds)
)}
${ctaButton('Ver Viaje →', `${APP_URL}/programacion/viaje/${data.referenceId}`)}`

  return {
    subject: `Viaje ${data.tripId} Reprogramado — ${formatDate(data.newDate)}`,
    html: emailLayout('Viaje Reprogramado', body),
  }
}

// =============================================================================
// 7b. VIAJE EDITADO → PM(s) afectados (reemplaza viajeReprogramado para ediciones)
// =============================================================================
export function viajeEditado(data: {
  tripId: string
  scheduledDate: string
  changes: string[]
  requestIds: string
  referenceId: string
}): TemplateResult {
  const changeList = data.changes.map(c => `• ${c}`).join('<br/>')
  const body = `
${alertBanner('El viaje ha sido modificado. Revise los cambios.', 'info')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Fecha programada', formatDate(data.scheduledDate)) +
  dataRow('Cambios realizados', changeList) +
  dataRow('Solicitudes afectadas', data.requestIds)
)}
${ctaButton('Ver Viaje →', `${APP_URL}/programacion/viaje/${data.referenceId}`)}`

  return {
    subject: `Viaje ${data.tripId} Modificado`,
    html: emailLayout('Viaje Modificado', body),
  }
}

// =============================================================================
// 8. VIAJE ASIGNADO A CONDUCTOR
// =============================================================================
export function viajeAsignadoConductor(data: {
  tripId: string
  scheduledDate: string
  vehicleDescription: string
  stopCount: number
  referenceId: string
}): TemplateResult {
  const body = `
<p>Se te ha asignado un viaje de movilización.</p>
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Fecha', formatDate(data.scheduledDate)) +
  dataRow('Vehículo', data.vehicleDescription) +
  dataRow('Paradas/entregas', String(data.stopCount))
)}
${ctaButton('Ver Mi Viaje →', `${APP_URL}/mis-viajes/${data.referenceId}`)}`

  return {
    subject: `Viaje ${data.tripId} Asignado — ${formatDate(data.scheduledDate)}`,
    html: emailLayout('Viaje Asignado', body),
  }
}

// =============================================================================
// 9. ENTREGA CONFIRMADA → PM solicitante
// =============================================================================
export function entregaConfirmada(data: {
  requestId: string
  projectName: string
  description: string
  qtyDelivered: number
  qtyTotal: number
  receivedByName: string
  isPartial: boolean
  referenceId: string
}): TemplateResult {
  const banner = data.isPartial
    ? alertBanner(`Entrega parcial: ${data.qtyDelivered} de ${data.qtyTotal} entregados. Quedan ${data.qtyTotal - data.qtyDelivered} pendientes.`, 'warning')
    : alertBanner('Entrega confirmada.', 'success')

  const body = `
${banner}
${dataTable(
  dataRow('Solicitud', `<strong style="font-family:monospace;">${data.requestId}</strong>`) +
  dataRow('Proyecto', data.projectName) +
  dataRow('Ítem', data.description) +
  dataRow('Cantidad entregada', `${data.qtyDelivered} / ${data.qtyTotal}`) +
  dataRow('Recibido por', data.receivedByName)
)}
${ctaButton('Ver Solicitud →', `${APP_URL}/solicitudes/${data.referenceId}`)}`

  const subject = data.isPartial
    ? `Entrega Parcial — Solicitud ${data.requestId} (${data.qtyDelivered}/${data.qtyTotal})`
    : `Entrega Confirmada — Solicitud ${data.requestId}`

  return {
    subject,
    html: emailLayout(data.isPartial ? 'Entrega Parcial' : 'Entrega Confirmada', body),
  }
}

// =============================================================================
// 10. SALIDA REGISTRADA → PM(s) afectados
// =============================================================================
export function salidaRegistrada(data: {
  tripId: string
  departureTime: string
  destination: string
  requestIds: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner('El viaje salió de Chilibre.', 'info')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Hora de salida', data.departureTime) +
  dataRow('Destino', data.destination) +
  dataRow('Solicitudes', data.requestIds)
)}
${ctaButton('Ver Viaje →', `${APP_URL}/mis-viajes/${data.referenceId}`)}`

  return {
    subject: `Viaje ${data.tripId} En Ruta → ${data.destination}`,
    html: emailLayout('Viaje En Ruta', body),
  }
}

// =============================================================================
// 11. INCIDENCIA EN RUTA → Charris + PM(s) afectados
// =============================================================================
export function incidenciaRuta(data: {
  tripId: string
  incidentNotes: string
  referenceId: string
}): TemplateResult {
  const body = `
${alertBanner(data.incidentNotes, 'danger')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Notas', data.incidentNotes)
)}
${ctaButton('Ver Viaje →', `${APP_URL}/mis-viajes/${data.referenceId}`)}`

  return {
    subject: `⚠️ Incidencia — Viaje ${data.tripId}`,
    html: emailLayout('Incidencia en Ruta', body),
  }
}

// =============================================================================
// 12. RETORNO REGISTRADO → PM(s) afectados
// =============================================================================
export function retornoRegistrado(data: {
  tripId: string
  arrivalTime: string
  requestIds: string[]
  referenceId: string
}): TemplateResult {
  const arrivalFormatted = new Date(data.arrivalTime).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })

  const body = `
${alertBanner('El viaje completó su ruta y retornó a base.', 'success')}
${dataTable(
  dataRow('Viaje', `<strong style="font-family:monospace;">${data.tripId}</strong>`) +
  dataRow('Hora de retorno', arrivalFormatted) +
  dataRow('Solicitudes', data.requestIds.join(', ') || '—')
)}
${ctaButton('Ver Viaje →', `${APP_URL}/mis-viajes/${data.referenceId}`)}`

  return {
    subject: `Viaje ${data.tripId} — Retorno Confirmado`,
    html: emailLayout('Retorno Confirmado', body),
  }
}

// =============================================================================
// 13. SUGERENCIA FALLBACK → Admin (template creado, NO conectado en MVP)
// =============================================================================
export function sugerenciaFallback(data: {
  tableName: string
  suggestedValue: string
  suggestedByName: string
  referenceId: string
}): TemplateResult {
  const body = `
<p>Un usuario ha sugerido agregar un nuevo valor a una tabla maestra.</p>
${dataTable(
  dataRow('Tabla', data.tableName) +
  dataRow('Valor sugerido', `<strong>${data.suggestedValue}</strong>`) +
  dataRow('Sugerido por', data.suggestedByName)
)}
${ctaButton('Revisar Sugerencias →', `${APP_URL}/admin/masters`)}`

  return {
    subject: `Sugerencia: "${data.suggestedValue}" para ${data.tableName}`,
    html: emailLayout('Nueva Sugerencia', body),
  }
}
