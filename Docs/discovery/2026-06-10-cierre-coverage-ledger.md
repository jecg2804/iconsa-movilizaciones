<!-- Generado del workflow cierre-de-huecos wf_a8e71f74-8fc (7 agentes, 2026-06-10). -->

# Cierre de Discovery — MovimientOS (2026-06-10)

Consolidación de 5 misiones de cobertura sobre el discovery previo (hooks, páginas principales, eventos, GPS, notificaciones, data-layer, schemas staging/prod vía MCP). Regla aplicada en todo: **source of truth = código + BD viva; los docs del repo mienten** (20+ contradicciones verificadas). Cero recomendaciones — solo entendimiento.

---

## 1. COVERAGE LEDGER GLOBAL

### 1.1 Veredicto ejecutivo ("¿ya viste cada nook and cranny?")

**Sí, con tres excepciones acotadas y documentadas.** Está leído/verificado: el código completo de AMBAS ramas (jaime/dev y main), todos los configs/tests/hooks de git, todo lo verificable de la BD sin SQL vivo (ledgers, advisors, tipos, snapshots), el corpus SOP relevante (clusters Logística + Equipos completos), los handoffs operativos, y el universo Drive de movilizaciones (bitácoras de 4 proyectos + 36 solicitudes papel de Muelle 14 + consolidado de James). Lo que NO está visto se divide en: (a) **lo que solo el SQL pack desbloquea** (cuerpos vivos de ~13 funciones BD + toda la forensia de data de prod — `execute_sql` denegado para Code por diseño); (b) **archivos en formatos no parseables** (xlsb, pbix) o ausentes del corpus (PO-08, Excel real de Charris); (c) **boilerplate y duplicados verificados** (portadas de SOPs, copias byte-idénticas, formularios .xls cuyo PDF equivalente sí se leyó).

### 1.2 Cubierto al 100% (leído línea a línea o verificado programáticamente)

**A. Código jaime/dev** (discovery previo + misión "resto"):
- Los 8 hooks, las 8 páginas principales, sistema de eventos completo, GPS api route, notificaciones (actions/send/templates), data-layer (proxy, supabase clients, types) — discovery previo.
- 43/43 componentes de `src/components` (viajes 8, programacion 9, solicitudes 5, ui 13, layout 4, dashboard 4 + TripLiveMap), `admin/masters/page.tsx` completo (1115 líneas), páginas restantes (calendario, viaje/nuevo, login/change-password/forgot-password, layouts, auth/confirm, cron route), `src/lib` completo (utils, gps, sentry/redact, storage, service).
- `.husky/` (3 hooks, cuerpos reales vs blueprint: coinciden), todos los configs (next/ts/eslint/sentry×3/instrumentation/vercel/playwright/package/.claude/settings con deny-list de 25), `tests/helpers.ts` + `auth.setup.ts` + `role-permissions.spec` completos, estructura de los 17 specs.
- `audit-scripts/` (setup completo + headers de los 6 repros), `scripts/debug-skydata.ts`, untracked (`spectrum-tests/` con resumen.csv de 21 servicios SDX, `ICONSA_SDX_Spectrum_documentacion.md`).

**B. Código main (= prod, tag v2026.04.15-2 + a591867)** — misión delta:
- `useTripEvents.ts` (193 líneas) y `mis-viajes/[id]/page.tsx` (724) completos; `useTrips.ts` (interfaces + saveTrip/updateTrip/cancelTrip completos); `vercel.json`, `next.config.ts` completos.
- Git: ancestry checks de 12 commits clave, diff 2-dot y 3-dot, `git merge-tree` real (simulación del merge con lista exacta de conflictos), comparación programática de `database.ts` entre ramas (45 vs 53 entidades).

**C. BD — lo verificable sin SQL:**
- Schemas vivos staging (51 tablas) y prod (147 tablas/13 schemas) vía MCP, advisors de ambos, ledger staging (45 migraciones) y prod (~150), tipos generados.
- `baseline.sql` (2751 líneas) y `full_schema.sql` (2791) completos — con el hallazgo de que son snapshots stale de marzo (22 tablas) sin valor como source of truth actual.
- Reconstrucción función-por-función: **24 funciones con cuerpo CONFIABLE** (15 de full_schema + 9 de los bloques [bd] del CHANGELOG: Cambio 6, 6.5 y amend) + inventario en vivo de las 19 SECURITY DEFINER vía advisors (verificación independiente).

**D. Corpus documental local:**
- Cluster LOGISTICA: PO-01/03/04/05/06/07/09 + IT-01/IT-02 (cuerpos completos), IC-LOG-PO-06 con sus 4 formularios (F-06-02/03/04/05) + Anexo ATTT.
- Cluster EQUIPOS (Usuarios SG): PO-01 a 06 (cuerpos completos; PO-02 texto íntegro) + formularios clave F-00-01/02/03, F-01-02/03/04/05, F-02-01.
- Handoffs 2026-05-11 y 2026-05-14 completos, `MovimientOS_Event_Correction_Prompt.md` completo, `GPS_Future_Opportunities.md` completo, Testing Plan, Self-pickup, EVENTS_V2, las 2 imágenes (plan entregas tardías, conteo Cambio 6.6).

