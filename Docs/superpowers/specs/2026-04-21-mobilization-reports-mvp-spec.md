---
status: draft
feature: Mobilization Reports MVP — Capa 1 auto-generados (Edge Function + pg_cron + Resend + ExcelJS)
---

# Reportes de Movilizaciones (MVP) — Feature Spec

**Version:** 2.0
**Status:** Ready for review — pending James's approval
**Scope decision:** MVP solo reportes auto-generados (Capa 1 de `REPORTS_VISION.md`). Sin página `/reportes` on-demand, sin configuración UI, sin gap analysis in-app.
**Stack decision:** **Supabase Edge Function** (Deno) + pg_cron + pg_net + Resend + ExcelJS. El feature se despliega independiente del app de Next.js.
**Deployment target:** Supabase prod (`bzeoszympkkicwlfdtcn`) directamente, desde branch `jaime/dev`. No depende del estado del merge jaime/dev → main.
**BD convention:** cambios de schema se ejecutan via `[bd-pending]` → `[bd]` en `Docs/CHANGELOG.md` (James corre SQL en Supabase SQL Editor). No se usan archivos de migración.
**Depende de:** Events V2 estable (Salida/Entrega/Retorno registrables). Relación `trips ← trip_line_assignments → sm_request_lines → sm_requests → projects + cost_codes`. Resend ya configurado.
**Ubicación target en repo:** `Docs/superpowers/specs/2026-04-21-mobilization-reports-mvp-spec.md`

---

## 1. Contexto

El flujo actual de reportes de movilizaciones es 100% manual: Charris mantiene Excels personales por proyecto, los envía los lunes a Astrid, ella los transforma manualmente al formato Spectrum y sube al ERP. MovimientOS ya captura toda la data de las movilizaciones gestionadas por el app (actualmente proyectos 24-404 Costa Norte, 25-505 Paraíso, 25-506 Muelle 14), pero no la expone como reporte.

Este spec describe la **Capa 1** de la visión de reportes: reportes auto-generados del app entregados por correo cada lunes (semanal) y el primer día de cada mes (mensual). No pretende reemplazar el source of truth que es el Excel de Charris (hasta que la adopción sea total), pero sí complementarlo y eventualmente sustituirlo.

**Contexto crítico de deployment:** ICONSA tiene dos versiones del app:
- `main` branch → deployada en producción actual (rein-eisenwerk.com)
- `jaime/dev` branch → versión en desarrollo activo, con features nuevas (Events V2 completo, GPS Live Tracking, etc.) que aún no están en prod

La DB de producción (`bzeoszympkkicwlfdtcn`) no tiene todas las columnas de jaime/dev (ej. `equipment.gps_vehicle_id` no existe; `trip_events.reverts_event_id` tampoco). Este feature debe funcionar contra el schema de prod actual.

**Consecuencia arquitectónica:** el feature se implementa como **Edge Function de Supabase**, no como API route de Next.js. Esto desacopla el feature del deployment del app — funciona independiente de cuál branch del app esté en prod.

**Qué resuelve:**
- Auto-genera bitácora digital unificada (reemplazando formularios IC-LOG-F-06-04 + IC-LOG-06-05)
- Da a Astrid un archivo Spectrum pre-formateado como input alternativo
- Establece auditabilidad por trip (MOV-ID, solicitud, eventos de proof, cost code completo)
- Base de datos de anomalías (trips sin proof, gaps excesivos) como input a dashboards futuros

**Qué NO resuelve (aplazado a v1.1+):**
- Configuración UI de destinatarios (hardcoded a James)
- Página `/reportes` on-demand con filtros custom
- Gap analysis contra Charris
- Tool externo Charris→Spectrum

---

## 2. Scope

### 2.1 — IN (MVP)

- **Cron semanal** lunes 7:00 AM Panamá (= 12:00 UTC) genera 2 archivos:
  - `Movilizaciones_Spectrum_{BatchID}.xlsx` — formato Equip Revenue Transactions
  - `Movilizaciones_Clean_Semanal_{YYYY-MM-DD}.xlsx` — bitácora digital con Resumen Ejecutivo
- **Cron mensual** día 1 del mes a las 00:00 AM Panamá (= 05:00 UTC del día 1) genera 1 archivo:
  - `Movilizaciones_Clean_Mensual_{YYYY-MM}.xlsx` — mismo formato que el Clean semanal pero con el mes completo
- **Destinatario único:** James (correo a confirmar via env var). Astrid se agrega manualmente en v1.1 cuando James valide el formato.
- **Adjuntos por correo, sin Supabase Storage bucket.** Los archivos viven en los inboxes.
- **Ventana temporal:**
  - Semanal: lunes 00:00 → domingo 23:59 de la semana inmediatamente anterior
  - Mensual: mes calendario cerrado anterior (ej. cron del 1 de mayo cubre todo abril)
- **Columna Proof por trip:** `Completo` / `Parcial` / `Sin proof`, derivada de conteo de eventos.
- **Schema delta:** 1 columna nueva en `trips`, 1 tabla nueva `report_runs`.
- **Lógica de idempotencia:** `trips.spectrum_batch_id` + `report_runs` garantizan que ningún trip se omita ni se duplique entre ejecuciones.

### 2.2 — OUT (diferido a v1.1+)

