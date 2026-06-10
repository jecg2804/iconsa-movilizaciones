# Auditoría Integral MovimientOS — Documento Maestro

**Fecha:** 2026-06-03
**Autor:** Claude Code (auditoría asistida por agentes — recon 6 dimensiones + 7 auditorías profundas + 5 verificaciones adversariales + inspección live de Supabase/Google Drive)
**Destinatario:** James (dueño técnico)
**Branch auditado:** `jaime/dev` (no deployable a prod hoy — ver §0 y Fase 0)

---

## 0. Portada — Alcance, metodología, entornos, limitaciones

### Alcance

Auditoría 360° de MovimientOS, el sistema de operaciones de ICONSA (constructora pesada, Panamá), construido sobre Next.js 16.1.6 (App Router) + React 19.2.3 (React Compiler) + Supabase (Postgres + RLS) + Tailwind v4 → Vercel. El módulo en producción es **Movilizaciones** (digitalización del SOP IC-LOG-PO-06). Se auditaron, por igual:

1. Seguridad / RBAC / RLS
2. Lógica de negocio, máquinas de estado, fulfillment types
3. Integridad de datos y atomicidad transaccional
4. Base de datos: schema, master data, drift prod/staging, índices, triggers
5. UI/UX, mobile-first, accesibilidad, i18n
6. GPS (SkyData / proveedor entrante)
7. Notificaciones (Resend)
8. Testing y quality gates
9. Harness / fundación de ingeniería (.claude, docs, CHANGELOG-como-migraciones, plugins, CI)
10. Cumplimiento del SOP IC-LOG-PO-06
11. Arquitectura objetivo (multi-schema medallion, golden records, coexistencia con `hr.*`)
12. Estrategia de integración (Spectrum, ProjectSight, B2W, PayDay, SkyData, Google Drive)
13. Roadmap de módulos (catálogo SOP de ICONSA)
14. Plan de modernización de ingeniería

### Metodología

- **Recon de 6 agentes** sobre las dimensiones: auditorías previas, harness, arquitectura de app, GPS, BD+Spectrum, catálogo de Google Drive.
- **7 auditorías profundas** especializadas (UX/mobile/a11y, lógica/estados/fulfillment, SOP, seguridad/RBAC, testing/gates, notificaciones, master data).
- **3 diseños forward** (arquitectura objetivo, roadmap de módulos, plan de modernización de ingeniería).
- **5 verificaciones adversariales** de los hallazgos críticos (cada una intentó refutar el claim antes de confirmarlo): código de confirmación client-side, RBAC del proxy, drift `qty_dispatched`, funciones SECURITY DEFINER públicas, exclusividad de fulfillment.
- **Inspección live de Supabase** vía MCP read-only (staging `vonwkciosksqspyljzfy` + prod `bzeoszympkkicwlfdtcn`): `list_tables`, `list_migrations`, `get_advisors`, `list_extensions`.
- **Inspección de Google Drive** (catálogo de SOPs de ICONSA, carpeta DOCUMENTOS APROBADOS) y del PDF oficial IC-LOG-PO-06 (renderizado de páginas escaneadas + extracción de formularios).
- Integración, deduplicación y resolución de contradicciones entre fuentes (Claude vs Codex sobre severidad de atomicidad, alcance del drift, etc.).

### Entornos y accesos

| Entorno | project_ref | Rol | Tablas (public) | Estado |
|---|---|---|---|---|
| **prod main** | `bzeoszympkkicwlfdtcn` | producción, sirve a usuarios | **44** | release `v2026.04.15-2`; ledger de migraciones incluye `humanos_v2_*` (sistema RRHH) |
| **staging** | `vonwkciosksqspyljzfy` | branch persistente bajo el mismo proyecto | **51** | tiene Cambios 2→6.5 de movilizaciones; NO tiene `humanos_v2_*` |
| **humanos-dev** | `woonbmfmconldxbeqdnr` | branch de desarrollo de HumanOS | — | aislado |

Acceso a Supabase: **solo lectura** (MCP con `execute_sql`/`apply_migration` denegados). Acceso a Google Drive: lectura del catálogo de SOPs. Repo: lectura completa del working tree en `jaime/dev`.

### Limitaciones de esta auditoría

- **Read-only DB:** no se pudieron leer cuerpos de funciones (`pg_get_functiondef`) ni definiciones de policies RLS vía `execute_sql`. Los cuerpos de funciones se reconstruyeron del CHANGELOG (que contiene el SQL `[bd]` aplicado) y de `supabase/migrations/00000000000000_baseline.sql`. **Tres puntos quedan sin verificar a nivel SQL** y se marcan como tales: (a) la policy UPDATE de `people` (potencial escalada a admin — S13); (b) los cuerpos de las funciones SECURITY DEFINER tras `SET SCHEMA` para la migración multi-schema; (c) la query diagnóstica de exclusividad sobre prod.
- **GPS — proveedor entrante sin acceso:** ICONSA está migrando de SkyData a un proveedor GPS nuevo cuya API aún no está disponible para la auditoría. El módulo GPS depende de esa integración; se audita lo que existe (acoplamiento, código), pero la integración nueva es un **bloqueante externo** (§8).
- **ProjectSight, B2W, PayDay — sin acceso a APIs.** Se documentan como integraciones futuras con prerequisitos; no se pudo validar su contrato.
- **Spectrum:** auditado vía el harness `test-spectrum.ps1` (SOAP) y el inventario de extracción ya recogido. `GetVendors` falla en Spectrum (bloqueante de fuente para `vendors`).

---

## 1. Resumen ejecutivo

**Veredicto del app (sin endulzar):** MovimientOS es un producto **funcionalmente impresionante y operacionalmente en uso** (Charris programa viajes reales: prod tiene 50 solicitudes, 48 viajes, 159 eventos), con un workflow de movilizaciones más completo que cualquier herramienta comercial individual (código de confirmación + entrega per-línea + reversiones + paradas + entregas parciales). **Pero el código que vive en `jaime/dev` no es deployable a producción hoy**, y tiene cuatro fallos que deben cerrarse antes de cualquier merge: (1) la verificación de entrega es **bypasseable** porque el código de confirmación se valida solo en el cliente y se expone a todos los roles; (2) hay un **cisma total prod/staging** — los ledgers de migración divergieron desde marzo 2026 (prod corre `humanos_v2`, staging corre Cambios 2→6.5 de movilizaciones) y ninguna base es un "branch" de la otra; (3) `cancelSolicitud` deja líneas 'En Transito' y sus assignments huérfanos, produciendo **drift permanente**; (4) `recalc_qty_for_line` es ejecutable por cualquier authenticated vía RPC y muta estado bypasseando RLS.

**Veredicto del harness (sin endulzar):** el harness tiene buena disciplina documental (CLAUDE.md, rules, skills, lifecycle de plans/specs) pero **dos agujeros estructurales graves**: (a) las migraciones de BD viven como **prosa con SQL embebido dentro de un CHANGELOG de 103 KB**, no como archivos ejecutables versionados — esta es la causa raíz del cisma prod/staging y del type-gen frágil; (b) el único quality gate es `next build`, que **no ve `tests/**` ni falla por ESLint** — por eso 18 errores de lint y 1 error de tsc pasan desapercibidos, y por eso el incidente del Cambio 6 (18 tests verdes que no atraparon 4 bugs reales) fue posible. Además, CLAUDE.md y TRAIL.md describen un modelo de pickup (Cambio 3) que **ya fue eliminado del código** (Cambio 5): la documentación describe un sistema que ya no existe.

**Top 10 riesgos (ordenados por urgencia de acción):**

1. **SEC-01 (CRÍTICO):** código de confirmación validado client-side y expuesto a todos los roles → entrega bypasseable. La regla #15 ("MUST be correct, sin bypass") está rota. *Verificado: CONFIRMED.*
2. **DATA-01 (CRÍTICO):** cisma prod/staging — ledgers de migración divergentes; `jaime/dev` referencia tablas/columnas (`pickup_orders`, `qty_dispatched`, `qty_rejected`) que prod no tiene → `PGRST204` en runtime si se mergea sin migrar prod primero. *Verificado: CONFIRMED (drift mayor de lo documentado: 2 columnas + 7 tablas).*
3. **DATA-02 (CRÍTICO):** migraciones como prosa en CHANGELOG, no archivos versionados → sin fuente de verdad de schema, type-gen ambiguo, imposible reconciliar entornos programáticamente.
4. **LOG-01 (CRÍTICO):** `cancelSolicitud` no cancela líneas 'En Transito' ni dropea sus `trip_line_assignments` → drift permanente en solicitudes canceladas. *Verificado por trazado de código: CONFIRMED.*
5. **SEC-02 (ALTO):** `proxy.ts` solo aplica RBAC de ruta al rol `campo`; PM/almacén/logística alcanzan `/admin/masters` (guard client-side compensa parcialmente; RLS es el único backstop real de escritura). *Verificado: CONFIRMED, severidad MEDIA.*
6. **SEC-03 (CRÍTICO de credenciales):** password admin real (`jcucalon@iconsanet.com`) hardcodeado en tests committeados + API key de SkyData viva en `.env.local.example`. *Verificado: CONFIRMED.* Rotar YA.
7. **LOG-02 (CRÍTICO):** sin constraint de exclusividad entre las 3 modalidades de fulfillment; `recalc_qty_for_line` suma `qty_delivered` de las 3 tablas → cuenta hasta 3x si hay data corrupta. *Verificado: CONFIRMED, severidad MEDIA (latente, DROP deliberado en Cambio 5).*
8. **SEC-04 (ALTO):** `recalc_qty_for_line(uuid)` y 18 funciones más son EXECUTE-ables por anon/authenticated vía `/rpc/`. *Verificado: CONFIRMED parcial — solo 1 función muta estado de forma explotable (MEDIA); el resto es higiene.*
9. **TEST-01 (ALTO):** quality gate con agujero estructural — `tsc`/lint rojos invisibles al build; suite E2E que afirma estado final, no transiciones (lección Cambio 6 internalizada solo en 1 spec).
10. **DATA-03 (ALTO):** atomicidad simulada — cero RPCs de dominio, toda transacción es multi-statement client-side; fallo parcial deja estados inconsistentes que solo el refetch "esconde".

**El orden propuesto, una frase por fase:**