**E. Google Drive:**
- Carpeta 25-506 Muelle 14 nivel 1 completo (35 items) + "34 Movilizacion" completa (36 solicitudes papel hasta Mar-2026); bitácoras de facturación de Charris de 4 proyectos (Costa Norte ~200 filas Sep-24→Nov-25, Muelle 14 Oct-25→Abr-26, SoftNose, Astibal); template SOP F-06-04 con dropdowns; solicitud 036 PDF llena (formato IC-LOG-F-06-03 VV.2012); consolidado de James (184 solicitudes/487 líneas, analizado cuantitativamente); xlsx local "MOVILIZACION MUELLE 14 ABRIL 2026" (7 hojas parseadas vía Python).

### 1.3 Cubierto PARCIAL (con razón)

- `useSolicitudes.ts` de main (850 líneas): greps dirigidos confirmaron cost codes per-línea y FK hints; el flujo submit completo no se leyó línea a línea — deltas menores posibles.
- `programacion/page.tsx`, `solicitudes/[id]/page.tsx`, `TripForm.tsx`, `LineEditor.tsx` de main: estructura + secciones clave vía grep (suficiente para el mapa de conflictos de merge).
- Bodies de 13 de los 17 specs E2E: caracterizados por nombres de tests + helpers consumidos (suficiente para el veredicto "suite UI muerta").
- SOPs secundarios: portadas/índices/registros boilerplate salteados; formularios EPP y combustible-HSE (bajo valor para MovimientOS).
- Búsquedas Drive: página 3+ de "MOVILIZACION" (históricos 2023-24 de proyectos cerrados) sin agotar; subcarpetas nivel 2+ de Muelle 14 fuera del foco movilizaciones.

### 1.4 NO leído (con razón explícita)