- Página `/reportes` admin on-demand con filtros custom
- Tab en admin para gestionar destinatarios (v1.1)
- Gap analysis contra Excel de Charris (Capa 2 de la visión, manual en Chat por ahora)
- Tool externo Charris→Spectrum (Capa 3 de la visión)
- Soporte para self-pickup (cuando el feature se deployé a prod, ajustar cálculo de Proof)
- Filtro de eventos revertidos (`reverts_event_id` no existe en prod; se agregará cuando jaime/dev → main)
- Archivos en Supabase Storage bucket para histórico (v2, cuando exista el Hub)
- Notificaciones WhatsApp con link al reporte
- Reportes parametrizables por usuario (filtros personales)
- PDF en lugar de / además de Excel

---

## 3. Arquitectura

### 3.1 — Flujo de datos (cron semanal)

```
pg_cron en Supabase prod (lunes 12:00 UTC)
  │  SELECT cron.schedule(...)
  ▼
pg_net.http_post → llama Edge Function de Supabase
  │  url: https://bzeoszympkkicwlfdtcn.supabase.co/functions/v1/mobilization-reports
  │  header: Authorization: Bearer {SUPABASE_ANON_KEY or service role}
  │  body: { "type": "weekly" }
  ▼
Edge Function: supabase/functions/mobilization-reports/index.ts
  │  1. Valida auth (JWT de Supabase)
  │  2. INSERT report_runs (status='pending')
  │  3. Query: trips que cumplen regla de inclusión
  │  4. Genera Excel Spectrum en memoria (ExcelJS via npm:)
  │  5. Genera Excel Clean en memoria (ExcelJS via npm:)
  │  6. Envía email con ambos adjuntos (Resend)
  │  7. UPDATE trips SET spectrum_batch_id = 'MV{DDMMAA}' para trips con Proof ≠ 'Sin proof'
  │  8. UPDATE report_runs (status='sent', sent_at=now(), trip_ids=[...])
  ▼
Resend envía email a destinatario(s)
```

El cron mensual sigue el mismo flujo con `{ "type": "monthly" }` como payload. Solo genera el Clean Mensual (no hay Spectrum mensual — ese ya salió semana a semana).

### 3.2 — Decisiones clave con rationale

**Edge Function de Supabase, no API route de Next.js.** Esta es la decisión clave que desacopla el feature del deployment del app. Razones:

- El app en prod está en `main` branch; el desarrollo activo está en `jaime/dev`. Un API route de Next.js solo funciona si está en la rama deployada — genera acoplamiento entre features no relacionados.
- Supabase Edge Functions se deployan independiente (`supabase functions deploy`). No requieren deploy del app.
- pg_cron → Edge Function directamente, sin pasar por Vercel. Menos hops, menos puntos de falla.
- Es el patrón canónico en Supabase para crons: scheduled exports, reportes, batch jobs. Apps reales (Cal.com, Dub.sh, Chatwoot) usan esto.
- Cuando `jaime/dev` → `main` en el futuro, la Edge Function sigue funcionando idéntico. No requiere refactor.

**Deno runtime con `npm:` imports.** Supabase Edge Functions corren Deno nativamente y soportan imports estilo `import ExcelJS from 'npm:exceljs@4.4.0'` desde principios de 2024. No hace falta esm.sh ni wrappers. El código se parece mucho a Node TypeScript moderno.

**Tipos generados desde schema de prod, no reusados de `src/`.** Edge Functions son unidades autocontenidas. Tendrán `supabase/functions/mobilization-reports/types.ts` con tipos del schema de prod (generados con `supabase gen types typescript --project-id bzeoszympkkicwlfdtcn`). Esto evita el drift documentado en CHANGELOG 2026-04-19 de `src/lib/types/database.ts`.

**Auth del endpoint.** Las Edge Functions de Supabase vienen protegidas por default con JWT verification. Se puede llamar con el service_role key (full access) o anon key (respeta RLS). Para un cron confiable, usamos service_role desde pg_net (el key vive en la DB como secret de Postgres, no expuesto al cliente).

**Adjuntos por correo, sin Storage bucket.** Resend soporta hasta 40MB en adjuntos; un Excel de 50 filas pesa <50KB — sobra. Evita: (1) complejidad de Storage + signed URLs expirables, (2) un servicio menos a mantener, (3) el archivo queda permanentemente en el inbox del destinatario, searchable, reenviable. Cuando v1.1+ necesite histórico accesible desde admin, se agrega Storage como capa adicional sin romper el flujo actual.

**Tabla `report_runs` como tracking.** Una tabla simple que registra cada ejecución del cron (pending → sent/failed). Su función es garantizar que si la Edge Function falla entre pasos 4-7, al siguiente intento se detecte el estado inconsistente y se corrija sin duplicar. Sin ella, el único estado de "¿se envió este trip?" vive en `trips.spectrum_batch_id`, pero el UPDATE de batch_id ocurre DESPUÉS del email — una falla en medio dejaría el email enviado y los trips sin tag, causando duplicación al siguiente cron.

**Columna `spectrum_batch_id` en `trips` como flag de exportación.** Es la fuente de verdad de "este trip ya se envió a Astrid". NULL = pendiente. Valor no-null = enviado, no re-enviar. El valor coincide con el `Batch_ID` del Excel Spectrum (ej. `'MV210426'`) para trazabilidad directa.

**Proof computado en tiempo de reporte, no persistido.** Es una función de los eventos actuales del trip. Si se registra un evento retroactivo, el próximo reporte refleja el nuevo Proof sin migración. No necesita columna.

### 3.3 — Schema differences: prod vs jaime/dev

Esta sección documenta qué del spec asume schema de prod y qué requerirá ajuste cuando jaime/dev merge a main.

