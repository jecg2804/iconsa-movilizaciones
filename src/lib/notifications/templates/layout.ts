// Helpers para templates de email HTML con branding ICONSA
// Todos los estilos inline (email clients no soportan <style> blocks)

const NAVY = '#1B3A5C'
const GOLD = '#F0A500'
const GRAY_BG = '#F3F4F6'
const GRAY_TEXT = '#6B7280'

/**
 * Layout base de email con branding ICONSA.
 * Header navy con logo, body blanco, footer gris.
 */
export function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${GRAY_BG};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${GRAY_BG};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background-color:${NAVY};padding:20px 24px;border-radius:8px 8px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="color:${GOLD};font-size:22px;font-weight:bold;letter-spacing:1px;">ICONSA</td>
<td align="right" style="color:#ffffff;font-size:14px;font-weight:500;">MovimientOS</td>
</tr>
</table>
</td></tr>

<!-- Title -->
<tr><td style="background-color:#ffffff;padding:24px 24px 8px 24px;">
<h1 style="margin:0;font-size:18px;font-weight:600;color:${NAVY};">${title}</h1>
</td></tr>

<!-- Body -->
<tr><td style="background-color:#ffffff;padding:8px 24px 24px 24px;font-size:14px;line-height:1.6;color:#374151;">
${body}
</td></tr>

<!-- Footer -->
<tr><td style="background-color:${GRAY_BG};padding:16px 24px;border-radius:0 0 8px 8px;border-top:1px solid #E5E7EB;">
<p style="margin:0;font-size:11px;color:${GRAY_TEXT};text-align:center;">
Este es un mensaje automático del sistema MovimientOS de ICONSA.<br>No responda a este correo.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

/**
 * Fila de datos: label gris a la izquierda, valor a la derecha.
 */
export function dataRow(label: string, value: string): string {
  return `<tr>
<td style="padding:6px 0;font-size:13px;color:${GRAY_TEXT};width:40%;vertical-align:top;">${label}</td>
<td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
</tr>`
}

/**
 * Envuelve múltiples dataRow en una tabla.
 */
export function dataTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`
}

/**
 * Botón CTA estilizado.
 */
export function ctaButton(text: string, url: string, color: string = NAVY): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr><td style="background-color:${color};border-radius:6px;">
<a href="${url}" target="_blank" style="display:inline-block;padding:10px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${text}</a>
</td></tr>
</table>`
}

/**
 * Banner de alerta con color por tipo.
 */
export function alertBanner(text: string, type: 'success' | 'warning' | 'danger' | 'info'): string {
  const colors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#D1FAE5', text: '#065F46' },
    warning: { bg: '#FEF3C7', text: '#92400E' },
    danger:  { bg: '#FEE2E2', text: '#991B1B' },
    info:    { bg: '#DBEAFE', text: '#1E40AF' },
  }
  const c = colors[type]
  return `<div style="background-color:${c.bg};color:${c.text};padding:12px 16px;border-radius:6px;font-size:14px;font-weight:500;margin:12px 0;">${text}</div>`
}

/**
 * Código de confirmación prominente (para template lineas_programadas).
 */
export function confirmationCodeBox(code: string): string {
  return `<div style="background-color:#FEF3C7;border:2px solid #F59E0B;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
<p style="margin:0 0 4px 0;font-size:12px;color:#92400E;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Código de Confirmación</p>
<p style="margin:0;font-size:32px;font-weight:bold;font-family:'Courier New',monospace;color:#92400E;letter-spacing:8px;">${code}</p>
<p style="margin:8px 0 0 0;font-size:12px;color:#92400E;">Comparte este código con la persona que recibirá los materiales/equipos en el proyecto destino.</p>
</div>`
}