| Item | Razón |
|---|---|
| `BITACORA FEBRERO 2026.xlsb` (Drive de James) | Formato xlsb macro-enabled no soportado por el MCP — posible master multi-proyecto |
| `Solicitudes de Movilizacion.pbix` | Binario Power BI no parseable |
| 35 solicitudes papel restantes de Muelle 14 (individualmente) | Formato idéntico confirmado vía template + la 036 leída a fondo |
| IC-LOG-PO-08 (Alquiler de Equipo de Movilización) | NO existe en el corpus (ni local ni Usuarios SG) — referenciado por PO-06 §5.3 |
| Formularios .xls/.doc (F-02-01/02/03 internacionales, versiones Excel de F-06-*, Manual Fleetwise, F-02-02 plan reemplazo) | Requieren conversión; PDFs equivalentes leídos donde existen |
| Reportes .docx de mayo (Registro de Eventos 14-may, Estado 28-abr, Adopción 13-may) | Candidatos a misión futura — cierran el detalle por-usuario de adopción |
| PO Receiving History 2025/26, Depreciación, inventarios xlsx, HANDOFF-API-Integration, carpeta API Spectrum | Fuera del scope movilizaciones; inputs de módulos futuros (procurement, tarifas) |
| repomix-*.xml, package-lock, public/*.svg, globals.css, supabase/.temp | Generados / sin valor de entendimiento |
| Excel real de Charris (formato propio, el vivo) | No está en el corpus — solo conocemos sus copias mensuales por proyecto en Drive |

### 1.5 Lo que SOLO se desbloquea con el SQL pack (James/Chat)

Entregable ya commiteado: **`Docs/sql-diagnostic-pack-2026-06-10.sql`** (commit `4161493`, 33 queries read-only, 7 secciones, etiquetadas [PROD]/[STAGING]/[AMBOS]). Lista exacta de lo que queda ciego hasta correrlo:

1. **Cuerpos vivos de ~13 funciones nunca versionadas** (trg_recalc_from_* ×4, generate_pickup_id/external_id, auto_cancel_empty_* ×2, generate_internal_asset_tag, log_equipment_status_change, enforce_line_add_delete_only_in_borrador, enforce_trip_immutable_post_departure, capture_lifecycle_timestamps post-fix, cascade_request_status v4) → Q1.2.
2. **Fingerprints binarios** de la reconstrucción (recalc sin rama 'Programada' = amend 6.5; cascade con/sin 'Pickup Aprobado'; H1 v6 vs v6.5) → S1.
3. Si los `CREATE OR REPLACE` de Cambios 3/5 **pisaron el `SET search_path`** de cascade_request_status (hardening del Block 1.B perdido silenciosamente) → Q1.1.
4. Si las migraciones humanos **044/077 revocaron EXECUTE** sobre funciones public en prod (riesgo: get_my_app_role → toda la matriz RLS de movilizaciones) → Q1.1.
5. **Entorno de la expansión audit_trigger 2026-05-13** (¿prod, staging, ambos? — sin migración en ningún ledger) → Q2.2.
6. **Schema REAL de prod vs ledger**: existencia de trip_event_lines, delivery_observations, reverts_event_id, conteo real de tablas (Events V2 entró por SQL Editor sin registrarse — solo pg_catalog es confiable) → Q4.4/Q4.5.
7. Constraint vivo `valid_event_type` en ambos envs (la igualdad de los 18 tipos es asumida, no verificada) → Q4.1.
8. Exposed schemas reales de PostgREST en prod → Q0.3/Q0.4.
9. **Matriz RLS viva** (pg_policies public+storage), incluyendo USING/WITH CHECK de `operational_update` — define si el bypass del código de confirmación es solo de UI o también de datos para rol campo → S3.
10. Policy de Storage MIME: ¿acepta image/heic|heif que el cliente permite? → S3.
11. Si el trigger `generate_confirmation_code` en prod **sobreescribe o respeta** el código que main inserta client-side con Math.random → S2.
12. **Gates de la migración consolidada**: trips con rate_id NULL (NOT NULL Cambio 6), drift de qty que violaría los CHECKs 6/6.5, zombies En Transito, assignments destruidos por cancelTrip V1 → S4/S6.
13. **Toda la sección forense F1-F12b**: cuantificación de intervenciones manuales (changed_by NULL + microseconds=0 + gap event_timestamp vs created_at), % eventos en momento real, bundling de ítems, trips sin tarifa, líneas atascadas — y la actualización post-14-may (las ~12 MOVs nuevas sin documentar) → S6.
14. BL-EXCLUSIVITY (con la nota: en prod la query falla porque las tablas Cambio 5 no existen — esa ausencia ES la respuesta) → S5.
15. AD-2: estado del trigger de custody_transfers → S2.
16. (No-SQL pero externo a Code): confirmar en Vercel que prod despliega main@a591867 y que CRON_SECRET está configurado.

---

## 2. ADDENDUM AL CANÓNICO

Hallazgos de estas 5 misiones que cambian o completan el entendimiento previo.

### 2.1 main↔jaime/dev es una DIVERGENCIA, no un "ahead"

- **269 ahead / 11 behind hoy** (verificado en este cierre; era 267/11 al momento de la misión — los +2 son commits docs del propio discovery). Merge-base `697af3e` (2026-04-06). TRAIL decía "266 ahead" omitiendo el behind.
- **Prod corre Events V1 íntegro** (último merge real: PR #41, 2026-03-23, PRE-Batch 5): 5 tipos de evento vía un EventModal genérico, matemática de cantidades client-side race-prone, cero reversión, cancelTrip BORRA assignments incluso con qty_delivered>0, confirmation_code con Math.random client-side, tarifa OPCIONAL, cost codes per-línea, sin GPS, **sin Sentry, sin tests, sin Husky**.
- De los 11 commits main-only, 10 tienen equivalente verificado en dev; **J6 fue revertido deliberadamente en dev** ("Cambio 4 — revert J6": costo siempre editable) → el merge regresa el comportamiento que prod tiene hoy Y contradice CLAUDE.md regla #9. Decisión pendiente de James.
- `git merge-tree` real: **8 conflictos de contenido** en el corazón (useTrips, useSolicitudes, useTripEvents, TripForm, LineEditor, DataTable, programacion/page, solicitudes/page) + **auto-merges peligrosos** (hunks V1 de J8a/b7ebf1a entrando silenciosamente a los archivos V2 reescritos de mis-viajes/[id] y solicitudes/[id]).
- **Dependencias duras del código dev en BD staging-only**: qty_dispatched (5 archivos), el embed PostgREST `cost_codes!sm_requests_cost_code_id_fkey` (400 → /solicitudes entera muere), trip_event_lines, delivery_observations, pickup/external orders + sus 14 RLS policies, qty_rejected, cancellation_reason, gps_vehicle_id. **Deploy del código merged sin la migración consolidada = fallo duro inmediato.** Dev no usa ningún `.rpc()` — toda la atomicidad nueva vive en triggers BD.

### 2.2 El código V1 EXPLICA mecánicamente la ficción de la data de prod

Cada síntoma reportado por James tiene causa identificada en main:
- **Líneas En Transito para siempre**: Retorno V1 no reconcilia líneas + "Retorno secundario" sin Entrega habilitado desde 2026-03-23; el widget que las haría visibles (PendingDeliveriesAlert) y la entrega tardía son dev-only → única salida = SQL manual.
- **"Eventos fuera de momento"**: event_timestamp = `new Date().toISOString()` del reloj del dispositivo al confirmar el modal (no now() de BD) — regla 16 de CLAUDE.md es falsa en prod.
- **Doble conteo**: en retry con 23505 el código V1 hace console.warn y CONTINÚA re-ejecutando qty_delivered = current + qtyThisTrip.
- **Evidencia destruida**: cancelTrip V1 borra TODOS los assignments — la data histórica de entregas en trips cancelados no existe (afecta el backfill de Cambio 6/6.5).
- **Cuantificación** (handoff 14-may): **89/129 eventos (69.0%) requirieron intervención admin; 32/36 MOVs (88.9%) tocadas a mano; solo 4 trips limpios**. Por tipo: Entrega 80.6%, Llegada 71.4%, Retorno 69.4%, Salida 55.6%. Firma forense binaria perfecta: microseconds=0 en event_timestamp. Existe un prompt frozen que **industrializa la corrección** con GPS SkyData como ground truth (ejemplo MOV-047: Charris dijo 6:50, sistema 9:07, GPS probó 8:31 — ninguna fuente humana coincidió con la física).
- **Mal uso documentado** (reporte a Rodrigo): 41.7% de trips sin Llegada, solicitudes con 5 materiales en 1 línea, movimientos internos disfrazados de taller→proyecto (5 solicitudes), CAB930 en 3 MOVs solapadas, Entrega antes de Llegada dejada así por decisión. Conductores abandonaron el app (Yanelys registraba las Entregas, no ellos).

### 2.3 La idempotencia real del event system (dev) es más débil de lo documentado

- EventModal **regenera el UUID inmediatamente tras CADA onConfirm** (éxito o fallo) — el checkpoint 23505 es prácticamente inalcanzable para Llegada/Retorno/Incidencia; un retry tras fallo de red duplica el evento con id nuevo. **Parada no tiene event_id en absoluto.** Solo Dispatch/Delivery implementan el patrón correcto (regeneración solo en catch).
- El branch Entrega completo de EventModal (CodeConfirmation + deliveredQtys) es **código muerto** — Entrega vive en DeliveryModal.
- La matriz de notificaciones de admin/masters tiene **13 de 18** event keys (faltan incidencia_ruta, retorno_registrado, viaje_editado, material_preparado, reversion_registrada — solo alcanzables vía receive_all).

### 2.4 BD: el ledger miente y el repo no versiona

- **El ledger de migraciones de prod NO describe su schema real**: Events V2 (marzo) se aplicó vía SQL Editor sin registrarse. Solo pg_catalog es confiable en prod.
- Reconstrucción: **24 funciones CONFIABLES** (cuerpo completo conocido) y **~13 que solo existen en la BD** — el repo nunca versionó las migraciones de Cambio 5, Blocks 2.A/2.B, ni la expansión de audit 2026-05-13 (que además no declara entorno).
- baseline.sql/full_schema.sql = snapshots stale de marzo (22 tablas) — mienten por omisión sobre staging (51 tablas/~39 funciones) y sobre prod.
- **19 funciones SECURITY DEFINER expuestas como RPC a anon y authenticated** (verificado en vivo); solo 2 tipadas en database.ts y CERO `.rpc()` en src — superficie de ataque sin uso legítimo del FE.
- La columna BD real es `mobilization_rates.rate`; "rate.amount" de la regla 9 es un campo del SelectOption del FE.

### 2.5 Seguridad — hallazgos nuevos

- **Secretos comprometidos en git**: password admin en texto plano (`tests/helpers.ts:20`, repetido en auth.setup), `supabase/seed.sql` con dump de auth.users (bcrypt cost-06 de ~16 usuarios reales) + refresh_tokens no revocados + PII (cédulas, teléfonos), SKYDATA_API_KEY con valor real en `.env.local.example`. El Event_Correction_Prompt también contiene credenciales SkyData vivas.
- **El código de confirmación se valida 100% client-side y viaja en el payload del trip a TODOS los roles** (incluido campo) — "MUST be correct, no bypass" es solo UI. Si el bypass alcanza también los datos depende de las policies operational_update (SQL pack).
- **Pickup/external orders se entregan SIN código y con receptor opcional** (+ bug receivedByName que guarda null cuando se elige del dropdown) — la regla 15 solo aplica a fleet trips.
- admin/masters: **todos los writes ignoran errores de Supabase** (un deny de RLS parece éxito) + bug que **bloquea crear Extras** (valida 'extra_type', el form envía 'code').
- La suite E2E de UI está **efectivamente muerta** (login roto BL-E2E-AUTH-BLOCKED + specs sin costCode post-Cambio 2); solo corren las suites BD-direct (45 tests) y cambio6.5.

### 2.6 Conceptos SOP — el mapa Logística + Equipos ahora existe

- **Logística = 8 procesos** (Compras PO-01 con OC en SAGE y 3 vías de entrega ≈ los 3 fulfillment types del app; Compras internacionales; Evaluación proveedores PO-03; Almacén Central PO-04 con kardex y Nota de Entrega 3 copias; Equipos Menores PO-05 con tarifa diaria y facturación mensual; **Movilizaciones PO-06**; EPP PO-07; Flota liviana PO-09). **Equipos = 6 procesos** (Mantenimiento con FLEETWISE como sistema central; Gestión PO-02 con tarifas = Base Fija + Base Operativa revisadas cada 6 meses vía F-02-03 y aprobación de inversión ≤B/.50K Alta Dirección; Alquiler a terceros; Herramientas; Almacén de Taller; Combustible).
- **La cascada de cost codes (Proyecto→Extra→Cta. Costo→Categoría) es transversal a toda la empresa** (bitácora de OCs F-01-05 de 2017 ya la tenía) — no es un invento de MovimientOS.
- **F-06-04 (bitácora operativa) ≠ F-06-05 (facturación mensual)**: el SOP separa el log por-movimiento (horas, remolque, permiso, combustible, sin dinero) del documento de cobro (Equipo MOVILIZADO vs Equipo UTILIZADO, código de costo, costo, subtotales por proyecto). **El app hoy modela algo cercano al F-06-04 y no produce nada compatible con el F-06-05 — que es lo que Charris necesita y mantiene a mano.**
- **El SOP es concepto, no práctica**: el F-06-04 solo existe en blanco en Drive (subido por el propio James), con códigos Spectrum viejos (520-xxx); y el flujo papel F-06-03 (formato 2012) **siguió vivo en paralelo al app** — Muelle 14 generó solicitudes 025→036 entre Feb y Mar-2026, después del go-live.

### 2.7 El universo real de movilizaciones — el app captura una fracción

- **Papel/Excel ≈ 4x el app solo en lo transcrito**: el consolidado manual de James (Feb-2026) ya tenía 184 solicitudes/487 líneas (146 Costa Norte, 24 Paraíso, 14 Muelle 14) vs 50 SM/48 trips en prod. Costa Norte acumula **149 movilizaciones numeradas** (SMOV-0001→0149, dic-24→mar-26).
- **Formato real de Charris** (verificado en 4 proyectos): 10 columnas + tabla de tarifas embebida de **14 códigos MV*** (MVG108 $2,000 … MVAPX1 $5,000). Es un documento de FACTURACIÓN, sin horas/remolque/permiso.
- **La economía real rompe el modelo flat-por-trip**: (a) tarifas de grúa agrupan N viajes físicos bajo 1 cobro (MVG318 $3,000 cubrió 4 viajes el 8-Nov-25 — los otros 3 con costo vacío); (b) **movimientos internos** (DESDE=HASTA=proyecto) son categoría operativa y facturable: $425 en Dic-25, **$100/movimiento sistemático en 2026 — tarifa que NO está en ninguna tabla**; (c) el mismo camión grúa se cobra B/.300-650 según proyecto; (d) vehículos alquilados/terceros ("ALQUILADO", placa cruda, nombre del conductor) conviven en la misma bitácora sin tarifa propia; (e) trabajo EN proyecto (izaje, instalar postes) se factura como fila de movilización; (f) COSTO vacío en ~12 de 14 meses de Costa Norte — la facturación se reconstruye tarde.
- **Calidad de la fuente Excel**: fechas corruptas (D/M parseado como M/D → seriales de meses incorrectos), identificadores de vehículo caóticos (CAB444 / 520-681 / 887944 / nombre de tercero), formatos de cost code inconsistentes ('01-7113' vs '017113-EQI' vs '25-506-01-7113-ICS').

### 2.8 Contradicciones canónicas consolidadas (CLAUDE.md/docs vs realidad)

| Canon | Realidad verificada |
|---|---|
| Regla 9: costo read-only con tarifa; "rate.amount" | Dev lo revirtió (Cambio 4); main/prod SÍ lo tiene. Columna BD = `rate`, no `amount` |
| Regla 12: solicitante NO editable | Admin lo edita vía Select en SolicitudForm |
| Regla 14: cost code 3 campos per-línea en LineEditor | Vive en HEADER (sm_requests) desde Cambio 2; LineEditor no valida nada de cost code |
| Regla 15: código siempre obligatorio, sin bypass | Pickup/external sin código y receptor opcional; validación fleet 100% client-side, código viaja a todos los roles |
| Regla 16: timestamps now() automáticos | Reloj del CLIENTE en ambas ramas; en prod, el 69% de los eventos fue además backdated por SQL admin |
| TRAIL: "266 ahead" | 269 ahead / **11 behind** — divergencia real con J6 revertido |
| BACKLOG: GPS "❌ Pendiente"; F3/F4 futuros | GPS MVP completo en dev desde 04-20; el entregable de F3 ya existe con formato exacto definido por Charris |
| CHANGELOG: Sentry "hecho" 04-09 | NO está en main — prod corre sin monitoreo de errores |
| Regla #15 vieja (pickup_by_project) en CLAUDE.md/skills | Modelo Cambio 3 eliminado; vigente = Cambio 5 (pickup/external orders) — ya flaggeado como HAR-01 |

### 2.9 Artefactos del cierre

- `Docs/sql-diagnostic-pack-2026-06-10.sql` — 33 queries + reconstrucción de funciones como header (commit `4161493`).
- Discovery persistido en `Docs/discovery/` + TRAIL re-secuenciado (commit `7a7a6b6`).
- Este documento = cierre formal del discovery 360. Los gaps restantes están 100% enumerados en §1.5 (SQL pack) y §1.4 (no-SQL).

---

## Key points

- Cobertura: código de AMBAS ramas, configs, tests, corpus SOP Logística+Equipos y universo Drive de movilizaciones leídos/verificados; los únicos huecos son (a) lo que requiere SQL vivo (pack de 33 queries ya commiteado en Docs/sql-diagnostic-pack-2026-06-10.sql), (b) formatos no parseables (xlsb/pbix) y (c) docs ausentes del corpus (PO-08, Excel vivo de Charris).
- main↔jaime/dev es DIVERGENCIA real: 269 ahead / 11 behind, 8 conflictos de contenido en archivos núcleo + auto-merges peligrosos en mis-viajes/[id] y solicitudes/[id]; J6 (costo read-only) existe en prod pero fue revertido deliberadamente en dev — decisión pendiente.
- Prod corre Events V1 sin Sentry/tests/Husky; el código V1 explica mecánicamente cada síntoma de James: Retorno no reconcilia → líneas En Transito invisibles, timestamps del reloj del cliente, bug 23505 con doble conteo, cancelTrip destruye assignments.
- Ficción de data cuantificada: 69% de eventos (89/129) y 88.9% de MOVs (32/36) requirieron intervención admin; firma forense = microseconds=0; existe prompt frozen que industrializa la corrección con GPS como ground truth.
- Deploy del código merged sin la migración BD consolidada = fallo duro inmediato (embed PostgREST de cost_code_id da 400 en /solicitudes; qty_dispatched, trip_event_lines, orders + RLS solo existen en staging).
- El ledger de migraciones de prod NO describe su schema real (Events V2 entró por SQL Editor sin registrarse); ~13 funciones viven SOLO en la BD sin versionar; 19 SECURITY DEFINER expuestas como RPC a anon/authenticated con cero uso legítimo del FE.
- Idempotencia real más débil de lo documentado: EventModal regenera el UUID tras cada confirm (checkpoint inalcanzable para Llegada/Retorno/Incidencia) y Parada no tiene event_id; solo Dispatch/Delivery implementan el patrón correcto.
- Secretos comprometidos en git: password admin en texto plano, seed.sql con hashes bcrypt cost-06 + refresh_tokens + PII de ~16 usuarios reales, SKYDATA_API_KEY real; código de confirmación validado client-side y visible a todos los roles; pickup/external se entregan sin código.
- El universo papel/Excel supera al app ~4x (184 SM/487 líneas transcritas vs 50 SM en prod; Costa Norte sola: 149 SMOV); el flujo papel siguió vivo DESPUÉS del go-live (Muelle 14 hasta Mar-2026).
- La economía real rompe el modelo flat-por-trip: tarifas de grúa agrupan N viajes bajo 1 cobro, movimientos internos a $100 (tarifa fuera de tabla), mismo vehículo B/.300-650 según proyecto, alquilados sin tarifa; el app modela el F-06-04 operativo pero Charris necesita el F-06-05 de facturación que mantiene a mano.
- CLAUDE.md reglas 9, 12, 14, 15 y 16 contradichas por el código verificado; TRAIL/BACKLOG/CHANGELOG con afirmaciones falsas adicionales (GPS pendiente, Sentry hecho, 266 ahead).

## Preguntas nuevas para James

1. ¿Podés exportar 'BITACORA FEBRERO 2026.xlsb' a .xlsx (y/o compartir el Excel VIVO de Charris)? Es el posible master multi-proyecto de facturación y prerequisito para entender el entregable que el app debería producir (F-06-05 real).
2. ¿Existe bitácora mensual de facturación de Paraíso 25-505? No apareció en Drive bajo ningún nombre buscado — confirmar con Charris dónde vive.
3. Tarifas: ¿la regla de $100/movimiento interno (2026) es acuerdo estable o ad-hoc (en Dic-2025 se cobró $425)? ¿Y cuál es la regla exacta de agrupación de tarifas de grúa — cuándo N viajes físicos cuentan como 1 cobro MVG*? Es conocimiento tácito de Charris/Valderrama que ningún SOP documenta.
4. ¿Quién corre el SQL pack (Docs/sql-diagnostic-pack-2026-06-10.sql, 33 queries read-only) y cuándo? Es el único camino para cerrar los ~16 gaps restantes: forense de prod, cuerpos vivos de 13 funciones, RLS viva, gates de la migración consolidada.
5. Decisión J6: el merge tal cual adopta el costo EDITABLE (revert de Cambio 4) — comportamiento distinto al que Charris ve hoy en prod y contrario a CLAUDE.md regla 9. ¿Se mantiene el revert o se restaura el read-only?
6. Secretos comprometidos en el historial git (password 'Frijolin31!', seed.sql con hashes+refresh_tokens+PII, SKYDATA_API_KEY): ¿la rotación + purga de historial (filter-repo/BFG) entra al scope de Fase 0?
7. ¿Podés conseguir IC-LOG-PO-08 (Alquiler de Equipo de Movilización a Proyectos)? Referenciado por PO-06 §5.3 pero ausente de ambas copias del corpus — relevante para entender el modelo de external_orders.
8. Los screenshots '25-505 Solicitud de Movilizacion 05-10.png' (Ene-2026): ¿Paraíso usó el app y volvió a papel? Define el patrón de abandono por proyecto, no solo por conductor.
9. ¿Confirmás en el dashboard de Vercel que prod despliega exactamente main@a591867 y que CRON_SECRET está configurado en el env de prod? Ninguno es verificable desde Code.
10. Los reportes .docx de mayo ('MovimientOS - Reporte de Registro de Eventos', 'Reporte de Adopción y Calidad de Datos'): ¿los leo en una misión corta? Cierran el loop de adopción a nivel de usuario individual — último hueco del corpus local.

## Critico final (estado de cobertura de TODO el discovery)

### Disputes

- FALSO — 'El Event_Correction_Prompt también contiene credenciales SkyData vivas' (§2.5): el archivo (iconsa_apps/MovimientOS_Event_Correction_Prompt.md) usa el placeholder '?key=<API_KEY>' (línea 191); no hay key ni password real. Sí contiene UUIDs de auth.users de Jaime (dato sensible menor, no credencial).
- IMPRECISO — 'sql-diagnostic-pack: 33 queries' (§1.5/§2.9): el archivo tiene 39 queries etiquetadas ([Q0.1..Q5.1] = 21 + [F1..F12b] = 18). Las 7 secciones S0-S6 y el commit 4161493 sí son correctos.
- SIN SOPORTE / PROBABLEMENTE FALSO — '§2.4: El ledger de prod NO describe su schema real: Events V2 (marzo) se aplicó vía SQL Editor sin registrarse': verificado en vivo via list_tables, prod public tiene 44 tablas y NO existen trip_event_lines, delivery_observations, custody_transfers ni pickup/external_orders; los types de main (generados de prod) tampoco tienen reverts_event_id ni qty_dispatched. Prod es V1 estructural — el ejemplo insignia del 'ledger miente' es falso. El punto general solo se sostiene con cambios menores documentados (p.ej. el ALTER valid_event_type 2026-04-20 sí entró a mano a prod).
- SOBREDECLARADO — §1.5 punto 6 ('existencia de trip_event_lines/delivery_observations/conteo real de tablas en prod solo se desbloquea con el SQL pack'): list_tables del MCP lo responde HOY sin SQL (lo respondí: no existen; 44 tablas public). Solo el nivel columna fino (p.ej. constraint bodies) requiere SQL o list_tables verbose.
- DISCUTIBLE — §1.5 punto 16 / pregunta 9 a James ('Vercel no es verificable desde Code'): el harness actual expone tools Vercel MCP (list_deployments, get_project, get_runtime_logs). No las ejecuté, pero el claim de imposibilidad ya no es cierto tal cual.
- AMBIGUO DE ENTORNO — '19 funciones SECURITY DEFINER expuestas como RPC a anon y authenticated (verificado en vivo)' (§2.4): exacto SOLO para staging (conté las 19 en advisors). En prod son 29 (authenticated) y 10 (anon) porque conviven funciones HumanOS. Presentarlo como cifra única de 'la BD' induce a error en prod.
- CIFRAS STALE (dirección correcta, números vencidos): prod hoy = ~149 tablas / 14 schemas de app (no 147/13); 53 SM / 51 trips / 166 eventos (no 50/48/159); los trips post-handoff-14-may son +15 (36→51), no '~12 MOVs nuevas'.
- PARCIALMENTE SOPORTADO — 'auto-merges peligrosos (hunks V1 entrando silenciosamente a mis-viajes/[id] y solicitudes/[id])': verifiqué que ambos archivos auto-mergean sin conflicto en git merge-tree (condición necesaria), pero NO inspeccioné el contenido de los hunks que entran; el adjetivo 'peligroso' queda sin evidencia directa en esta pasada.
- NO RE-VERIFICADO — 'de los 11 commits main-only, 10 tienen equivalente verificado en dev': no lo recontrasté commit por commit; tomar como claim del discovery previo sin verificación independiente.
- OMISIONES MATERIALES de la síntesis (no falsedades): (a) hay un SEGUNDO seed.sql trackeado en el ROOT del repo, presente en main y en jaime/dev — §2.5 solo nombra supabase/seed.sql, el blast radius del secreto es mayor; (b) advisory CRÍTICO vivo en prod: 11 tablas backup.* con RLS deshabilitada (incl. backup.auth_users_20260605 con 48 filas y backup.people_pre_consent_flag_20260605 con 370 filas de PII), exactamente el riesgo que Q0.3/Q0.4 del pack pregunta — la síntesis no lo menciona; (c) el COMMENT de BD en trip_events ('event_timestamp = automático now()') repite la mentira de la regla 16 en AMBOS entornos — los docs no son los únicos que mienten, la BD también.

### Blind spots restantes

- Cuerpos VIVOS de las ~13 funciones BD nunca versionadas (trg_recalc_from_* ×4, generate_pickup_id/external_id, auto_cancel_empty_* ×2, cascade_request_status v4, etc.) y los fingerprints S1 — advisors solo dan nombres/flags, no cuerpos; sigue requiriendo el SQL pack (execute_sql denegado por diseño).
- Matriz RLS viva (pg_policies USING/WITH CHECK), en particular operational_update en sm_request_lines y las policies de Storage (MIME vs heic/heif) — define si el bypass del código de confirmación es solo de UI o también de datos para rol campo. No verificable con las tools MCP permitidas.
- Constraint vivo valid_event_type en prod y staging (la igualdad de los 18 tipos sigue ASUMIDA del CHANGELOG, no observada).
- Column-level VIVO de prod: la ausencia de reverts_event_id/qty_dispatched/cost_code_id en prod la inferí de los types de main generados en abril + ausencia de tablas V2 — nadie ha corrido list_tables verbose=true sobre prod public (sí es posible sin SQL pack) ni el SQL pack S4.
- Forensia F1-F12b sobre data viva: los números 89/129 (69.0%) y 32/36 (88.9%) los verifiqué contra el TEXTO del HANDOFF_2026-05-14 — nunca fueron re-derivados de la BD; los +15 trips y +37 eventos post-handoff (hasta hoy) están completamente sin caracterizar (¿siguió la intervención manual?).
- Comportamiento del trigger generate_confirmation_code en prod frente al INSERT client-side con Math.random de main (¿sobreescribe o respeta?) — solo SQL (S2). Igual AD-2 (estado del trigger de custody_transfers en staging).
- Gates de la migración consolidada (S4/S6): trips con rate_id NULL en prod, drift de qty que violaría CHECKs 6/6.5, zombies En Transito, assignments destruidos por cancelTrip V1 — solo SQL.
- Vercel: qué commit despliega prod (¿main@a591867?) y si CRON_SECRET está configurado — verificable con las tools Vercel MCP del harness, aún no ejecutado por nadie.
- Contenido de los hunks auto-merged V1→V2 en mis-viajes/[id]/page.tsx y solicitudes/[id]/page.tsx (verifiqué que auto-mergean; no QUÉ entra).
- useSolicitudes.ts de main (~850 líneas) línea a línea; bodies de 13 de los 17 specs E2E; el detalle de los 11 commits main-only vs sus equivalentes en dev.
- Staging ledger ('45 migraciones') no recontado en vivo (list_migrations no invocado); el ENTORNO de la expansión audit_trigger 2026-05-13 (¿prod, staging, ambos?) sigue sin declarar en ningún ledger consultado.
- Exposed schemas reales de PostgREST en prod (Q0.3/Q0.4) — agravado por el hallazgo nuevo de las 11 tablas backup.* sin RLS: si 'backup' está expuesto, los hashes de auth.users backup son legibles con la anon key.
- Si el seed.sql del ROOT del repo es byte-idéntico al de supabase/seed.sql (no comparé hashes) y si los refresh_tokens del dump siguen sin revocar en prod.
- Corpus externo aún no leído: BITACORA FEBRERO 2026.xlsb, Solicitudes de Movilizacion.pbix, IC-LOG-PO-08 (ausente del corpus), Excel VIVO de Charris, 35 solicitudes papel restantes de Muelle 14, reportes .docx de mayo (Registro de Eventos 14-may, Estado 28-abr, Adopción 13-may) — los handoffs 05-11/05-14 y el Correction Prompt SÍ existen en iconsa_apps/ y sus cifras citadas coinciden.
- BL-EXCLUSIVITY (línea en 3 modalidades) sobre data viva de staging — solo SQL (S5); en prod la respuesta estructural ya está (las tablas Cambio 5 no existen).
- Validación FE de tarifa en dev: TripForm de dev NO tiene función validate ni mensaje 'tarifa requerida' — el enforcement real es type-level (Insert.rate_id required) + NOT NULL de BD staging; la frase de la regla 9 'validación bloquea guardar/editar sin tarifa' no está verificada como validación de UI con mensaje (matiz no cubierto ni por la síntesis ni por el discovery previo).

### Confianza

Verifiqué en vivo 16 claims load-bearing: git (rev-list, merge-tree, git show de main), código de ambas ramas línea por línea en los puntos citados, archivos de secretos, el SQL pack, los handoffs externos al repo, y BD viva via MCP read-only (list_tables staging+prod anunciado, get_advisors ambos). Resultado: la síntesis es sustancialmente correcta en todo lo verificable a nivel código — divergencia 269/11 exacta, los 8 conflictos exactos, Events V1 en main con cada mecanismo citado (Math.random useTrips:787, cancelTrip destruye assignments :1066, 23505 continúa y re-suma, timestamps de reloj cliente en ambas ramas), idempotencia débil (regen UUID tras cada confirm, Parada sin event_id), secretos confirmados (password en helpers.ts:20 y auth.setup.ts:61, seed con bcrypt+refresh_tokens+cédulas, SKYDATA key real), embed FK que rompe /solicitudes contra prod, pickup sin código con receptor opcional y bug receivedByName, masters ignorando errores y bug extra_type/code, matriz 13/18 exacta, forensia 89/129 y 32/36 textual en el handoff, J6 revertido (commit 790ad98), 19 SECURITY DEFINER exactas en staging, cero .rpc() en dev, mobilization_rates.rate. Los puntos débiles están concentrados en las afirmaciones sobre BD-prod presentadas como hechos: el claim 'Events V2 entró a prod por SQL Editor' es contradicho por el schema vivo (prod = V1 estructural, 44 tablas), y varios 'gaps que solo el SQL pack desbloquea' eran verificables hoy con MCP (los resolví). Cifras menores stale (147/13 tablas-schemas, 33 queries, 50/48/159, ~12 MOVs). Nivel de confianza global en la síntesis tras esta pasada: alto en código y harness (~95%), medio-alto en BD staging (~90%), medio en aserciones de prod no-estructurales (las forenses dependen del texto del handoff, no de re-derivación), y los disputes/omisiones listados deben corregirse antes de canonizar el documento. Archivos clave citados: C:/Users/Jaime Cucalon/Documents/iconsa_apps/movimientOS/src/hooks/useTrips.ts, src/hooks/useTripEvents.ts (main), src/app/(app)/mis-viajes/[id]/page.tsx, src/components/viajes/{DeliveryModal,DispatchModal,ParadaModal,CodeConfirmation}.tsx, src/components/programacion/{TripForm,ConfirmPickupOrderDeliveryModal}.tsx, src/hooks/{useSolicitudes,usePickupOrders,useMyTrips}.ts, src/app/(app)/admin/masters/page.tsx, tests/{helpers.ts,auth.setup.ts}, supabase/seed.sql + seed.sql (root), .env.local.example, Docs/sql-diagnostic-pack-2026-06-10.sql, y C:/Users/Jaime Cucalon/Documents/iconsa_apps/HANDOFF_2026-05-14 (cambios manuales).md.