| Aspecto | Prod actual | jaime/dev | Impacto en el feature |
|---------|-------------|-----------|----------------------|
| `trip_events.reverts_event_id` | No existe | Existe | Cómputo de Proof en prod NO filtra reversiones. Se actualiza cuando schema cambie. |
| Event types | Salida, Entrega, Retorno, Llegada, Incidencia | + Retiro, Preparacion, Reversion, Parada | Feature solo considera Salida/Entrega/Retorno para Proof. Self-pickup (Retiro/Preparacion) se agrega cuando se habilite en prod. |
| `equipment.gps_vehicle_id` | No existe | Existe | No relevante para este feature. |
| `trips.is_self_pickup` | Probablemente no existe | Existe | Feature trata todos los trips como fleet delivery. Se ajusta cuando exista. |

**Forward-compatibility:** el código debe estar escrito de forma que agregar el filtro de reversiones sea un cambio de una línea (ver sección 5.2).

---

## 4. Schema Delta

### 4.1 — Columna nueva en `public.trips` (via `[bd-pending]`)

**SQL a incluir en el entry `[bd-pending]`:**

```sql
-- Flag de exportación a Spectrum
ALTER TABLE public.trips
ADD COLUMN spectrum_batch_id text NULL;

COMMENT ON COLUMN public.trips.spectrum_batch_id IS
'Batch ID del reporte Spectrum donde este trip fue exportado. NULL = pendiente de exportación. Formato: MV{DDMMAA} del día del cron. Coincide con el campo Batch_ID del Excel generado. Set por el cron de reportes; no modificar manualmente.';

-- Índice parcial para la query del cron (filtrar pendientes rápidamente)
CREATE INDEX idx_trips_spectrum_batch_pending
ON public.trips (status, scheduled_date)
WHERE spectrum_batch_id IS NULL;
```

Se aplica primero en staging (`vonwkciosksqspyljzfy`), luego en prod (`bzeoszympkkicwlfdtcn`). El marker pasa a `[bd]` cuando James confirma ejecución en ambos.

### 4.2 — Tabla nueva `public.report_runs` (via `[bd-pending]`)

**SQL:**

```sql
CREATE TABLE public.report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('spectrum_weekly', 'clean_weekly', 'clean_monthly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  window_start date NOT NULL,
  window_end date NOT NULL,
  trip_ids uuid[] DEFAULT '{}',
  trips_included_count int DEFAULT 0,
  trips_anomaly_count int DEFAULT 0,
  recipients text[] NOT NULL,
  sent_at timestamptz,
  error_message text,
  email_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_status ON public.report_runs (status);
CREATE INDEX idx_report_runs_batch_id ON public.report_runs (batch_id);

COMMENT ON TABLE public.report_runs IS
'Registro de cada ejecución del cron de reportes. Garantiza idempotencia: al iniciar un cron, verifica si hay runs pending previos y los recupera antes de procesar nuevos. Audit trail de qué se envió cuándo a quién.';

COMMENT ON COLUMN public.report_runs.email_id IS
'ID del email retornado por Resend. Se usa para detectar retries que ya enviaron email (previene duplicación en crashes entre send y UPDATE batch_id).';
```

### 4.3 — View opcional para simplificar queries del cron

Propuesta (no estrictamente necesario pero limpia el código del Edge Function):

```sql
CREATE OR REPLACE VIEW v_trips_reportable AS
SELECT 
  t.id AS trip_uuid,
  t.trip_id AS mov_id,
  t.scheduled_date,
  t.status,
  t.cost,
  t.notes,
  t.att_permit,
  t.escort,
  t.spectrum_batch_id,
  sr.request_id AS sol_id,
  p.code AS project_code,
  p.name AS project_name,
  req.name AS requester_name,
  drv.name AS driver_name,
  veh.spectrum_code AS vehicle_code,
  trl.spectrum_code AS trailer_code,
  mr.code AS rate_code,
  mr.rate AS rate_amount,
  cc.full_code AS cost_code_base,
  ccat.code AS cost_category_code,
  (cc.full_code || '-' || ccat.code) AS cost_code_full,
  pe.code AS extra_code,
  cc.phase_code,
  STRING_AGG(DISTINCT srl.description, ' | ') AS material_description,
  STRING_AGG(DISTINCT loc_from.name, ', ') AS from_location,
  STRING_AGG(DISTINCT loc_to.name, ', ') AS to_location,
  (SELECT MIN(te.event_timestamp) FROM trip_events te WHERE te.trip_id = t.id AND te.event_type = 'Salida') AS first_salida,
  (SELECT MAX(te.event_timestamp) FROM trip_events te WHERE te.trip_id = t.id AND te.event_type = 'Retorno') AS last_retorno,
  -- NOTA: prod no tiene reverts_event_id. Cuando exista, agregar AND NOT EXISTS(...) en el subquery.
  (SELECT COUNT(DISTINCT te.event_type) FROM trip_events te WHERE te.trip_id = t.id AND te.event_type IN ('Salida','Entrega','Retorno')) AS distinct_proof_events
FROM trips t
LEFT JOIN trip_line_assignments tla ON tla.trip_id = t.id
LEFT JOIN sm_request_lines srl ON srl.id = tla.request_line_id
LEFT JOIN sm_requests sr ON sr.id = srl.request_id
LEFT JOIN projects p ON p.id = sr.project_id
LEFT JOIN people req ON req.id = sr.requester_id
LEFT JOIN people drv ON drv.id = t.driver_id
LEFT JOIN equipment veh ON veh.id = t.vehicle_id
LEFT JOIN equipment trl ON trl.id = t.trailer_id
LEFT JOIN mobilization_rates mr ON mr.id = t.rate_id
LEFT JOIN cost_codes cc ON cc.id = srl.cost_code_id
LEFT JOIN project_extras pe ON pe.id = cc.extra_id
LEFT JOIN cost_categories ccat ON ccat.id = srl.cost_category_id
LEFT JOIN locations loc_from ON loc_from.id = srl.from_location_id
LEFT JOIN locations loc_to ON loc_to.id = srl.to_location_id
GROUP BY 
  t.id, sr.request_id, p.code, p.name, req.name, drv.name,
  veh.spectrum_code, trl.spectrum_code, mr.code, mr.rate,
  cc.full_code, ccat.code, pe.code, cc.phase_code;

COMMENT ON VIEW v_trips_reportable IS
'Trips con todos los joins necesarios para los reportes de movilizaciones. Incluye timestamps de eventos y conteo de proof. Usado por el cron.';
```