- **Fase 0 — Cimientos de seguridad e integridad (BLOQUEANTE de prod):** rotar credenciales, cerrar el bypass del código de confirmación, gatear RBAC server-side, revocar las RPC públicas, versionar las migraciones y resolver el cisma prod/staging — nada se mergea a prod hasta cerrar esto.
- **Fase 1 — Atomicidad y bugs de drift:** convertir las operaciones cascada (`cancelSolicitud`, `handleDelivery`, creación de orders) a RPCs transaccionales + Server Actions, arreglando de paso LOG-01 y agregando el constraint de exclusividad.
- **Fase 2 — Quality gates y patrones Next 16:** `tsc --noEmit` en pre-push, pgTAP como base de tests de BD, Server Components + searchParams, descomposición de los god-components en tándem.
- **Fase 3 — Cierre del SOP IC-LOG-PO-06 + quick wins UX:** bitácora exportable con combustible, regla de devolución, toasts, tap-targets, token de color roto, voseo.
- **Fase 4 — Plataforma de datos (multi-schema medallion) + primer módulo nuevo:** golden records + crosswalk + ingesta Spectrum, y arranque del cluster de equipo (Inspecciones primero).
- **Fase 5 — Expansión de módulos y dominios:** Combustible → Mantenimiento → Gestión 360° → Equipos menores; luego dominios nuevos como apps separadas.

---

## 2. Tabla consolidada de hallazgos

Ordenada por severidad. "Estado" = resultado de la fase Verify (Confirmado/Refutado/N-A = no sometido a verificación adversarial pero confirmado por trazado/inspección).

