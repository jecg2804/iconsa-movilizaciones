# Diagnóstico: Emails de notificación llegan en batch

**Tarea:** Solo diagnóstico — NO implementar. Identificar causa raíz entre
Exchange batching / Resend rate limit / Vercel cold start.

---

## 1. Evidencia: Vercel runtime logs (proyecto real)

Proyecto correcto = `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` (`movimient-os-wxdm`,
team `great-manns-projects`) — es el que tiene dominio `rein-eisenwerk.com`.
El otro proyecto (`movilizaciones-iconsa` en team `jecg2804s-projects`) existe
pero no tiene tráfico de producción.

Deployment activo: `dpl_BCh2RxWTMExQHVyLz5SLKtc7egUV`, branch `main`.

Últimas 12h filtrando por `Notification` (UTC; Panamá = UTC-5):

| UTC | Panamá | Método | Ruta | Evento |
|---|---|---|---|---|
| 13:10:44 | 08:10:44 | POST | /solicitudes | `solicitud_urgente_...` |
| 13:10:43 | 08:10:43 | POST | /solicitudes/nueva | `solicitud_enviada ...` |
| 13:10:10 | 08:10:10 | POST | /programacion | `viaje_asignado_con...` |
| 13:10:10 | 08:10:10 | POST | /programacion/viaje/nuevo | `lineas_programadas...` |
| 13:08:03 | 08:08:03 | POST | /solicitudes | `solicitud_urgente_...` |
| 13:08:03 | 08:08:03 | POST | /solicitudes/nueva | `solicitud_enviada ...` |
| 12:43:37 | 07:43:37 | POST | /mis-viajes/b533... | `retorno_registrado...` |

**Lectura clave:** los timestamps de ejecución server-side están **distribuidos
en 27 minutos**, no clustered. Los pares 13:10:10/13:10:10 y 13:08:03/13:08:03
son dos notificaciones disparadas por la misma acción (crear solicitud dispara
`solicitud_enviada` + `solicitud_urgente`; crear viaje dispara `viaje_asignado`
+ `lineas_programadas`) — se ven en el mismo segundo porque son secuenciales
dentro del mismo server action.

**No hay patrón de cold start** (gap largo + burst). La actividad es sparse
pero ejecuta en tiempo real.

## 2. Evidencia: código (`src/lib/notifications/send.ts`)

- `sendNotification` recorre `recipients` con `for` + `await resend.emails.send(...)` —
  secuencial, sin queue, sin batching interno.
- Al éxito escribe `notification_log` con `sent_at: new Date().toISOString()`
  en el momento del envío (línea 152).
- Dedup de 5 min por `(event_type, reference_id, recipient_id)` (o por email en
  TEST_EMAIL mode) — previene duplicados pero no introduce delay.
- No hay cron de flush de notificaciones en `src/`. El único cron es
  `/api/cron/alertas-urgentes` (`0 12 * * 1-6` Panamá) y es para una alerta
  diaria consolidada, no afecta los emails transaccionales.

## 3. `RESEND_FROM_EMAIL` — NO verificable desde este harness

- Código: `const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'MovimientOS <onboarding@resend.dev>'`
- El MCP de Vercel disponible no expone lectura de env vars
  (`get_project` / `get_runtime_logs` / `list_deployments` solamente).
- Vercel CLI no está instalado en esta máquina.
- Plan mode + Supabase MCP read-only no permiten llamar a `execute_sql`
  (está en el deny list).
- **Pendiente James:** Vercel dashboard → `movimient-os-wxdm` → Settings →
  Environment Variables → confirmar valor de `RESEND_FROM_EMAIL` en Production.
  - Si está vacío o `onboarding@resend.dev` → hipótesis 2 viva.
  - Si es `notificaciones@rein-eisenwerk.com` u otro dominio verificado en
    Resend → hipótesis 2 descartada.

## 4. `notification_log` query — NO ejecutable desde aquí

`mcp__claude_ai_Supabase__execute_sql` está denegada en `.claude/settings.json`
(rule `supabase-readonly.md`). Queda para James ejecutar en Supabase SQL Editor
contra prod `bzeoszympkkicwlfdtcn`:

```sql
SELECT event_type, sent_at, created_at, reference_id, recipient_email
FROM notification_log
WHERE status = 'sent'
ORDER BY sent_at DESC NULLS LAST
LIMIT 50;
```