Claude Code decide si usa la view o queries inline. La view es más mantenible pero requiere migración adicional.

---

## 5. Reglas de negocio

### 5.1 — Regla de inclusión en Spectrum Batch y Clean (filas principales)

Un trip entra como fila principal si cumple **todas** estas condiciones:

1. `scheduled_date` cae dentro de la ventana temporal del reporte (semanal lun-dom o mensual día 1 a día N)
2. `status ≠ 'Cancelado'`
3. `spectrum_batch_id IS NULL` — no fue exportado antes
4. Trip está asociado a al menos una línea de solicitud (`trip_line_assignments` con `request_line_id`)

**Sin filtro de eventos** en la regla dura. Trips sin proof aparecen en el Clean con la columna Proof marcada como `Sin proof` pero NO se les estampa `spectrum_batch_id` (ver 5.4), por lo que siguen siendo candidatos de futuros crons si después se registran eventos.

### 5.2 — Cálculo de Proof por trip (prod actual)

Basado en eventos registrados del tipo Salida/Entrega/Retorno:

```sql
SELECT COUNT(DISTINCT event_type) 
FROM trip_events te
WHERE te.trip_id = t.id
  AND te.event_type IN ('Salida', 'Entrega', 'Retorno')
```

Resultado:
- `>= 2` → Proof = `'Completo'`
- `= 1` → Proof = `'Parcial'`
- `= 0` → Proof = `'Sin proof'`

**Forward-compatibility:** cuando jaime/dev → main agregue `trip_events.reverts_event_id`, el filtro de reversiones se incorpora como sigue (cambio de una línea):

```sql
SELECT COUNT(DISTINCT event_type) 
FROM trip_events te
WHERE te.trip_id = t.id
  AND te.event_type IN ('Salida', 'Entrega', 'Retorno')
  AND NOT EXISTS (
    SELECT 1 FROM trip_events tr
    WHERE tr.event_type = 'Reversion'
      AND tr.reverts_event_id = te.id
  )
```

Documentar este cambio en el comentario del código (`// TODO: add reversion filter when prod has reverts_event_id`).

**Eventos duplicados:** algunos trips tienen el mismo evento registrado 2 veces (bug conocido). `COUNT(DISTINCT event_type)` los trata correctamente — dos `Salida` cuentan como 1.

**Self-pickup (futuro):** cuando `is_self_pickup=true` se deploye a prod, la lógica cambia: 1 evento `Retiro` confirmado = `Completo`, `Preparacion` sin `Retiro` = `Parcial`. No está en scope del MVP.

### 5.3 — Transaction_Date en el Excel Spectrum

```
Transaction_Date = trip.scheduled_date
```

Es la fecha programada del viaje. El framing del reporte es "movilizaciones de la semana pasada" (= programadas en la semana pasada, con proof como capa de confianza). Para Astrid, esta es la fecha que carga al ERP — consistente con cómo factura Charris hoy.

Si los eventos registrados están en fecha distinta a `scheduled_date`, aparece como **Anomalía #3** (ver 5.6). No cambia Transaction_Date.

### 5.4 — Lógica de estampado de `spectrum_batch_id`

Al final del cron exitoso, se estampa `spectrum_batch_id` **solo a trips con Proof ≠ 'Sin proof'**:

```sql
UPDATE trips 
SET spectrum_batch_id = 'MV{DDMMAA}'
WHERE id = ANY($trip_ids_included)
  AND id IN (
    SELECT DISTINCT te.trip_id FROM trip_events te
    WHERE te.event_type IN ('Salida','Entrega','Retorno')
  );
```

**Consecuencias:**
- Trips con Proof `Completo` o `Parcial` → estampados, excluidos de futuros crons
- Trips con Proof `Sin proof` → NO estampados, aparecerán en el próximo cron si obtienen proof (o si se reprograma a otra semana, aparecerán en esa semana)

### 5.5 — Batch_ID generation

```
Batch_ID = 'MV' + format(now(), 'DDMMAA')

Ejemplos:
  Cron del lunes 21 abril 2026 → 'MV210426'
  Cron del viernes 1 mayo 2026 → 'MV010526'
```

El Batch_ID se usa en:
- Columna `Batch_ID` de cada fila del Excel Spectrum
- Valor estampado en `trips.spectrum_batch_id`
- Columna `batch_id` de la tabla `report_runs`
- Nombre del archivo: `Movilizaciones_Spectrum_MV210426.xlsx`

Astrid puede editar el valor en el Excel antes de subir a Spectrum si lo prefiere — no afecta el estampado en DB.

### 5.6 — Anomalías detectadas (5 en MVP)

Computadas sobre los trips incluidos en la ventana del reporte, se presentan como sección separada en el Resumen Ejecutivo del Clean:

| # | Nombre | Criterio | Por qué importa |
|---|--------|----------|-----------------|
| 1 | Sin evento Salida | Trip sin evento tipo `Salida` registrado | No hay proof de despacho |
| 2 | Sin evento Entrega | Trip sin evento tipo `Entrega` registrado | Handover no confirmado por el receptor |
| 3 | Eventos en fecha distinta a programada | Cualquier evento Salida/Entrega/Retorno con `event_timestamp::date ≠ scheduled_date` (diff > 1 día) | Reprogramación no registrada o registro retroactivo |
| 4 | Gap Salida→post-Salida fuera de rango | `MIN(evento post-Salida).timestamp - evento Salida.timestamp` fuera de [15min, 12h] | Registros apurados o viajes muy largos que merecen revisión |
| 5 | Trip pendiente de batch con scheduled_date antigua | `scheduled_date < (hoy - 14 días) AND spectrum_batch_id IS NULL AND status ≠ 'Cancelado'` | Safety net: trips huérfanos que nunca calificaron para un batch |

Cada anomalía lista los MOV-IDs afectados con el detalle relevante (ej. para #3: diff en días entre scheduled_date y primer evento).

**Anomalía #5 atraviesa ventanas:** se detecta globalmente cada vez que corre el cron, no importa si el trip cae en la ventana actual. Es la alerta de "estos trips llevan 2+ semanas sin exportarse, revisar".

---

## 6. Estructura detallada de los outputs

### 6.1 — Archivo Spectrum (`Movilizaciones_Spectrum_{BatchID}.xlsx`)

**2 sheets:**

#### Sheet 1: `Equip Revenue Transactions` — 21 columnas estándar de Spectrum

Una fila por trip que pasa las 4 reglas de inclusión Y tiene Proof ≠ 'Sin proof'.

| Col | Nombre | Fuente / Valor | Tipo |
|----|--------|---------------|------|
| A | Sync_Status | `'OK'` (constante) | text |
| B | Company_Code | `'ICN'` (constante) | text |
| C | Transaction_Date | `trip.scheduled_date` | date (formato DD/MM/YYYY) |
| D | Batch_ID | `'MV' + DDMMAA` del cron | text |
| E | Equipment_Code | `mobilization_rates.code` (ej. `MVCALT`) | text |
| F | Source_Code | `'ES'` (constante) | text |
| G | Rate_Type_Code | `'J'` (constante) | text |
| H | Rate_Flag | `'D'` (constante) | text |
| I | Tran_Type | vacío | text |
| J | Transaction_Hours | `1` (default — MovimientOS no consolida viajes) | int |
| K | Transaction_Rate | vacío | — |
| L | Transaction_Amount | vacío | — |
| M | GL_Debit_Account | `120000` (constante) | int |
| N | GL_Credit_Account | `400400` (constante) | int |
| O | Job_Number | `projects.code + project_extras.code` concatenado sin guión (ej. `25-506` si BASE, `25-506E6` si Extra E6) | text |
| P | Phase_Code | `cost_codes.phase_code` sin guiones (ej. `017113`, `099700`) | text |
| Q | Cost_Type | `cost_categories.code` (ej. `ICS`) | text |
| R | Remarks | `trip.notes` o descripción del material | text |
| S | Billing_Rate | vacío | — |
| T | Debit_Cost_Center | vacío | — |
| U | Inter_Company_Code | vacío | — |

**Headers en fila 1 con formato:** negrita, fondo gris claro, bordes. Columnas con ancho auto.

#### Sheet 2: `Proof Reference` — referencia de confiabilidad por trip

No se sube a Spectrum; Astrid la ignora. Columnas:

| Col | Nombre | Descripción |
|----|--------|-------------|
| A | MOV_ID | `trips.trip_id` |
| B | Solicitud | `sm_requests.request_id` |
| C | Transaction_Date | Mismo que sheet 1 (para facilitar cruce) |
| D | Batch_ID | Mismo que sheet 1 |
| E | Proof | `Completo` / `Parcial` |
| F | Eventos Registrados | Concatenación: `Salida:2026-03-24 14:30 ⋅ Entrega:... ⋅ Retorno:...` |
| G | Material | Primera línea de material |

Trips con Proof `Sin proof` NO aparecen en ninguna de las dos sheets (no se exportan a Spectrum). Aparecen solo en el Clean Weekly como filas principales con Proof='Sin proof' y en la sección Anomalías.

### 6.2 — Archivo Clean Semanal (`Movilizaciones_Clean_Semanal_{YYYY-MM-DD}.xlsx`)

**3 sheets:**

#### Sheet 1: `Resumen Ejecutivo`

Estructura organizada en secciones verticales:

```
MOVILIZACIONES — SEMANA DEL {LUN} AL {DOM} DE {MES} {AÑO}
Batch_ID: MV{DDMMAA}
Generado: {timestamp}

── FACTURACIÓN POR PROYECTO ──
| Código  | Proyecto    | # Viajes | Costo Total |
|---------|-------------|----------|-------------|
| 25-506  | Muelle 14   |    7     |   $2,850    |
| 25-505  | Paraíso     |    3     |   $1,150    |
| 24-404  | Costa Norte |    1     |     $200    |
|         | TOTAL       |   11     |   $4,200    |

── DESGLOSE POR TIPO DE TARIFA ──
| Código  | Tipo                     | # Viajes | Tarifa Unitaria | Total   |
| MVCALT  | Movilizacion Cama Alta   |    4     |     $425        | $1,700  |
| ...

── CONFIABILIDAD DEL DATO ──
| Proof     | # Viajes | % del total |
| Completo  |    8     |    73%      |
| Parcial   |    2     |    18%      |
| Sin proof |    1     |     9%      |

── ANOMALÍAS DETECTADAS ──

1. Sin evento Salida (0 trips)
2. Sin evento Entrega (1 trip):
   - MOV-2026-034 (25-506-SM-054)
3. Eventos en fecha distinta a programada (1 trip):
   - MOV-2026-034 — programado 16/abr, eventos 20/abr (+4 días)
4. Gap Salida→post-Salida fuera de rango (0 trips)
5. Trips pendientes de batch con scheduled_date antigua (0 trips)

── CATÁLOGO DE TARIFAS VIGENTES AL MOMENTO ──
[tabla completa de mobilization_rates activas]
```

Sin charts — solo tablas y texto. Formato de números: `$#,##0`. Headers en negrita.

#### Sheet 2: `Detalle`

Una fila por trip que pasa las 4 reglas de inclusión (incluyendo los Sin proof). Ordenada por `scheduled_date` ascendente, luego por `project_code`, luego por `trip_id`. **AutoFilter activado en todas las columnas.**

19 columnas:

| Col | Nombre | Fuente |
|----|--------|--------|
| A | MOV-ID | `trips.trip_id` |
| B | Solicitud | `sm_requests.request_id` |
| C | Fecha Programada | `trips.scheduled_date` |
| D | Hora Salida | `MIN(evento Salida).event_timestamp` formato HH:MM |
| E | Hora Regreso | `MAX(evento Retorno).event_timestamp` formato HH:MM |
| F | Material/Equipo Movilizado | Concatenación de `sm_request_lines.description` de las líneas asignadas |
| G | Desde | Concat de `locations.name` distintos (from), con fallback a `from_text` |
| H | Hasta | Concat de `locations.name` distintos (to), con fallback a `to_text` |
| I | Proyecto | `projects.code` |
| J | Extra | `project_extras.code` o vacío si BASE |
| K | Vehículo | `equipment.spectrum_code` del cabezal |
| L | Remolque | `equipment.spectrum_code` del remolque, o vacío |
| M | Permiso ATT | `trip.att_permit` → `Sí` / `No` |
| N | Escolta | `trip.escort` → `Sí` / `No` |
| O | Conductor | `people.name` del `driver_id` |
| P | Solicitado Por | `people.name` del requester |
| Q | Código de Tarifa | `mobilization_rates.code` |
| R | Código de Costo Completo | `cost_codes.full_code + '-' + cost_categories.code` |
| S | Costo | `trip.cost` formato `$#,##0` |
| T | Proof | `Completo` / `Parcial` / `Sin proof` con color condicional (verde/amarillo/rojo) |
| U | Observación | `trip.notes` |

Formato: headers bold con fondo gris, filas alternadas (banding), borders entre columnas, columna Proof con fill color según valor.

#### Sheet 3: `Catálogo de Tarifas`

Snapshot de `mobilization_rates` activas al momento del reporte. 3 columnas: Código, Descripción, Tarifa.

### 6.3 — Archivo Clean Mensual (`Movilizaciones_Clean_Mensual_{YYYY-MM}.xlsx`)

**Estructura idéntica al Clean Semanal**, pero con ventana del mes calendario anterior completo. Mismas 3 sheets, misma lógica de anomalías. No se exporta Spectrum mensual (ya salió en los batches semanales).

---

## 7. Email

### 7.1 — Envío semanal (lunes)

**Asunto:** `MovimientOS — Reporte semanal movilizaciones {FECHA_INICIO}-{FECHA_FIN}`

Ejemplo: `MovimientOS — Reporte semanal movilizaciones 14/abr-20/abr`

**Destinatarios:** leídos de env var `REPORT_RECIPIENTS_WEEKLY` (coma-separados).

**Body (HTML + plaintext fallback):** resumen ejecutivo breve, counts, mención de archivos adjuntos, Batch_ID.

**Adjuntos:** los dos Excel.

### 7.2 — Envío mensual (día 1)

**Asunto:** `MovimientOS — Reporte mensual movilizaciones {MES} {AÑO}`

**Destinatarios:** leídos de env var `REPORT_RECIPIENTS_MONTHLY`.

**Adjuntos:** solo el Clean Mensual.

### 7.3 — Notificación de fallo

Si el cron falla, enviar email de alerta con el `error_message` al mismo destinatario. Asunto: `⚠️ MovimientOS — Fallo en cron de reportes`.

---

## 8. Orden de operaciones del cron

```
1. Recibir POST con body { type: 'weekly' | 'monthly' }
2. Validar JWT de Supabase (service_role)
3. Determinar ventana temporal
4. Verificar si hay report_runs en status='pending' para el mismo {batch_id, report_type}:
   - Si existe: es un retry. Usar ese row.
   - Si no: INSERT nuevo row con status='pending'
5. Si existe row previo con email_id seteado:
   - El email ya fue enviado. Solo completar el UPDATE de batch_id faltante (paso 11).
   - Esto previene duplicación en caso de crash entre send y UPDATE.
6. Query: trips que cumplen regla 5.1
7. Para cada trip, computar Proof (regla 5.2)
8. Generar Excel Spectrum (sheet 1 solo con Proof != 'Sin proof', sheet 2 solo esos mismos)
9. Generar Excel Clean (sheet 1 Resumen con todos, sheet 2 Detalle con todos incluyendo Sin proof, sheet 3 Catálogo)
10. Si type='monthly', solo generar Clean Mensual (no Spectrum)
11. Enviar email con adjuntos via Resend
12. UPDATE report_runs SET email_id=... inmediatamente después del send success
13. UPDATE trips SET spectrum_batch_id = 'MV{DDMMAA}' WHERE id IN (trips con Proof != 'Sin proof')
14. UPDATE report_runs SET status='sent', sent_at=now(), trip_ids=[...]
15. Si cualquier paso falla:
    - UPDATE report_runs SET status='failed', error_message=...
    - Email de alerta a James
```

**Recovery:** Paso 5 maneja el caso crítico de crash entre `send` y `UPDATE batch_id`. El `email_id` se guarda antes de los UPDATEs. Si el retry detecta `email_id IS NOT NULL` en el pending row, no re-envía email — solo hace los UPDATEs faltantes.

---

## 9. Estructura de archivos en el repo

```
supabase/
└── functions/
    └── mobilization-reports/
        ├── index.ts              # Entry point (Deno HTTP handler)
        ├── query.ts              # Fetch trips + compute proof
        ├── spectrum-builder.ts   # Genera Excel Spectrum (ExcelJS)
        ├── clean-builder.ts      # Genera Excel Clean (ExcelJS)
        ├── anomalies.ts          # Computa las 5 anomalías
        ├── email.ts              # Wrapper de Resend
        ├── types.ts              # Tipos locales (generados desde schema prod)
        └── deno.json             # Config Deno
Docs/
├── CHANGELOG.md                  # Entry [bd-pending] con SQL de sección 4
├── reference/
│   └── REPORTS_VISION.md         # Visión ya entregada
└── superpowers/
    └── specs/
        └── 2026-04-21-mobilization-reports-mvp-spec.md   # este archivo
```

**Sin cambios en `src/`.** El feature es 100% Edge Function. No requiere ni toca el código del app de Next.js.

---

## 10. Configuración de pg_cron y deployment

### 10.1 — Deploy de la Edge Function

James ejecuta una sola vez:

```bash
# Desde branch jaime/dev, directorio root del repo
supabase functions deploy mobilization-reports --project-ref bzeoszympkkicwlfdtcn
```

### 10.2 — Env vars en Supabase

Configurar en Dashboard Supabase → Project Settings → Edge Functions → Secrets:

```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=MovimientOS <reports@iconsanet.com>
REPORT_RECIPIENTS_WEEKLY=jcucalon@iconsanet.com
REPORT_RECIPIENTS_MONTHLY=jcucalon@iconsanet.com
SUPABASE_URL=https://bzeoszympkkicwlfdtcn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[existing service role key]
```

### 10.3 — pg_cron scheduling

Ejecutar en SQL Editor de prod, una vez:

```sql
-- Cron semanal: lunes 12:00 UTC = 7:00 AM Panamá
SELECT cron.schedule(
  'mobilization-reports-weekly',
  '0 12 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://bzeoszympkkicwlfdtcn.supabase.co/functions/v1/mobilization-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"weekly"}'::jsonb
  );
  $$
);

-- Cron mensual: día 1 del mes 05:00 UTC = 00:00 AM Panamá del día 1
SELECT cron.schedule(
  'mobilization-reports-monthly',
  '0 5 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://bzeoszympkkicwlfdtcn.supabase.co/functions/v1/mobilization-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"monthly"}'::jsonb
  );
  $$
);
```

`app.service_role_key` se configura como GUC: `ALTER DATABASE postgres SET app.service_role_key = 'eyJxxxx...';` Este es el service_role key de Supabase (tiene permisos full; Edge Function lo valida para aceptar el request).

---

## 11. Criterios de aceptación

### 11.1 — Lógica de inclusión

- [ ] Un trip Completado con scheduled_date en la ventana, sin batch_id previo, con 2+ eventos de proof → aparece en Spectrum y en Clean Detalle con Proof='Completo'
- [ ] Un trip con 1 evento de proof → aparece en ambos con Proof='Parcial'
- [ ] Un trip sin eventos de proof → aparece en Clean con Proof='Sin proof' pero NO en Spectrum
- [ ] Un trip Cancelado nunca aparece en ningún reporte
- [ ] Un trip con `spectrum_batch_id IS NOT NULL` nunca aparece en un nuevo reporte

### 11.2 — Idempotencia

- [ ] Ejecutar la Edge Function dos veces seguidas manualmente: segunda ejecución solo incluye trips nuevos o con batch_id aún NULL
- [ ] Simular crash entre email send y UPDATE batch_id: al rerun, `report_runs` se reutiliza, email NO se re-envía (por email_id), UPDATEs faltantes se completan

### 11.3 — Outputs

- [ ] Excel Spectrum abre sin errores en Excel/LibreOffice
- [ ] 21 columnas en sheet 1 en el orden exacto de la sección 6.1
- [ ] Sheet 2 "Proof Reference" con columnas especificadas
- [ ] Excel Clean abre sin errores, AutoFilter activo en Sheet 2 Detalle
- [ ] Columna Proof de Clean Detalle tiene colores: verde (Completo), amarillo (Parcial), rojo (Sin proof)
- [ ] Costos formateados como `$#,##0`
- [ ] Resumen Ejecutivo incluye las 3 tablas + sección Anomalías con MOV-IDs

### 11.4 — Email

- [ ] Email llega con subject correcto y counts correctos en body
- [ ] Ambos adjuntos presentes en el email semanal
- [ ] Solo Clean Mensual adjunto en el mensual
- [ ] En fallo del cron, llega email de alerta

### 11.5 — Anomalías

- [ ] Las 5 anomalías computan correctamente con casos de prueba de la data real de prod

### 11.6 — DB state

- [ ] Después de cron exitoso, trips incluidos (excepto Sin proof) tienen `spectrum_batch_id` seteado
- [ ] `report_runs` tiene row con status='sent', trip_ids poblado, email_id seteado
- [ ] `SELECT * FROM report_runs WHERE status='failed'` vacío en operación normal

### 11.7 — Prueba manual con data real de prod

Antes de activar pg_cron:

- [ ] `supabase functions deploy` exitoso
- [ ] curl manual a la Edge Function con service_role key usando ventana del 14-20 abril
- [ ] Verifica los 2 Excel generados con trips esperados
- [ ] Verifica Resumen Ejecutivo visualmente
- [ ] Valida contra Excel de Charris de la misma semana

---

## 12. Prompt para Claude Code

Pegar en Claude Code con Plan Mode activado desde branch `jaime/dev`:

```
Context:
Implementar el MVP de reportes auto-generados de movilizaciones para MovimientOS como Edge Function de Supabase. Capa 1 de la visión descrita en Docs/reference/REPORTS_VISION.md. Spec completa: Docs/superpowers/specs/2026-04-21-mobilization-reports-mvp-spec.md — léela antes de planear.

Constraint crítico de deployment: el app en prod (rein-eisenwerk.com) corre de la rama main, mientras que este desarrollo ocurre en jaime/dev. El feature se implementa como Edge Function de Supabase (NO API route de Next.js) para ser independiente del deployment del app. Deploy target: Supabase prod (project-ref bzeoszympkkicwlfdtcn) directamente, desde esta branch jaime/dev.

El sistema genera 2 archivos Excel cada lunes 7am Panamá (Spectrum batch + Clean semanal) y 1 archivo el día 1 de cada mes (Clean mensual), entregados por correo al destinatario configurado en env vars, con los archivos como adjuntos vía Resend. Stack: Supabase Edge Function en Deno + pg_cron en prod → pg_net.http_post → Edge Function URL. ExcelJS via imports npm: (Supabase soporta nativamente).

IMPORTANTE sobre el schema de prod: NO tiene trip_events.reverts_event_id (existe en jaime/dev pero no en main). El cómputo de Proof en prod NO filtra reversiones. Cuando eventualmente jaime/dev → main, se agrega filtro — marca este lugar en el código con TODO explícito.

Intent:
- Implementar Edge Function POST /functions/v1/mobilization-reports siguiendo orden de operaciones de sección 8 del spec
- Cumplir todos los criterios de aceptación de sección 11
- No tocar pg_cron — James configura manualmente después (sección 10)
- Crear archivos en la estructura de sección 9: supabase/functions/mobilization-reports/*
- Ejecutar schema delta de sección 4 vía entry [bd-pending] en Docs/CHANGELOG.md, NO archivos de migración
- Los tipos de DB viven locales en supabase/functions/mobilization-reports/types.ts, generados desde schema de PROD (no staging). No reutilizar tipos de src/lib/types/database.ts
- Escribir tests unitarios para: cómputo de Proof, regla de inclusión, cómputo de anomalías (5 funciones), generación del Batch_ID. Deno tests nativos (deno test).
- No Playwright E2E — los E2E helpers están rotos (AD-5). Sección 11.7 es verificación manual por James.

Format:
- Antes de implementar, presenta un plan en Plan Mode que refleje el orden de implementación: schema delta primero, tipos locales segundo, query + compute proof tercero, generadores de Excel cuarto, anomalías quinto, email sexto, entry point séptimo, tests octavo
- Decide si usas la view v_trips_reportable de sección 4.3 o queries inline (justifica en el plan)
- Cada commit es un paso lógico discreto
- Al final, provee el curl command para que James pruebe el endpoint manualmente antes de configurar pg_cron:
  curl -X POST https://bzeoszympkkicwlfdtcn.supabase.co/functions/v1/mobilization-reports \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"type":"weekly"}'

Constraints:
- Spec es fuente de verdad. Si algo contradice el spec, pregunta antes de decidir.
- Consulta schema vía Supabase MCP read-only (project bzeoszympkkicwlfdtcn) si tienes duda sobre estructura.
- Imports: usa npm:exceljs@4.4.0 y npm:resend@3.x directamente (Supabase Edge Functions soporta npm: desde 2024)
- No usar archivos supabase/migrations/. Schema delta va como [bd-pending] en CHANGELOG.md.
- Destinatarios desde env vars REPORT_RECIPIENTS_WEEKLY, REPORT_RECIPIENTS_MONTHLY (coma-separados)
- El email_id de Resend se captura y persiste en report_runs antes de cualquier UPDATE de trips — esto es crítico para idempotencia
- No asumir self-pickup (is_self_pickup no está en prod). Documentar como forward-compat en comments.
```

---

## 13. Next steps después del MVP

1. **v1.1 — Validar con Astrid:** agregar su correo a `REPORT_RECIPIENTS_WEEKLY`, obtener feedback, iterar.
2. **v1.2 — Merge jaime/dev → main:** cuando ocurra, agregar filtro de reversiones en el Proof (sección 5.2)
3. **v1.3 — Self-pickup support:** cuando Fase 1B se deploye a prod, actualizar cómputo de Proof
4. **v2 — Reports Hub:** página admin `/reportes` con filtros. Motor genérico reusable.
5. **v2.1 — Supabase Storage:** guardar histórico de Excel generados

Fuera del scope de este spec pero mencionados para continuity.