| ID | Dimensión | Severidad | Título | Archivo:línea | Estado |
|---|---|---|---|---|---|
| SEC-01 | Seguridad | CRÍTICO | Código de confirmación validado solo client-side y expuesto a todos los roles → entrega bypasseable | `DeliveryModal.tsx:137`; `mis-viajes/[id]/page.tsx:662-748,686`; `useMyTrips.ts:76`; `useTrips.ts:276,547,657,729` | Confirmado |
| DATA-01 | BD / Integridad | CRÍTICO | Cisma prod/staging: ledgers de migración divergentes; 2 columnas + 7 tablas que prod no tiene | staging 51 vs prod 44 tablas; `trip_line_assignments.qty_dispatched`/`qty_rejected`; `list_migrations` ambos | Confirmado |
| DATA-02 | Harness / BD | CRÍTICO | Migraciones como prosa SQL en CHANGELOG (103 KB), no archivos versionados | `Docs/CHANGELOG.md`; `supabase/migrations/00000000000000_baseline.sql` (único) | Confirmado |
| LOG-01 | Lógica | CRÍTICO | `cancelSolicitud` no cancela líneas 'En Transito' ni dropea sus TLA → drift permanente | `useSolicitudes.ts:918-929` | Confirmado |
| LOG-02 / BL-EXCLUSIVITY | Lógica / BD | CRÍTICO (latente→MEDIA) | Sin constraint de exclusividad entre trip/pickup/external; recalc cuenta hasta 3x | `recalc_qty_for_line` (BD); CHECK dropeado en `cambio5_drop_old_columns_simplify_cascade` | Confirmado (DROP deliberado) |
| LOG-03 / F#28 | Lógica | CRÍTICO | `'Programada'` es estado muerto; línea salta a 'En Transito' antes de la Salida | `recalc_qty_for_line` (BD, amend 2026-05-01); comentarios stale `useTrips.ts:838`, `mis-viajes/[id]:617` | Confirmado |
| SEC-03 | Seguridad | CRÍTICO (credenciales) | Password admin real hardcodeado en tests; API key SkyData viva en example | `tests/auth.setup.ts:60-61`; `tests/helpers.ts:20`; `.env.local.example:4` | Confirmado |
| SEC-04 | Seguridad | CRÍTICO→MEDIA | 19 funciones SECURITY DEFINER EXECUTE-ables por anon/authenticated; 1 muta estado | `recalc_qty_for_line(uuid)`; `baseline.sql:2513-2515` | Confirmado parcial |
| SEC-02 / LOG-C3 | Seguridad / RBAC | ALTO→MEDIA | `proxy.ts` solo gatea `campo`; otros roles alcanzan `/admin/masters` | `proxy.ts:80-90,99`; `roles.ts:7-12` (zero callers); `admin/masters/page.tsx:201-205,787` | Confirmado |
| DATA-03 | Integridad / Atomicidad | ALTO | Cero RPCs de dominio; toda transacción es multi-statement client-side (fallo parcial) | `mis-viajes/[id]:662`; `useSolicitudes.ts:816`; `usePickupOrders.ts:171`; grep `.rpc(` = 0 | Confirmado |
| SEC-05 | Seguridad | ALTO | 2 policies RLS `WITH CHECK (true)` para INSERT (feedback, suggestions) | advisor `rls_policy_always_true` | Confirmado |
| TEST-01 | Testing | ALTO | Gate con agujero: tsc/lint rojos invisibles al build; suite afirma estado final, no transiciones | `.husky/{post-commit,pre-push}`; `tests/programacion-viaje.spec.ts:34`; `Docs/cambio6-incidente.md` | Confirmado |
| NOTIF-01 | Notificaciones | ALTO | Alerta diaria pasa `reference_id='daily-alert'` (no-UUID) → log falla, dedup rota | `actions.ts:1106`; `send.ts:142-153` | Confirmado |
| NOTIF-02 | Notificaciones | ALTO | Cadena fire-and-forget desde cliente con `.catch(console.error)` (sin retry, sin Sentry) | 19 call-sites; `useTrips.ts:856`, `mis-viajes/[id]:518-537`, etc. | Confirmado |
| NOTIF-03 | Notificaciones | ALTO | `FROM_EMAIL` default sandbox `onboarding@resend.dev` → cero entregas silenciosas si falta env | `send.ts:18` | Confirmado |
| UX-A11Y-01 | UX / A11y | CRÍTICO | `text-iconsa-gold` es token inexistente → iconos de Material invisibles en 4 modales | `globals.css:17`; `DispatchModal.tsx:227`; `DeliveryModal.tsx:280,312`; `ParadaModal.tsx:209` | Confirmado |
| UX-M-01 | UX / Mobile | CRÍTICO | Tap-targets <44px en acciones de fila (uso con guantes/sol) | `LineRow.tsx:153-181,275-303`; `FileUploader.tsx:171-179` | Confirmado |
| LOG-04 / N#1 | Lógica | ALTO | Entrega tardía usa `line.status` global, no TLA local → falsos positivos/negativos | `mis-viajes/[id]:1052`; `PendingDeliveriesAlert.tsx:102` | Confirmado |
| LOG-05 / F#9 | Lógica | ALTO | `cancelTrip` sin guard de re-cancelación (permite re-cancelar Completado) | `useTrips.ts:988-1033` | Confirmado |
| LOG-06 / M3 | Lógica | ALTO | `cancelSolicitud` no pasa `cancellation_reason` a orders → cancel falla silencioso | `useSolicitudes.ts:860-866,899-906` | Confirmado |
| LOG-07 / F#18 | Lógica | ALTO | `PendingDeliveriesAlert.handleCancel` setea `qty_scheduled=0` sin tocar TLA → drift | `PendingDeliveriesAlert.tsx:152-160` | Confirmado |
| LOG-08 | Lógica | ALTO | Loops UPDATE sin error-check (updateTrip, complete*Order, handleDispatch) → fallo parcial silencioso | `useTrips.ts:946-953`; `usePickupOrders.ts:246-255`; `mis-viajes/[id]:632-638` | Confirmado |
| SEC-06 / S5 | Seguridad | CRÍTICO (cred.) | (ver SEC-03) `must_change_password` en `user_metadata` editable por el cliente | `proxy.ts:63` | Confirmado |
| SEC-13 | Seguridad | ALTO (sin verificar) | Policy UPDATE de `people` podría permitir auto-ascenso a admin | policy no trackeada — requiere `execute_sql`/Chat | No verificado |
| UX-A11Y-02 | UX / A11y | ALTO | 8 modales custom sin focus-trap, Escape, ni roles ARIA | `src/components/viajes/*Modal.tsx`; `programacion/{Create,Confirm}*Modal.tsx` | Confirmado |
| UX-I18N-01 | UX / i18n | ALTO | Voseo argentino en 3 strings de UI (Panamá usa tú/usted) | `programacion/viaje/[id]:950`; `mis-viajes/[id]:859`; `DeliveryModal.tsx:274` | Confirmado |
| UX-FB-01 | UX / Feedback | ALTO | Sin sistema de toasts; errores/éxitos solo inline (fuera de viewport en modales 90vh) | global (sin `sonner`/equiv.); `usePickupOrders.ts` (solo comentarios) | Confirmado |
| UX-E-01 | UX | ALTO | `LineRow` no colapsable + descripciones desktop sin `truncate` (rompe layout) | `LineRow.tsx:73,204` | Confirmado |
| MD-01 | Master Data | CRÍTICO (visión) | Cero columnas de provenance/sync en ninguna tabla maestra | las 51 tablas — grep de `source_system`/`synced_at` = 0 | Confirmado |
| MD-02 | Master Data | ALTO | External-ids sin UNIQUE: `equipment.spectrum_code`, `cost_codes.full_code`, `vendors.ruc`, `people.cedula` | `full_schema.sql:1091,1086`; vendors vacío | Confirmado |
| MD-03 | Master Data | ALTO | `people` mezcla 3 poblaciones sin discriminador (`person_type` ausente); `cedula` NULL | `full_schema.sql:715-743`; `seed.sql:196-206` | Confirmado |
| MD-04 | Master Data / Integr. | ALTO | `vendors` vacío pero referenciado por PO/rentals → OC/alquiler imposibles hoy | `vendors` 0 rows (ambos entornos) | Confirmado |
| SOP-01 | SOP | ALTO | Bitácora IC-LOG-F-06-04 no se genera (falta combustible + export); sin librería PDF/Excel | `package.json` (solo recharts); `trips` sin col. combustible | Confirmado |
| SOP-02 | SOP | ALTO | Devolución (§5.21 = nueva solicitud) no implementada; "Retorno" no la satisface | `useTripEvents.ts`; flujo de eventos | Confirmado |
| GPS-01 | GPS | ALTO (bloqueante ext.) | Integración GPS depende de proveedor nuevo sin API disponible | `src/app/api/gps/*`; `.env.local.example:4` | Confirmado |
| HAR-01 | Harness | ALTO | CLAUDE.md/TRAIL describen modelo pickup Cambio 3 ya eliminado (Cambio 5) | `CLAUDE.md` regla #15; `TRAIL.md`; skills | Confirmado |
| AD-5 / TEST-02 | Testing | ALTO | Helpers E2E frágiles + `BL-E2E-AUTH-BLOCKED` (login headless roto, workaround solo 1 spec) | `tests/helpers.ts:14-16,287`; `tests/auth.setup.ts` | Confirmado |
| TEST-03 | Testing | MEDIO | 18 errores lint (16 React Compiler purity + 2 `no-explicit-any`) + 1 error tsc | `dashboard/page.tsx:44,47`; `programacion-viaje.spec.ts:34`; `cambio6-integrity.spec.ts:662,686` | Confirmado |
| LOG-09 / E18 | Lógica | MEDIO | PM no puede cancelar SM 'En Proceso' (solo admin) | `solicitudes/[id]/page.tsx:75,725` | Confirmado |
| LOG-10 | Lógica | MEDIO | Sin ruta para "cerrar corto" una SM con líneas Parciales (queda En Proceso indefinida) | `cascade_request_status` (BD) | Confirmado |
| LOG-11 / A2 | Lógica | MEDIO | `updateSolicitud` borra TLA antes que la línea → TLA huérfano si trigger bloquea | `useSolicitudes.ts:707-718` | Confirmado |
| LOG-12 / M1 | Lógica / BD | MEDIO | Sin CHECK en campos de texto (status, line_status, event_type) → typo rompe cascade silencioso | schema (BD) | Confirmado |
| SEC-07 / S7 | Seguridad | MEDIO | `must_change_password` salteable vía `updateUser` (duplicado de SEC-06) | `proxy.ts:63` | Confirmado |
| SEC-08 / S8 | Seguridad | MEDIO | `proxy.ts` usa `.single()` en lookup de `people` (PGRST116 → redirect, lookup por request) | `proxy.ts:71-75` | Confirmado |
| NOTIF-04 | Notificaciones | MEDIO | Constraint `valid_event_type` enumerado a mano (hoy 18=18=18, frágil a evento #19) | `notification_log` CHECK + `actions.ts` (18 literales) | Confirmado (sync OK) |
| NOTIF-05 | Notificaciones | MEDIO | Dedup tiene race window (check-then-act sin lock) | `send.ts:97-123` | Confirmado |
| NOTIF-06 | Notificaciones | MEDIO | `notifyEntregaConfirmada` notifica TODAS las líneas asignadas, no solo las entregadas | `mis-viajes/[id]:520-524`; `actions.ts:643` | Confirmado |
| UX-M-02 | UX / Mobile | ALTO | Offset sidebar inconsistente (`md:pl-60` vs `md:pl-64`) → contenido desalineado | `Topbar.tsx:24` vs `Sidebar.tsx:41`/`AppShell.tsx:25` | Confirmado |
| UX-M-03 | UX / Mobile | ALTO | Date input de fecha requerida sin `min` → permite fechas pasadas en mobile | `SolicitudForm.tsx:249-255` | Confirmado |
| UX-A11Y-03 | UX / A11y | ALTO | Contraste de badges cálidos (yellow/orange-700) bajo WCAG AA bajo sol | `status.ts:4-36` | Confirmado |
| UX-F-01 | UX / Forms | ALTO | Errores del cost-code cascade no se muestran inline (Select soporta `error`, no se usa) | `SolicitudForm.tsx:257-301` | Confirmado |
| MD-05 | Master Data / BD | MEDIO | Drift schema-en-repo: `full_schema.sql`/baseline solo reflejan MVP (24 tablas) | `supabase/full_schema.sql`; baseline | Confirmado |
| SEC-09 / S14 | Seguridad | BAJO | Fallback de dominio incorrecto en emails (`rein-eisenwerk.com`) | `notifications/templates/index.ts` | Confirmado |
| SEC-10 / S9 | Seguridad | BAJO | Leaked-password protection desactivada en Supabase Auth | advisor `auth_leaked_password_protection` | Confirmado |
| HAR-02 | Harness | MEDIO | Contradicción Plan Mode: CLAUDE.md:192 dice "Plan Mode" vs tool-usage.md:24 "desactivado" | `CLAUDE.md:192`; `.claude/rules/tool-usage.md:24`; `.claude/settings.json:27` | Confirmado |
| HAR-03 | Harness | BAJO | 10 plugins habilitados, varios sin uso (ralph-loop, skill-creator, feature-dev solapa) | `.claude/settings.json` | Confirmado |
| HAR-04 | Harness | BAJO | Skills stale (`'Programada'` vivo, modelo pickup viejo); firma Co-Authored-By Opus 4.6 | `.claude/skills/*`; rules | Confirmado |
| TEST-04 | Testing | MEDIO | RLS sin cobertura E2E (suite usa service-role → bypasea RLS); pgTAP 1.3.3 disponible sin instalar | `tests/helpers.ts:14-16`; `list_extensions` staging | Confirmado |
| PERF-01 | BD | INFO | 57 INFO unindexed FK + 52 unused index (mayoría tablas vacías); 2 WARN auth_rls_initplan | advisor performance staging | Confirmado |
| LOG-13 | Lógica | BAJO | Dead code: `statusContextString` + columnas `pickup_*` en `format.ts:158-180`; `'Programada'` en constants | `format.ts:158-180`; `constants.ts:24`; `status.ts:15` | Confirmado |
| SOP-03 | SOP | MEDIO | Two Week Look-Ahead (IC-LOG-F-06-02) como registro formal distribuible no existe (solo calendario) | `programacion/calendario/page.tsx:46-48` | Confirmado |
| SOP-04 | SOP | MEDIO | Aprobación del Ingeniero (§5.2) degradada a campo de nombre opcional (sin gate) | `SolicitudForm.tsx:240-245`; `sm_requests.approved_by` nullable | Confirmado (decisión MVP) |

---

## 3. Seguridad, RBAC y RLS

### 3.1 El bypass del código de confirmación (SEC-01) — CONFIRMED

Este es el hallazgo de seguridad más grave y fue sometido a verificación adversarial (que intentó refutarlo buscando cualquier guard server-side y **falló en cada capa**).

La cadena de fallo:
- **El código real se manda al browser.** `useMyTrips.ts:76` selecciona `confirmation_code` para cada trip visible; `useTrips.ts` usa `SELECT *` (incluye el código) y lo mapea a `TripWithRelations` (`:276,729`). Cualquier authenticated — incluidos `campo`/`almacen`, que por regla #15 NUNCA deben verlo — lo lee del payload de red.
- **La validación es cosmética.** `DeliveryModal.tsx:137`: `codeValid = code === trip.confirmation_code` solo togglea el `disabled` del botón.
- **La escritura nunca re-chequea.** `handleDelivery` (`mis-viajes/[id]:686`) inserta `confirmation_code_used` como campo de auditoría free-text, sin compararlo nunca con `trips.confirmation_code`.
- **No hay guard server-side.** RLS de `trip_events` es solo por rol (`operational_insert WITH CHECK get_my_app_role() IN (...)`, `full_schema.sql:1988`); el único trigger de código es `generate_confirmation_code()` que **genera**, no valida; ninguna función de Cambio 6/6.5 lee el código. El cliente escribe directo a Postgres vía PostgREST.

**Exploit:** un `campo`/`almacen` salta el modal y hace `INSERT trip_events (event_type='Entrega', confirmation_code_used='0000')` + `INSERT trip_event_lines`. El trigger BD-5 mueve `qty_delivered`, `recalc_qty_for_line` marca la línea 'Entregada', `cascade_request_status` completa la solicitud — entrega forjada sin conocer el código.

**Severidad: ALTA** (no CRÍTICA-anónima porque requiere cuenta autenticada y `trip_events` es inmutable + auditado, detectable post-hoc). **Es bloqueante de prod.** Remediación: RPC `SECURITY DEFINER confirm_delivery(trip_id, code, lines[])` que compara server-side, revocar INSERT directo de `authenticated` a `trip_events`/`trip_event_lines`, y dejar de seleccionar `confirmation_code` para el rol que confirma.

### 3.2 RBAC del proxy (SEC-02) — CONFIRMED, severidad MEDIA

`proxy.ts:80-90` solo tiene `if (role === 'campo')`. No hay `else` ni `canAccess(role, pathname)`. `ROLE_ROUTES` (`constants.ts:83-110`) y `canAccess` (`roles.ts:7-12`) **existen pero no tienen callers** en el pipeline de request — solo los consume el nav (Sidebar/MobileNav). El layout (`(app)/layout.tsx:22-31`) solo verifica que el user tenga *algún* rol. El guard de `/admin/masters` es **client-side** (`useEffect` redirect + `return null`), así que hay un flash de la página + datos PII de `people` fetcheados antes del redirect. El backstop real de escritura es RLS (verificado: sin lints `rls_policy_always_true` en tablas master). Remediación: gate server-side en `proxy.ts` (`if (!canAccess(role, pathname)) redirect(homeOf(role))`) o un `(app)/admin/layout.tsx` server-side.

### 3.3 Funciones SECURITY DEFINER públicas (SEC-04) — CONFIRMED parcial

19 funciones DEFINER son EXECUTE-ables por anon+authenticated (advisor lints 0028/0029, GRANTs en `baseline.sql:2513-2515`). La verificación adversarial corrigió el framing de severidad:
- **17 son trigger-functions** que erroran al invocarse por RPC (sin contexto `NEW`/`TG_*`) → ruido, BAJA.
- **`rls_auto_enable()` es un falso positivo** — es event-trigger function, errora vía RPC; de hecho es una medida defensiva. REFUTED como vector.
- **`recalc_qty_for_line(uuid)` es la única standalone explotable** (MEDIA): muta `sm_request_lines` bypassando RLS, sin control del payload (recálculo determinístico), requiere un UUID válido (un authenticated puede obtenerlo). Es vector de manipulación de integridad, no de exfiltración/escalada.

Remediación (least-privilege): `REVOKE EXECUTE ... FROM anon, authenticated` en las 19 (ninguna se llama por `.rpc()` desde el cliente — grep = 0). Prioridad: `recalc_qty_for_line` primero.

### 3.4 Credenciales (SEC-03/SEC-06) — CONFIRMED, acción inmediata

- **Password admin real committeado:** `jcucalon@iconsanet.com` / `Frijolin31!` en `tests/auth.setup.ts:60-61`, `tests/helpers.ts:20`, y 3 specs más. **Rotar YA** y mover a `process.env`.
- **API key SkyData viva en `.env.local.example:4`** (`SKYDATA_API_KEY=1012_69e5a95385b2b`) — el `.env.local.example` SÍ está en git. Rotar + placeholder.
- **`must_change_password` en `user_metadata`** (editable por el propio user vía `updateUser`) → saltea el cambio forzado. Mover a `people` o `app_metadata`.

### 3.5 Sin verificar (SEC-13) — acción requerida con execute_sql

La policy UPDATE de `people` **no está en las migraciones trackeadas** (RLS base es pre-marzo). Si permite `auth_id = auth.uid()` sin restringir columnas, un PM se auto-asciende a admin (`get_my_app_role()` lee de `people`). **No se pudo confirmar ni refutar en read-only.** James/Chat debe leer la policy antes del merge v2.

### 3.6 Storage — REFUTED (correcto)

`storage.ts` usa `createSignedUrl`, valida MIME+size client-side, y las migraciones `security_block4_storage_mime_size` + `fix_storage_rls_sync` validan MIME/size **server-side en policies**. Sin acción crítica (pendiente menor: `deleteFile` no valida ownership de path).

---

## 4. Lógica de negocio, máquinas de estado y fulfillment types

### 4.0 Drift documental transversal (HAR-01)

CLAUDE.md (regla #15), TRAIL.md y BACKLOG (AD-1) describen el **modelo Cambio 3** (flag `sm_request_lines.pickup_by_project` + status `'Pickup Aprobado'` + `convertLineToPickup`). El código corre **Cambio 5** (tablas `pickup_orders`/`external_orders` + `*_order_lines`). La migración `cambio5_drop_old_columns_simplify_cascade` dropeó las 6 columnas pickup + el status. `'Pickup Aprobado'` y `convertLineToPickup` **no existen en `src/`** (grep = 0). La documentación describe un sistema que ya no existe.

### 4.1 Máquinas de estado — tablas de transiciones

**`sm_requests.status`** (Borrador → Enviada → En Proceso → Completada/Cancelada):

| Transición | Disparador | Implementación |
|---|---|---|
| (nuevo) → Borrador | PM/admin crea | App: `saveSolicitud` INSERT `'Borrador'` (`useSolicitudes.ts:592`) |
| Borrador → Enviada | "Enviar" | App: UPDATE tras insertar líneas (`:626-636`) |
| Enviada → En Proceso | línea pasa a Programada/En Transito/Parcial | Trigger `cascade_request_status` (`in_progress IN ('Programada','En Transito')`) |
| En Proceso → Completada | `delivered + cancelled = total AND delivered > 0` | Trigger `cascade_request_status` |
| {Enviada,En Proceso} → Cancelada | usuario / todas líneas Canceladas | App `cancelSolicitud` (`:944`); o trigger |

**`sm_request_lines.status`** (Pendiente → Programada → En Transito → Entregada/Parcial/Cancelada):

| Transición | Disparador | Implementación |
|---|---|---|
| (nuevo) → Pendiente | INSERT línea | default BD |
| Pendiente → **En Transito** (NO Programada) | INSERT en TLA/POL/EOL | Trigger `recalc_qty_for_line` — `'Programada'` ya NO se produce (LOG-03) |
| En Transito → Entregada | `qty_delivered >= quantity` | Trigger (vía BD-5) |
| En Transito → Parcial | entrega parcial sin assignment activo | Trigger branch 4 |
| {*} → Cancelada | cancelSolicitud / alert | App UPDATE directo (no trigger) |

**`trips.status`** (Programado → En Ruta → Completado/Cancelado):

| Transición | Disparador | Implementación |
|---|---|---|
| (nuevo) → Programado | `saveTrip` | App INSERT default |
| Programado → En Ruta | Salida | App `handleDispatch` (`mis-viajes/[id]:608`) |
| En Ruta → Completado | Retorno | App `registerEvent` (`useTripEvents.ts:99`) |
| {Programado,En Ruta} → Cancelado | cancelTrip | App `:1001` + trigger `enforce_cancellation_reason_trips` |

**`pickup_orders`/`external_orders`** (Aprobado → Entregado/Cancelado): bulk approve → INSERT; complete (todo-o-nada `qty_delivered=quantity_assigned`); cancel order o auto-cancel al remover última línea (trigger).

### 4.2 Bug crítico de estado (LOG-03 / F#28) — CONFIRMED

El amend del 2026-05-01 eliminó el step que producía `'Programada'`. Una línea asignada a un trip en estado `'Programado'` (pre-Salida) cae en la rama `scheduled_active > 0` → **'En Transito'**. El trip cuenta con `t.status NOT IN ('Cancelado','Completado')`, así que 'Programado' y 'En Ruta' son indistinguibles: **la línea muestra "En Transito" aunque el camión no haya salido.** Engaña a Charris, dashboards y los guards `enTransitoLines`. El UPDATE manual `status:'En Transito'` de `handleDispatch` es no-op (la línea ya estaba En Transito desde la asignación). `'Programada'` sigue listada en `constants.ts:24` y `status.ts:15` pero nada la produce.

### 4.3 Fulfillment types y exclusividad (LOG-02 / BL-EXCLUSIVITY) — CONFIRMED, MEDIA

Las 3 modalidades (FLOTA via trip + eventos; PICKUP via pickup_order, sin código/GPS; EXTERNAL via external_order + factura) convergen correctamente en `cascade_request_status` porque opera a nivel de línea agregada, agnóstico al tipo. **Pero no hay constraint de exclusividad** — el CHECK `sm_request_lines_pickup_external_exclusive` fue dropeado deliberadamente en Cambio 5 (decisión arquitectónica #2: "coexistencia operacional permitida"). `recalc_qty_for_line` suma `qty_delivered` de las 3 tablas sin dedup; si una línea está en las 3, cuenta hasta 3x. La única defensa es la validación JS no-atómica en cada `create*Order` + el CHECK `qty_invariant` (que cap-ea el total pero no previene el solape). En staging hoy: 0 corrupción (POL/EOL vacías). **En prod: no verificado — correr la query diagnóstica de BL-EXCLUSIVITY antes del merge v2.**

### 4.4 `cancelSolicitud` (LOG-01) — CONFIRMED, drift permanente

`cancelSolicitud` solo cancela líneas {Pendiente, Programada, Parcial} (`useSolicitudes.ts:927-929`) y solo dropea TLA de líneas 'Programada' (`:918-924`). Dado que casi todas las líneas activas están 'En Transito' (LOG-03), una SM "Cancelada" deja **líneas vivas + TLA huérfanos** → drift permanente. Además no pasa `cancellation_reason` a los orders (`:860-866`) → el trigger `enforce_cancellation_reason_*` puede rechazar el cancel si el order tiene entregas, y el código no chequea el error (LOG-06). Es el caso de uso perfecto para una RPC transaccional (Fase 1): atomicidad + cláusula correcta en un solo cambio.

### 4.5 Edge cases — los gaps no en el bug-registry

- **E18 / LOG-09:** PM no puede cancelar SM 'En Proceso' (solo admin) — gap operacional (`solicitudes/[id]/page.tsx:75,725`).
- **LOG-10:** sin ruta para "cerrar corto" una SM con líneas Parciales — queda 'En Proceso' indefinida salvo cancelar cada línea.
- Bien manejados: entregas parciales, reversión de Entrega (trigger BD-6 + observations sobreviven), doble-entrega (trigger `enforce_one_active_delivery`), idempotencia dispatch/delivery (checkpoint 23505), revert en trip cerrado (trigger BD-8).

---

## 5. Integridad de datos y atomicidad — el split correcto ('no todo es RPC')

### 5.1 Estado verificado (DATA-03)

Grep `.rpc(` en `src/` = **0 resultados**. `'use server'` solo en notificaciones, no en mutaciones de dominio. Toda transacción de negocio es una secuencia de `await supabase.from(...)` client-side. `handleDelivery` (`mis-viajes/[id]:662-781`) es el caso canónico: 7 pasos sin transacción. La atomicidad se "simula" con (a) checkpoint de idempotencia 23505 y (b) CHECK constraints que hacen fallar la 2ª transacción concurrente. Cubre el retry, **no el fallo parcial**.

### 5.2 Resolución de la contradicción Claude vs Codex sobre severidad

Codex/Chat tendieron a marcar la atomicidad como CRÍTICA universal; el owner intuyó (correctamente) que "no todo debería ser RPC". **Resolución:** la severidad real es **ALTA pero acotada** — el riesgo de fallo parcial es real pero mitigado en la operación single-Charris actual por los checkpoints + CHECKs. No es CRÍTICA-de-bloqueo-inmediato como SEC-01/DATA-01, pero sí es deuda que explota con concurrencia o múltiples clientes. El fix correcto NO es "mover todo a RPC", sino el split de 4 capas:

| Capa | Qué va aquí | Criterio | Ejemplos |
|---|---|---|---|
| **Trigger BD** | Invariantes cross-row que deben valer SIEMPRE sin importar quién escribe | "Si puede romperse desde cualquier ruta de escritura" | `recalc_qty_for_line`, `cascade_request_status`, CHECK `qty_invariant`, `enforce_one_active_delivery`. **Ya existen — NO tocar.** |
| **RPC (`SECURITY INVOKER`)** | Transacción de dominio: 2+ escrituras que deben tener éxito/fallar juntas | "Si un fallo a mitad deja huérfanos y RLS debe seguir aplicando" | `confirm_delivery`, `cancel_solicitud`, `create_pickup_order`, `save_trip` |
| **Server Action (`'use server'`)** | Orquestación + validación (Zod) + side-effects no-transaccionales (email) + `revalidatePath` | "BD + servicios externos + revalidación Next" | wrapper que llama al RPC, manda emails, revalida |
| **Código app** | UI state, optimistic, useSubmitGuard, navegación | "Solo presentación" | modales, formularios |

**Anti-patrón a evitar (el que el owner intuye):** RPCs `SECURITY DEFINER` que reimplementan invariantes que ya hace un trigger, o que bypassean RLS "por conveniencia" (cada RPC DEFINER amplía la superficie de SEC-04). La regla de oro: **el RPC orquesta y agrupa en una transacción; los invariantes los siguen garantizando los triggers/CHECKs. El RPC captura sus excepciones, no las re-valida.** Un Server Action con múltiples `await supabase.from()` NO da atomicidad (son HTTP requests separados a PostgREST) — la atomicidad real solo vive dentro de una función Postgres.

### 5.3 Operaciones a convertir (priorizadas)

P1: `cancelSolicitud` (arregla LOG-01 + atomicidad de una vez), `handleDelivery` (arregla SEC-01 con server-side code check), `createPickupOrder`/`createExternalOrder` (elimina rollback manual), `convertLineTo*`. P2: `handleDispatch`, `handleRevert`, `complete*Order`, `saveTrip`/`updateTrip`. P3: `PendingDeliveriesAlert.handleCancel` (arregla LOG-07).

---

## 6. Base de datos: schema, master data, single-schema, drift, índices, triggers

### 6.1 Drift prod/staging (DATA-01) — CONFIRMED, mayor de lo documentado

Verificación live confirma (datos actualizados a 2026-06-03):

| Métrica | STAGING (`vonwkciosksqspyljzfy`) | PROD (`bzeoszympkkicwlfdtcn`) |
|---|---|---|
| Tablas (public) | **51** | **44** |
| `trip_line_assignments` columnas | 9 (incl. `qty_dispatched`, `qty_rejected`) | 7 (**faltan ambas**) |
| Tablas staging-only | — | faltan: `pickup_orders`, `pickup_order_lines`, `external_orders`, `external_order_lines`, `trip_event_lines`, `delivery_observations`, `custody_transfers` |
| Ledger de migraciones | Cambios 2→6.5 movilizaciones | `humanos_v2_*` (50+ migs RRHH), sin Cambios 2→6.5 |

`src/lib/types/database.ts` está generado contra **staging** (incluye `qty_dispatched:2766`, `pickup_orders`, etc.) y el código usa `qty_dispatched` intensivamente (6 archivos, no es código muerto). **Si `jaime/dev` corriera contra prod fallaría con `column qty_dispatched does not exist` / `PGRST204`.** Prod no falla hoy porque corre el código de `main` (release anterior). El riesgo se materializa **solo en el merge** si la BD de prod no recibe primero el script consolidado. Nota: CLAUDE.md dice "47 tablas" — ningún entorno tiene 47 (prod 44, staging 51).

### 6.2 El cisma (DATA-01 ampliado): no es drift, es divergencia de ancestro

Los ledgers de migración divergieron desde marzo 2026: prod fue por el camino `humanos_v2` (un sistema RRHH completo en el mismo proyecto), staging por `cambio2…cambio6_5` (movilizaciones). Prod **nunca recibió** Cambios 2-6.5; staging **nunca recibió** `humanos_*`. Las dos bases **ya no son reconciliables por "branch"**. Esto invalida la premisa operativa "staging es un branch de prod" y obliga a tratar el merge v2 como una **reconstrucción de baseline** (Fase 0), no un `db diff`.

### 6.3 Master data y problema single-schema

- **MD-01 (CRÍTICO de visión):** cero columnas de provenance/sync en ninguna tabla maestra. La BD no puede responder "¿este registro vino de Spectrum, PayDay, o se creó a mano?".
- **MD-02:** external-ids sin UNIQUE — `equipment.spectrum_code` (`full_schema.sql:1091`, PK solo en `id`), `cost_codes.full_code`/`(project_id,extra_id,phase_code)` (`:1086`), `vendors.ruc`, `people.cedula`. Re-importar de Spectrum duplicaría.
- **MD-03:** `people` mezcla app-users + empleados + subcontratistas sin `person_type`; `cedula` NULL en todos los seeds; `people.code` con datos sucios (`'\n\tTRO048'`, `seed.sql:196-197`).
- **MD-04:** `vendors` vacío (0 rows ambos entornos) pero referenciado por PO/rentals → OC/alquiler imposibles hoy; `GetVendors` falla en Spectrum (bloqueante de fuente).
- **MD-05:** `supabase/full_schema.sql` y baseline solo reflejan el MVP de 24 tablas; las 27 tablas/columnas expandidas (migración `20260317171721`+) solo viven en la BD live. **No usar los archivos del repo como fuente de verdad de schema.**

### 6.4 Índices y triggers

- Advisor performance (staging): 57 INFO unindexed FK + 52 unused index (mayoría en tablas aspiracionales vacías), 2 WARN `auth_rls_initplan`, 2 WARN `multiple_permissive_policies`. **Nada bloqueante**, pero al poblar PO/rentals/vendors hay que indexar sus FKs.
- Triple-trigger encadenado frágil (sync BD-5/6 → recalc → cascade), todos AFTER FOR EACH ROW — orden de filas no garantizado en operaciones batch (LOG observación arquitectónica).
- Sin CHECK en campos de texto (LOG-12): un typo (ej. "En Tránsito" con acento) pasa silencioso y rompe el cascade.

---

## 7. UI/UX, mobile, accesibilidad e i18n

Stack confirmado: Tailwind v4 (config en `globals.css` con `@theme inline`). **No existe sistema de toasts** (las menciones a "toast" en `usePickupOrders.ts` son comentarios). Todo feedback es `setError` inline.

### 7.1 Hallazgos críticos

- **UX-A11Y-01 (CRÍTICO, fix de 5 min):** `text-iconsa-gold` es un token inexistente — `globals.css:17` define `--color-gold` pero NO `--color-iconsa-gold`. En Tailwind v4 es una utilidad indefinida → los iconos `Package` (Material) heredan gris/negro en lugar de dorado en 4 modales (`DispatchModal:227`, `DeliveryModal:280,312`, `ParadaModal:209`). Rompe la distinción visual Equipo (azul) vs Material (dorado). Fix: `text-iconsa-gold` → `text-gold`.
- **UX-M-01 (CRÍTICO):** tap-targets <44px en acciones de fila (`LineRow.tsx:153-181,275-303`: `p-1.5` + iconos `h-4 w-4` → ~28px). El owner describe uso con guantes bajo sol; 44px es el mínimo WCAG 2.5.5/Apple HIG.

### 7.2 Quick wins de UX mobile (orden impacto/esfuerzo)

1. [5 min] `text-iconsa-gold` → `text-gold` (4 archivos) — UX-A11Y-01.
2. [5 min] `Topbar.tsx:24` `md:pl-64` → `md:pl-60` (alinea header) — UX-M-02.
3. [10 min] Corregir voseo: `programacion/viaje/[id]:950` ("querés"), `mis-viajes/[id]:859` ("reversá"), `DeliveryModal.tsx:274` — UX-I18N-01.
4. [15 min] Tap-targets a `min-h-11 min-w-11` en `LineRow`/`FileUploader` — UX-M-01.
5. [10 min] `truncate` en descripciones desktop `LineRow.tsx:73` — UX-E-01.
6. [10 min] `min={todayStrInPanama()}` en date input `SolicitudForm.tsx:249` — UX-M-03.
7. [20 min] Contraste: `text-yellow-700`→`800`, `text-orange-700`→`800` en `status.ts` — UX-A11Y-03.
8. [30 min] Pasar `error` a los Selects del cost-code cascade en `SolicitudForm` — UX-F-01.

### 7.3 Mejoras estructurales (no quick wins)

- **Toasts (UX-FB-01):** introducir `sonner` para confirmar éxitos (hoy una entrega exitosa no confirma nada visible → riesgo de doble-submit en 3G) y mostrar errores de acción. Mantener inline solo para validación de campo. Mayor impacto mobile.
- **Focus-trap + ARIA + Escape (UX-A11Y-02):** los 8 modales custom son `<div fixed>` planos sin `role="dialog"`/`aria-modal`/focus-trap (solo `ui/Modal.tsx` con `<dialog>` nativo lo hace, y solo `ConfirmDialog` lo usa). Migrar o añadir focus-trap.
- **Expandabilidad (UX-E-01):** la queja del owner ("líneas no expandibles") apunta a `LineRow` (plano, no colapsable) — no a la lista de solicitudes (que SÍ tiene expand vía `DataTable.expandRender`). Hacer `LineRow` colapsable en mobile.

### 7.4 i18n — positivo con 3 fugas

UI 100% español correcto salvo **3 strings con voseo argentino** (Panamá usa tú/usted) — ver quick win #3. Acento canónico "En Transito" (sin tilde) respetado.

---

## 8. GPS (alto nivel)

**Estado:** el MVP de GPS live tracking está construido (`src/app/api/gps/*`, `TripLiveMap`, bootstrap de 13 vehículos en staging vía `equipment.gps_vehicle_id`) contra **SkyData**. El acoplamiento está **bien aislado** — la API route maneja estados (`live`/`stale`/`no_gps`/`not_in_route`) sin contaminar el modelo de dominio, y la columna `gps_vehicle_id` es nullable (solo 13 vehículos con dispositivo).

**Qué está roto / pendiente:**
- **GPS-01 (bloqueante externo):** ICONSA migra a un **proveedor GPS nuevo** cuya API aún no está disponible para la auditoría. La integración actual (SkyData) seguirá funcionando hasta el corte, pero el módulo no avanza sin el contrato del proveedor nuevo: identificador de vehículo (¿spectrum_code o placa? — recordar la ambigüedad de bootstrap de SkyData), formato de posición, webhooks/geofencing, autenticación.
- **SEC (relacionado):** la API key vive en `.env.local.example` (SEC-03) y debe ir a `vault` (Fase 4).
- **Prod:** el bootstrap de `gps_vehicle_id` (13 UPDATEs por spectrum_code + 3 por plate) está en staging, **pendiente prod** en el script consolidado del merge v2.

**Recomendación:** no invertir en el módulo GPS hasta tener el contrato del proveedor nuevo. Cuando llegue, encapsular el adaptador detrás de la misma interfaz de la API route actual (que ya está bien aislada) y mover la credencial a `vault`. Para la plataforma de datos (Fase 4), el GPS entra como una fuente más (`raw.<gps>_positions` + snapshot por `pg_cron`).

---

## 9. Notificaciones

El núcleo de envío está **bien construido** (escaping/XSS completo en los 18 templates, fail-closed dedup, multi-PM correcto con `getTripProjectPMs`, status filters exhaustivos, timezone Panamá en el cron, constraint `valid_event_type` hoy 100% sincronizado código↔staging↔prod = 18). **Pero el subsistema NO es production-reliable** por tres fallos ALTOS:

- **NOTIF-01:** `notifyAlertaDiariaUrgentes` pasa `reference_id='daily-alert'` (string no-UUID) a una columna `uuid` → el INSERT a `notification_log` falla (`invalid input syntax for type uuid`), el log de auditoría no persiste, **y la dedup de 5 min queda rota** para la alerta diaria (que corre 6 días/semana en prod). El email sí se envía (Resend ocurre antes del log). Fix: UUID sentinela fijo o `reference_id` nullable.
- **NOTIF-02:** la cadena entera se dispara **fire-and-forget desde el cliente** con `.catch(console.error)` (19 call-sites). Si el user navega/cierra el tab o la action falla, el error muere en la consola del browser — sin retry, sin dead-letter, sin Sentry. Fix mínimo: `Sentry.captureException` en los `.catch` de eventos críticos; ideal: mover el trigger a server-side (encaja con las Server Actions de Fase 1).
- **NOTIF-03:** `FROM_EMAIL` default = `onboarding@resend.dev` (sandbox que solo entrega al dueño de la cuenta). Si `RESEND_FROM_EMAIL` falta en prod → cero entregas silenciosas. Fix: fail-fast en producción si la env var no está.

MEDIOS: constraint enumerado a mano (NOTIF-04, frágil a evento #19), dedup race window (NOTIF-05), `notifyEntregaConfirmada` notifica todas las líneas asignadas no solo las entregadas (NOTIF-06). En operación single-Charris funciona en la práctica; los 3 ALTOS son fixes acotados.

---

## 10. Testing y quality gates (output real)

### 10.1 Gates — output real 2026-06-03

- **`npm run lint` → ROJO:** `✖ 52 problems (18 errors, 34 warnings)`. Los 18 errores: 16 de `react-hooks/*` (React Compiler purity — `Date.now()` en render en `dashboard/page.tsx:44,47`, ref en render en `mis-viajes/[id]:222`, setState en effect) + 2 `@typescript-eslint/no-explicit-any` en `tests/cambio6-integrity.spec.ts:662,686`.
- **`npx tsc --noEmit` → ROJO:** un error — `tests/programacion-viaje.spec.ts(34): Cannot find name 'sol'`. Causa raíz: variable `sol` declarada en `beforeAll` pero referenciada en el test fuera de scope (debería ser `solicitudId`).

### 10.2 El agujero estructural del gate (TEST-01)

`npm run build` es VERDE pese a lint/tsc rojos por tres razones verificadas:
1. **`next build` solo type-checkea el build graph, no `tests/**`** — el error de tsc en tests es invisible al build (pero `tsc --noEmit` lo ve porque `tsconfig.json:27` incluye `**/*.ts`).
2. **`next build` NO falla por ESLint** en Next 16 — el React Compiler, ante código impuro, omite la optimización (degrada a no-memoizado) en vez de fallar. Consecuencia: el React Compiler está silenciosamente deshabilitado en las 6 páginas core (dashboard, mis-viajes/[id], programacion, programacion/viaje/[id], solicitudes/[id], solicitudes/nueva) — justo las que Charris y conductores usan en celular.
3. **El gate real es `next build`** (`.husky/post-commit` + `pre-push`), y **ni post-commit ni pre-push corren lint ni tsc.**

**Corrección #1 de mayor ROI (2 líneas):** agregar `npx tsc --noEmit` al `.husky/pre-push`. Habría atrapado el bug de `sol` Y cualquier drift de tipos en tests.

### 10.3 La lección del Cambio 6 (`Docs/cambio6-incidente.md`)

18 tests verdes no atraparon 4 bugs reales — todos de triggers Postgres, ninguno de React. Causa raíz: los tests afirmaban el **estado final** de escenarios de cancelación/constraint, NO las **transiciones intermedias** del flow Salida→Entrega→Retorno. El smoke manual (5 min de uso) ejercitó el flow real y vio los estados que los tests nunca inspeccionaron. La lección ("tests E2E deben cubrir flow operativo, no solo invariantes") se internalizó **solo en `cambio6-5-event-refinement.spec.ts`**; el resto del suite mantiene el patrón "estado final, no transición".

### 10.4 Recomendación de testing

- **P0:** `tsc --noEmit` en pre-push + arreglar `programacion-viaje.spec.ts:34` + política sobre los 18 lint (arreglar los 16 de purity re-habilita el React Compiler, o documentar que lint no es gate).
- **P1 (ROI máximo):** pgTAP (1.3.3 disponible en staging, sin instalar) como base — los bugs viven en Postgres (probado por Cambio 6). Migrar los 4 specs BD-direct (`cambio6-integrity`, `cambio6-5-bd-triggers`, `data-integrity`, `audit-gates`) de Playwright a pgTAP (corren en `BEGIN…ROLLBACK`, sin browser, sin `workers:1`, sin data collisions). **TEST-04:** el suite actual usa service-role → bypasea RLS, así que el bug "RLS enabled sin policy" de Cambio 5 jamás habría sido atrapado.
- **P2:** resolver BL-E2E-AUTH-BLOCKED globalmente (workaround `storageState` solo cubre 1 spec; 15 specs probablemente no corren en CI), endurecer helpers (AD-5), aplicar el patrón "afirmar estado intermedio" al resto.
- **Diferir explícitamente:** Storybook, Chromatic, Lighthouse CI, Cypress, mutation testing, MSW (net-negativos a esta escala).

---

## 11. Harness / fundación

**Fortalezas:** disciplina documental real (CLAUDE.md detallado, rules de git/supabase/lifecycle, skills on-demand, TRAIL como single-page de posición). Los 3 layers client-side de git (deny patterns + Husky + documental) cubren a los únicos actores con write access.

**Agujeros:**
- **DATA-02 (CRÍTICO):** migraciones como prosa SQL en CHANGELOG (103 KB), no archivos versionados. Un solo `00000000000000_baseline.sql` (marzo) + todo lo demás como bloques `[bd]` que un humano copia-pega al SQL Editor. Causa raíz del cisma (DATA-01) y del type-gen frágil. `.claude/rules/supabase-readonly.md` dice explícitamente "El proyecto NO usa archivos de migración" — esa regla debe invertirse.
- **HAR-01 (ALTO):** CLAUDE.md (regla #15) y TRAIL describen el modelo pickup Cambio 3 ya eliminado (Cambio 5). Documentación de un sistema que no existe.
- **HAR-02 (MEDIO):** contradicción Plan Mode — `CLAUDE.md:192` ("Feature nuevo → Plan Mode") vs `tool-usage.md:24` ("Plan mode nativo desactivado, EnterPlanMode en deny") + `.claude/settings.json:27`. Corregir CLAUDE.md a "→ superpowers:brainstorming".
- **HAR-03/04 (BAJO):** 10 plugins habilitados, varios sin uso (ralph-loop, skill-creator; feature-dev solapa con brainstorming); skills stale (`'Programada'` vivo, modelo pickup viejo); firma Co-Authored-By dice Opus 4.6 (entorno es 4.8). BL-CLAUDE-FOLDER-CLEANUP ya lo lista.

**Type-gen frágil:** `database.ts:3508` tiene el helper `Row<T>` re-añadido a mano (cada `gen types` lo borra). Fix: separar `database.gen.ts` (100% generado) de `database.ts` (barrel manual con `Row<T>`/`Insert`/`Update`), generar contra `--local` (no contra remoto ambiguo), gate de drift en CI.

**CI ausente:** no hay GitHub Actions; el "CI" es el build background local + Vercel preview. Para gold standard: workflow mínimo (`tsc --noEmit` + lint + build + pgTAP) en PR a `main` — pero solo tiene sentido **después** de resolver el cisma (un CI verde contra schema ambiguo da falsa confianza).

---

## 12. Cumplimiento del SOP IC-LOG-PO-06

**Versión auditada:** IC-LOG-PO-06 VV.02 (25-Abr-2018). MovimientOS digitaliza con **alta fidelidad el núcleo transaccional** (solicitud → programación → ejecución → entrega), mejorando trazabilidad, cascada, códigos de costo y auditoría sobre el papel.

### Matriz de cumplimiento (resumen)

| # | Requisito SOP | Estado | Nota |
|---|---|---|---|
| R1 | Transporte oportuno hacia/desde proyectos (§1) | Sí | Núcleo cumple |
| R3 | Solicitud IC-LOG-F-06-03 (§5.7) | Sí | Digitalizado |
| R4 | Aprobación del Ingeniero (§5.2, "Aprobado por") | Parcial (SOP-04) | Campo de nombre opcional, sin gate (decisión MVP) |
| R6 | Two Week Look-Ahead IC-LOG-F-06-02 (§5.8,5.15) | Parcial (SOP-03) | Calendario sí; registro formal distribuible no |
| R9/R10 | Permiso ATTT (Anexo 1) + Escolta | Parcial | Flags + adjunto opcional, no el formulario estructurado |
| R11 | Inspección IC-EQ-F-01-02 (42 ítems) (§5.10,5.19) | No (scaffolding) | Tablas existen (0 rows), sin UI — Post-MVP |
| R12/R13 | Nota de Entrega IC-LOG-04-04 + firma del Ingeniero (§5.18-20) | Desvía | Código de 4 dígitos sustituye la firma (decisión 2026-04-16) |
| R14 | Bitácora IC-LOG-F-06-04 (§5.22-23) | **Gap (SOP-01)** | No se genera; falta combustible; sin librería export |
| R15 | Facturación mensual IC-LOG-06-05 (§5.24) | No (scaffolding) | `mobilization_campaigns` vacío — Post-MVP |
| R18 | Devolución = nueva Solicitud (§5.21) | **Gap (SOP-02)** | "Retorno" no la satisface; regla no implementada |
| R20 | Confirmación por correo si cambia fecha (§5.12) | Parcial | Notificaciones de reprogramación cubren el espíritu |

### Desviaciones

**Conscientes (aceptables como MVP):** aprobación reducida a campo opcional (R4), código de 4 dígitos en vez de firma (R12/13), ATTT/Escolta como flags (R9/10), facturación e inspección diferidos (R15/R11), transporte externo modelado como External/Pickup Orders en vez de IC-LOG-PO-01 (R8).

**Gaps accidentales (el SOP los exige, ninguna nota los justifica):**
- **SOP-01:** Bitácora IC-LOG-F-06-04 sin consolidación/export y **sin dato de combustible** ("gls"). El SOP la exige como registro (§7).
- **SOP-02:** §5.21 (devolución = nueva solicitud) no modelada — el retorno de equipo al taller queda sin trazabilidad de solicitud.
- **SOP-03:** Two Week Look-Ahead como registro distribuible a Alta Dirección/Almacén/proyectos (§5.15).

**Prioridad de cierre del SOP (Fase 3):** (1) Bitácora exportable con combustible; (2) regla de devolución §5.21; (3) reporte mensual IC-LOG-06-05; (4) gate de aprobación del Ingeniero. Nota: ninguna librería de PDF/Excel/CSV está en `package.json` (solo `recharts`) — los reportes requieren esa decisión primero.

---

## 13. Arquitectura objetivo (multi-schema medallion)

**Decisión raíz:** ICONSA NO necesita una segunda Postgres. Necesita **disciplina de schemas dentro de la Postgres que ya tiene**. Esto está **probado en la misma BD**: `hr.*` ya vive dentro del proyecto prod (19 tablas, `hr.people` 370 rows, `hr.person_sources` 453 rows = un crosswalk de lineage ya funcionando). Toda la maquinaria de ingesta ya está instalada (`pg_cron`, `pg_net`, `wrappers` FDW, `pgmq`, `vault`, `http`, `pg_partman`, `pgvector`, `postgis`).

### Layout de schemas (medallion + golden record)

```
FUENTES → EXTRACTORES (Edge Fn SOAP/REST + pg_net + wrappers FDW)
  → raw.*          (landing jsonb append-only, particionado, NO expuesto)
  → staging.*      (tipado + dedup + match, NO expuesto)
  → masterdata.*   (golden records + entity_crosswalk, NO expuesto directo)
  → movilizaciones.* (transaccional app, FK a masterdata)   hr.* (YA EXISTE, aislado)
  → public.*       (FACHADA: solo vistas + RPCs, RLS aquí, ÚNICO schema expuesto a PostgREST)
```

| Schema | Propósito | Expuesto a PostgREST | Escribe |
|---|---|---|---|
| `raw` | Landing inmutable jsonb + metadata de procedencia, particionado por `extracted_at` | NO | extractores (service_role) |
| `staging` | Tipado + dedup + matching pre-merge | NO | jobs de transformación |
| `masterdata` | **Source of truth de maestras** + `entity_crosswalk` | NO directo (vía vistas public) | jobs de merge |
| `movilizaciones` | Transaccional de la app, FK a masterdata | NO directo (vía vistas/RPC) | RPCs + RLS |
| `hr` | **YA EXISTE**, dominio humanos, aislado | parcial | HumanOS |
| `public` | **Fachada delgada** (vistas + RPCs), RLS/grants para anon/authenticated | SÍ (único contrato) | nada |

**Lo crítico:** `raw`/`staging`/`masterdata`/`movilizaciones` **nunca** se añaden a Exposed Schemas. Doble candado: exposed-schemas + `REVOKE ALL ON ALL TABLES/FUNCTIONS IN SCHEMA public FROM anon, authenticated` (revertir el `GRANT ALL` actual) + default privileges restrictivos. Esto **cierra de raíz SEC-01/SEC-02/SEC-04**: el cliente no puede leer `confirmation_code` ni llamar `recalc_qty_for_line` porque viven en schemas no expuestos con EXECUTE revocado.

### Golden record & crosswalk

`masterdata.entity_crosswalk(entity_type, golden_id, source_system, source_id, confidence, last_synced_at, UNIQUE(entity_type, source_system, source_id))` — replica `hr.person_sources`, soporta N fuentes por entidad, resuelve la ambigüedad `spectrum_code`/`plate` de equipment de forma limpia (misma `equipment.id`, dos filas de crosswalk). Cada golden table lleva provenance inline (`source_system`, `last_synced_at`) + las UNIQUE de MD-02. `people` gana `spectrum_employee_code`, `payday_id`, `hr_person_id`, `person_type` (cierra MD-03).

### Migración de MovimientOS (compat layer)

`ALTER TABLE public.sm_requests SET SCHEMA movilizaciones` + `CREATE VIEW public.sm_requests WITH (security_invoker=true) AS SELECT * FROM movilizaciones.sm_requests` → **la app no nota el movimiento, type-gen sigue funcionando vía vistas compat**. Escrituras → RPCs (alineado con Fase 1). **Pre-requisito (no verificable en read-only):** auditar el `search_path` de cada función SECURITY DEFINER antes del `SET SCHEMA` — las que tienen `SET search_path = public` deben pasar a `SET search_path = movilizaciones, masterdata, public`. La coexistencia con `hr.*` se respeta: ninguna fase toca `hr.*`; `masterdata.people` lo consume como una fuente más vía crosswalk (`source_system='hr'`).

---

## 14. Estrategia de integración

| Fuente | Protocolo | Transporte | Estado hoy | Falta / prerequisito |
|---|---|---|---|---|
| **Spectrum** | SOAP/XML | Edge Function (port de `test-spectrum.ps1`) + `pg_cron`/`pg_net` | Harness manual funciona; `equipment.spectrum_code` poblado | Productizar a Edge Fn; credenciales a `vault`; backfill 41 projects / 43 equipment / fases; `GetVendors` FALLA → fuente alterna para `vendors` |
| **SkyData (GPS)** | REST/JSON | Ya en la app (`/api/gps`); promover a Edge Fn + snapshot | MVP live; 13 vehículos bootstrap staging | Migración a **proveedor nuevo** (GPS-01, bloqueante); key a `vault`; bootstrap prod pendiente |
| **ProjectSight** | REST/SOAP (TBD) | `pg_net` o Edge Fn | Sin acceso a API | Contrato de API; auth |
| **B2W** | REST | `pg_net` | Sin acceso a API | Contrato de API |
| **PayDay (planilla)** | API | Edge Fn (auth+paginación) | Sin acceso a API | Alimenta `masterdata.people.payday_id` + `person_type='empleado'`; ciclo semanal/quincenal |
| **Google Drive** | Drive API + parse | Edge Fn (OAuth) + `pgvector` para RAG | Catálogo SOP leído | Para LLMs: chunk + embed |
| **Otra Postgres / S3** | wire | `wrappers` FDW (ya instalado) | — | Leer sin copiar |

**Regla de transporte:** REST simple → `pg_net` directo; SOAP/XML/OAuth/paginación → Edge Function; fuente relacional/bucket → FDW. Control de lote en `sync.batch` + `sync.dead_letter` (idempotencia por `content_hash` + `ON CONFLICT`).

**Lo que funciona hoy:** Spectrum (manual), SkyData (live). **Lo que falta:** todo lo demás depende de contratos de API que no se pudieron validar. **Prerequisito común:** los UNIQUE de MD-02 y el `entity_crosswalk` deben existir **antes** de conectar más fuentes (sin ellos, re-importar duplica).

---

## 15. Roadmap de módulos

**Hallazgo de fondo:** las tablas "aspiracionales" (work_orders, rental_agreements, inspecciones, fuel_logs, etc.) **no son stubs** — son schema completo y bien arquitecturado (FKs cruzadas ya definidas: inspección→WO, fuel→meter_readings, categoría→template), creado en un batch el 2026-03-17, nunca cableado a UI. El trabajo por módulo NO es diseño de schema, sino: **RLS policies** (todas tienen RLS-enabled-sin-policy → bloquea writes, mismo bug de Cambio 5) + hooks + UI + wiring de triggers. Esto baja cada módulo ~1 categoría de esfuerzo.

**Clusters (el orden maximiza reuso):**
- **Cluster 1 "Activo del equipo"** (máximo reuso del master `equipment` 377 rows + `meter_readings`): Inspecciones, Mantenimiento, Combustible, Flota, Gestión-360, Operadores.
- **Cluster 2 "Custodia"** (reusa el motor de eventos de movilizaciones): Equipos menores, Herramientas, `custody_transfers` (AD-2, trigger no activo).
- **Cluster 3 "Proveedores/compras"** (alto solape con Spectrum, bajo reuso): Compras, Almacén, Alquiler.
- **Cluster 4 "Facturación"**: `mobilization_campaigns` + `mobilization_rates` → IC-LOG-06-05.

**Top 5 secuenciado (DESPUÉS de movilizaciones production-ready):**

| # | Módulo | Cluster | Esfuerzo | Rationale |
|---|---|---|---|---|
| 1 | **Inspecciones (IC-EQ-F-01-02)** | 1 | M | Prerequisito de Mantenimiento + cierra R11 del propio SOP de movilizaciones (`equipment_inspections.trip_id` ya existe). Autónomo de Spectrum. |
| 2 | **Combustible (IC-EQ-PO-06)** | 1 | **S** | Quick win; alimenta `meter_readings` (base preventivo) + cierra SOP-01 (combustible de la bitácora). |
| 3 | **Mantenimiento/Work Orders (IC-EQ-PO-01)** | 1 | M | Mayor valor de negocio (uptime); consume Inspecciones + Combustible. |
| 4 | **Gestión 360° + Operadores (IC-EQ-PO-02)** | 1 | S-M | Agregación visual de pasos 1-3 (perfil de equipo); demuestra el efecto-compuesto. |
| 5 | **Equipos menores + Custodia (IC-LOG-PO-05/IC-EQ-PO-04)** | 2 | M | Activa `custody_transfers` reusando el motor de Entrega. |

**Diferidos conscientes:** Alquiler, Flota dedicada, Almacén (L, decisión Spectrum), Compras (L, alto solape ERP — requiere decisión de James: ¿source-of-truth o read-sync?). **Dominios nuevos** (SSOA, RRHH, Finanzas, GP, GC/CN) son apps separadas sobre la misma plataforma multi-app (`user_app_roles` ya existe), fases posteriores.

---

## 16. Plan de modernización de ingeniería

1. **Migraciones versionadas (DATA-02) + resolver el cisma (DATA-01)** — `supabase db pull` contra prod para baseline real, extraer cada bloque `[bd]` del CHANGELOG a `supabase/migrations/<ts>_<nombre>.sql`, invertir la regla "no usa migraciones". Decisión de James: ¿prod recibe Cambios 2-6.5 o staging se reconstruye desde prod? **Hasta resolverlo, `jaime/dev` no es deployable a prod.**
2. **Atomicidad — split RPC/trigger/action (DATA-03, §5):** triggers = invariantes (no tocar), RPC INVOKER = transacción de dominio (no re-valida, captura excepciones), Server Action = orquestación + validación Zod + email + `revalidatePath`. P1: cancelSolicitud (arregla LOG-01), confirm_delivery (arregla SEC-01), create*Order.
3. **Next 16:** Server Components para list/detail read-heavy + filtros en `searchParams` (resuelve estado/URL); Server Actions para mutaciones + revalidación (reemplaza full-refetch FB-2); `loading.tsx`/`error.tsx` por segmento; `use cache` SOLO para master-data (no para operacional). Consultar skill `vercel:next-cache-components`.
4. **Type-gen robusto (§11):** `database.gen.ts` (generado, `--local`) + barrel `database.ts` (manual `Row<T>`); gate de drift en CI; `tsc --noEmit` en pre-push.
5. **Descomponer god-components** (1344/1347/1323/1115 líneas) **en tándem** con 2-3: primero extraer mutaciones a Server Actions, luego fetch a Server Components, luego presentación. `admin/masters` → `<MasterCrudTab>` genérico (colapsa ~700L de duplicación).
6. **Harness:** refrescar CLAUDE.md (HAR-01/02, modelo Cambio 5, conteo de tablas, firma Opus 4.8), skills stale, podar plugins, `.claude/rules/session-start.md`, CI mínimo (post-cisma).
7. **Estado/feedback (§5.2-5.4 del plan):** `sonner` toasts, `useOptimistic` para acciones de alta frecuencia, error standard de 3 capas (BD throw → Server Action `{ok, error}` con `mapError` → cliente toast), Zod en cada Server Action.

**Riesgo transversal:** la trampa (que el owner intuye) es reimplementar invariantes en RPCs `SECURITY DEFINER`. Mantener: **triggers = invariantes, RPC INVOKER = transacción que confía en triggers, Server Action = orquestación.**

---

## 17. ROADMAP PRIORIZADO GLOBAL

El orden óptimo en 6 fases. Cada item referencia su ID de la §2. **Regla de oro: Fase 0 cierra antes de cualquier merge a prod.**

### FASE 0 — Bloqueantes de seguridad e integridad (antes de CUALQUIER merge a prod)

**Objetivo:** que `jaime/dev` sea deployable de forma segura y que prod/staging dejen de ser irreconciliables.
**Items:**
- DATA-02 + DATA-01: versionar migraciones (extraer `[bd]` del CHANGELOG a archivos) y resolver el cisma prod/staging (decisión de James: promover Cambios 2-6.5 a prod o reconstruir staging). Incluye el script BD consolidado (Cambios 2→6.5 + GPS bootstrap + RLS pickup/external + drift `qty_dispatched`/`qty_rejected`).
- SEC-03/SEC-06: rotar password admin + sacarlo de tests; rotar API key SkyData + placeholder; mover `must_change_password` a `app_metadata`/`people`.
- SEC-01: entrega vía RPC `confirm_delivery` con validación server-side del código; dejar de seleccionar `confirmation_code` para el rol que confirma.
- SEC-02: gate RBAC server-side en `proxy.ts` (`canAccess`) o `(app)/admin/layout.tsx`.
- SEC-13: leer la policy UPDATE de `people` (vía Chat/SQL Editor) — confirmar que no permite auto-ascenso a admin.
- SEC-04: `REVOKE EXECUTE` de `recalc_qty_for_line` (y demás) a anon/authenticated.

**Esfuerzo:** L (el cisma + versionado domina). **Riesgo si se posterga:** merge rompe prod en runtime (`PGRST204`); entrega forjable en producción; potencial escalada a admin. **Criterio de salida:** migraciones en `supabase/migrations/` aplicables a prod; advisor de seguridad de prod corrido y limpio de los 6 items; smoke de entrega que rechaza código incorrecto server-side.

### FASE 1 — Atomicidad y bugs de drift de datos

**Objetivo:** eliminar el drift permanente y la simulación de atomicidad.
**Items:** DATA-03 (split RPC/trigger/Server Action); LOG-01 (`cancel_solicitud` RPC — atomicidad + cláusula correcta); LOG-02/BL-EXCLUSIVITY (correr query diagnóstica en prod, luego constraint o recalc con dedup); LOG-06/LOG-07/LOG-08 (error-checks + razón a orders); SEC-05 (cerrar las 2 RLS `WITH CHECK (true)`); NOTIF-01/02/03 (alerta diaria reference_id, Sentry en `.catch`, fail-fast FROM_EMAIL).
**Esfuerzo:** M-L. **Riesgo si se posterga:** solicitudes canceladas con líneas vivas + TLA huérfanos siguen acumulando drift; fallo parcial deja estados inconsistentes; notificaciones no confiables. **Criterio de salida:** `cancelSolicitud`/`handleDelivery`/`create*Order` son RPCs transaccionales; query de exclusividad en prod = 0 rows + constraint aplicado; alerta diaria persiste su log.

### FASE 2 — Quality gates y patrones Next 16

**Objetivo:** que el harness atrape regresiones y el código adopte Next 16.
**Items:** TEST-01 (`tsc --noEmit` en pre-push), TEST-03 (arreglar `sol` + 18 lint o documentar), TEST-04 + P1 testing (pgTAP base, migrar 4 specs BD-direct, cobertura RLS), AD-5/TEST-02 (resolver BL-E2E-AUTH-BLOCKED + helpers); modernización 3-5 (Server Components + searchParams piloto en `solicitudes`, luego `programacion`/`mis-viajes`; descomposición de god-components en tándem; type-gen `database.gen.ts`).
**Esfuerzo:** M-L. **Riesgo si se posterga:** cada feature nuevo aumenta el riesgo de romper movilizaciones sin red de tests; god-components siguen creciendo. **Criterio de salida:** pre-push corre tsc; suite pgTAP cubre los invariantes de recalc/RLS; al menos `solicitudes` migrado a Server Component.

### FASE 3 — Cierre del SOP IC-LOG-PO-06 + quick wins UX

**Objetivo:** movilizaciones cumple el SOP y la UX mobile está pulida para Charris/conductores.
**Items:** quick wins UX (UX-A11Y-01 token gold, UX-M-02 offset, UX-I18N-01 voseo, UX-M-01 tap-targets, UX-E-01 truncate, UX-M-03 date min, UX-A11Y-03 contraste, UX-F-01 cascade errors); estructurales UX (UX-FB-01 toasts, UX-A11Y-02 focus-trap modales); SOP-01 (Bitácora exportable con combustible — requiere decisión de librería), SOP-02 (regla §5.21 devolución), SOP-04 (gate aprobación Ingeniero opcional); HAR-01/02/03/04 (refresh harness).
**Esfuerzo:** M. **Riesgo si se posterga:** incumplimiento del SOP aprobado; fricción mobile acumulada para el usuario más importante (Charris). **Criterio de salida:** bitácora se exporta con combustible; quick wins aplicados; CLAUDE.md refleja el modelo Cambio 5.

### FASE 4 — Plataforma de datos (multi-schema medallion) + primer módulo nuevo

**Objetivo:** golden records + ingesta Spectrum, y arrancar el cluster de equipo.
**Items:** MD-01/02/03/04 (UNIQUE + provenance + `entity_crosswalk` + `person_type` + poblar vendors); arquitectura §13 Fase 0-2 (schemas raw/staging/masterdata/movilizaciones, cerrar GRANT ALL de public, compat layer de vistas); integración Spectrum a Edge Fn + `vault` + `pg_cron` (backfill 41 projects/43 equipment); GPS-01 (cuando llegue el proveedor nuevo, adaptador detrás de la API route actual); Módulo 1 del roadmap — **Inspecciones** (cierra R11 del SOP).
**Esfuerzo:** L. **Riesgo si se posterta:** sin golden-record discipline cada fuente nueva duplica; la app no escala a multi-app. **Criterio de salida:** masterdata poblado desde Spectrum y validado por diff contra public; Inspecciones en uso ligado a Salida/Entrega.

### FASE 5 — Expansión de módulos y dominios

**Objetivo:** completar el cluster de equipo y abrir dominios nuevos.
**Items:** Combustible → Mantenimiento → Gestión 360°/Operadores → Equipos menores/Custodia (roadmap §15, con RLS policies + hooks + UI por módulo); más fuentes (PayDay → `person_type`, ProjectSight, B2W, Drive→RAG); facturación IC-LOG-06-05 (Cluster 4); dominios nuevos como apps separadas (SSOA, RRHH, Finanzas).
**Esfuerzo:** L (continuo). **Riesgo si se posterga:** ninguno inmediato — es crecimiento. **Criterio de salida:** cada módulo entregado con su RLS + tests pgTAP + UI mobile.

**Resumen del orden:** Fase 0 (seguridad/integridad/migraciones, BLOQUEANTE) → Fase 1 (atomicidad/drift) → Fase 2 (gates/Next16) → Fase 3 (SOP/UX) → Fase 4 (plataforma de datos + Inspecciones) → Fase 5 (módulos/dominios). Las Fases 0-1 son obligatorias antes del primer `/release` real de `jaime/dev` → main.

---

## 18. Apéndices

### 18.A — Catálogo SOP (Google Drive, DOCUMENTOS APROBADOS, fileId `17kWxc8GzBRrDGCmC-OHzvcdFRvRGJnaS`)

| SOP | Cluster | Estado en app |
|---|---|---|
| IC-LOG-PO-06 Movilizaciones VV.02 | core | En prod (auditado §12) |
| IC-EQ-F-01-02 Inspección (42 ítems) | 1 | Scaffolding (0 rows) |
| IC-EQ-PO-01 Mantenimiento (`16ngNqHz...`) | 1 | Scaffolding |
| IC-EQ-PO-06 Combustible | 1 | Scaffolding |
| IC-EQ-PO-02 Gestión de Equipos 2025 (`1G-ygTI4...`) | 1 | Scaffolding |
| IC-EQ-PO-03 Alquiler | 3 | Scaffolding (`rental_agreements`) |
| IC-LOG-PO-05 Equipos menores (`19isLdiC...`) | 2 | Parcial (`equipment` unificado) |
| IC-EQ-PO-04 Herramientas | 2 | Scaffolding |
| IC-LOG-PO-04 Almacén Central (`1J_e6PoC...`) | 3 | Scaffolding (`warehouse_*`) |
| IC-EQ-PO-05 Almacén Taller | 3 | Scaffolding |
| IC-LOG-PO-01 Compras VV04 2024 (`1WjLxu4Q...`) | 3 | Scaffolding (`purchase_orders`) |
| IC-LOG-PO-02/03 Compras int./Eval. proveedores | 3 | Scaffolding parcial |
| IC-LOG-PO-09 Flota | 1 | Parcial (GPS + equipment) |
| IC-LOG-06-05 Facturación | 4 | Scaffolding (`mobilization_campaigns`) |

### 18.B — Catálogo de extracción Spectrum (gaps vs app)

| Entidad | Spectrum | App | Gap | Llave de reconciliación |
|---|---|---|---|---|
| jobs/projects | 47 | 6 | -41 | `projects.code` (UNIQUE ✓) |
| equipment | 420 | 377 | -43 | `spectrum_code` (sin UNIQUE — MD-02) + `plate` (ambiguo SkyData) |
| employees | 166 | 178 (mezcla) | — | falta `spectrum_employee_code` (MD-03) |
| phases | 501 | 138 (cost_codes) | -363 | `full_code` / `(project,extra,phase)` (sin UNIQUE) |
| vendors | 87 (`GetVendors` FALLA) | 0 | -todo | `ruc` (MD-04; fuente alterna requerida) |
| customers | 87 | texto libre en `projects.client` | -todo | promover a tabla |

### 18.C — Inventario de las 51 tablas (live vs vacías)

**Con datos (prod / staging):** projects (6/6), people (182/178), person_projects (30/29), equipment (377/377), locations (8/8), mobilization_rates (14/14), units (11/11), cost_codes (138/138), sequences (6/6), sm_requests (50/37), sm_request_lines (60/42), trips (48/36), trip_line_assignments (53/40), trip_events (159/127), suggestions (19/0), user_app_roles (19/19), cost_categories (8/8), cost_code_categories (656/656), project_extras (12/12), audit_log (787/539), notification_log (1641/92), equipment_categories (10/10).

**Staging-only con datos:** pickup_orders (2), external_orders (1).

**Vacías (0 rows, scaffolding aspiracional, ambos entornos):** vendors, equipment_status_log, equipment_assemblies, equipment_assembly_members, inspection_templates, inspection_template_sections, inspection_template_items, equipment_inspections, inspection_responses, inspection_photos, work_orders, work_order_parts, fuel_logs, meter_readings, operator_qualifications, rental_agreements, purchase_orders, purchase_order_lines, mobilization_campaigns, warehouse_items, warehouse_transactions, feedback.

**Staging-only (las 7 del drift):** pickup_orders, pickup_order_lines, external_orders, external_order_lines, trip_event_lines, delivery_observations, custody_transfers.

### 18.D — Índice de hallazgos previos reconciliados

- **Bug-registry / audits previos (audit-A, audit-B, audit-C-codex, audit-D-codex):** confirmados contra código actual — F#28 (LOG-03), F#13 (LOG-01), F#9 (LOG-05), M3 (LOG-06), F#18/19 (LOG-07), A3, N#1 (LOG-04), N#2, F#7/F#1/F#15 (LOG-08), B2/F#22 (LOG-13), C1 (SEC-01), C3 (SEC-02), BL-EXCLUSIVITY (LOG-02), AD-5 (TEST-02), drift `qty_dispatched` (DATA-01). audit-D corrobora SEC-01 (líneas 83-99).
- **Matizados:** M4 (`.single()` en proxy — en esta versión redirige a /login, no loop infinito); SEC-04 (Codex/Chat lo marcaron CRÍTICO universal; la verificación lo reduce a 1 función explotable MEDIA); atomicidad (Claude/Codex CRÍTICA universal → resuelto ALTA acotada por single-Charris).
- **Nuevos no en registry:** LOG-09 (PM bloqueado de cancelar SM En Proceso), LOG-10 (sin cerrar-corto SM Parcial), el alcance del cisma prod/staging (mayor que "drift puntual" del CHANGELOG 2026-04-19).
- **Refutados:** `rls_auto_enable` como vector (es event-trigger defensiva); Storage RLS (correcto, server-side MIME/size); "tablas con RLS sin policy" (sin lints `rls_enabled_no_policy` — toda tabla con RLS tiene ≥1 policy).