**Qué buscar en el resultado:**
- Si los `sent_at` están distribuidos (minutos/horas entre filas) pero los
  emails en Outlook llegan bunched → confirma que el bottleneck es downstream
  (hipótesis 1 o 2).
- Si varios `sent_at` caen en el mismo segundo y en Outlook llegan juntos →
  significa que los eventos reales ocurrieron muy juntos (falso positivo del
  usuario — no hay bug).
- Si hay filas `status='sent'` sin `sent_at` (null) → bug secundario en el
  log de send.ts, pero no explica el síntoma.

---

## Ranking de hipótesis

### #1 — Downstream delivery batching (Exchange / Outlook / gateway ICONSA)
**Muy probable.** La evidencia de Vercel logs muestra ejecución distribuida en
el tiempo. Si el código corre en tiempo real y los emails llegan agrupados,
el delay está en uno de los hops después de Resend. Microsoft Exchange y los
gateways corporativos comúnmente difieren entregas en ventanas de 3–5 min para
agrupar lookups de SPF/DKIM y reducir spam score. El patrón "eventos separados,
llegada simultánea" es la firma clásica de esto.

**Cómo confirmar (James):**
- Abrir un email batcheado en Outlook → View message source → inspeccionar
  la cadena `Received:`. Cada hop tiene su timestamp. Si el último hop
  (Exchange interno → buzón) muestra 3–5 min de delay contra el hop anterior
  (Resend → Exchange externo), es Exchange.
- Ir a resend.com/logs → buscar los últimos emails → revisar el delta entre
  "sent" (Resend acepta) y "delivered" (MX del destinatario acepta). Si
  Resend reporta "delivered" en <2s, la culpa es 100% post-MX (gateway
  ICONSA).

### #2 — Resend free-tier rate limit via `onboarding@resend.dev`
**Posible pero NO verificado.** Si `RESEND_FROM_EMAIL` no está seteado en
Vercel prod, el fallback es el sandbox de Resend con límite 2 req/s y entrega
restringida al owner de la cuenta. Aplica solo si la sesión del usuario
disparó >2 notificaciones/seg.

Contra esta hipótesis: los logs muestran como máximo 2 notificaciones en el
mismo segundo (las dos de un mismo action), no 5–10. 2 req/s es el borde del
límite pero no debería fallar de forma reproducible. Además, el flujo
`solicitud_enviada` + `solicitud_urgente` envía a recipients distintos (PMs de
proyecto vs logistica) secuencialmente — el segundo `await` empieza después
del primero, así que temporalmente van separados.

**Cómo confirmar:** James verifica env var según sección 3.

### #3 — Vercel cold start clustering
**Descartada.** Runtime logs no muestran ventanas vacías seguidas de bursts.
Y aunque un cold start ocurriera, `sendNotification` se completa sincrónicamente
dentro del server action — no hay backlog de emails esperando a que arranque
una función. El "momento de envío" (sent_at) y el "momento de ejecución"
(timestamp del log de Vercel) son el mismo instante por diseño del código.

---

## Qué falta a James (acciones de 5 minutos cada una)

1. **Vercel dashboard** → `movimient-os-wxdm` → Settings → Environment Variables →
   reportar si `RESEND_FROM_EMAIL` existe en Production y su valor.

2. **Supabase SQL Editor (prod bzeoszympkkicwlfdtcn)** → correr la query de
   sección 4 → compartir los `sent_at` de las últimas 50 filas. Comparar con
   los timestamps de llegada en Outlook.

3. **Outlook** → abrir 2 emails que hayan llegado "juntos" → ver código fuente →
   copiar la cadena `Received:` completa (solo el último hop de Exchange
   basta).

4. **Resend dashboard** (resend.com → Logs) → filtrar por los últimos 20
   emails → anotar el delta entre "sent" y "delivered". Si Resend no registra
   "delivered" (solo "sent"), eso indica que Exchange está aceptando pero no
   confirmando rápido → batching del gateway.

Con (1)+(2)+(3) el diagnóstico cierra al 100%.

---

## Predicción

Confianza ~80%: es Exchange/Outlook batcheando del lado de entrega. El código
y Vercel están limpios. El fix más probable será del lado de infraestructura
de correo (configurar dominio verificado en Resend si no lo está, o nada
directo si es Exchange — es config de ICONSA IT).
