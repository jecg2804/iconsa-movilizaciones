# Changelog

Actualizado con cada commit. Entries > 90 días se archivan.

---

## 2026-04-20
- [bd] **GPS live tracking — columna `equipment.gps_vehicle_id`**: ejecutado en staging (`vonwkciosksqspyljzfy`) 2026-04-20. Pendiente ejecutar en prod (`bzeoszympkkicwlfdtcn`). Dos migraciones consecutivas: (1) `gps_vehicle_id_column_and_bootstrap` — ALTER TABLE + índice parcial + 13 UPDATEs match por `spectrum_code`, 10 impactaron; (2) `gps_vehicle_id_bootstrap_by_plate` — 3 UPDATEs match por `plate` para los vehículos donde SkyData usaba placa como identificador en vez de spectrum_code (ED8244 / EM0539 / ES3830 son placas de los equipos PUP244 / SUV539 / BUS830 respectivamente). Resultado: 13/13 vehículos con GPS mapeados. Verificado: filas pobladas, 0 huérfanos, índice parcial creado. Spec: `Docs/superpowers/specs/2026-04-20-gps-live-tracking-design.md`.

  ```sql
  -- Migración 1 — columna + índice + bootstrap por spectrum_code (10 de 13 matchean)
  ALTER TABLE public.equipment
  ADD COLUMN gps_vehicle_id text NULL;

  COMMENT ON COLUMN public.equipment.gps_vehicle_id IS
  'ID interno del vehículo en SkyData/SkyGlobal (campo `id`, no `unit_id`). Solo los 13 vehículos con dispositivo GPS tienen valor. NULL para equipos sin GPS.';

  CREATE INDEX idx_equipment_gps_vehicle_id
  ON public.equipment (gps_vehicle_id)
  WHERE gps_vehicle_id IS NOT NULL;

  UPDATE public.equipment SET gps_vehicle_id = '118'  WHERE spectrum_code = 'CAB444';
  UPDATE public.equipment SET gps_vehicle_id = '119'  WHERE spectrum_code = 'CAB930';
  UPDATE public.equipment SET gps_vehicle_id = '120'  WHERE spectrum_code = 'CAM839';
  UPDATE public.equipment SET gps_vehicle_id = '121'  WHERE spectrum_code = 'CAM837';
  UPDATE public.equipment SET gps_vehicle_id = '123'  WHERE spectrum_code = 'BUS009';
  UPDATE public.equipment SET gps_vehicle_id = '124'  WHERE spectrum_code = 'BUS010';
  UPDATE public.equipment SET gps_vehicle_id = '126'  WHERE spectrum_code = 'CAM430';
  UPDATE public.equipment SET gps_vehicle_id = '5061' WHERE spectrum_code = 'PUP467';
  UPDATE public.equipment SET gps_vehicle_id = '5062' WHERE spectrum_code = 'PUP468';
  UPDATE public.equipment SET gps_vehicle_id = '5063' WHERE spectrum_code = 'PUP245';

  -- Migración 2 — corrección por plate para los 3 vehículos donde SkyData usa placa en vez de spectrum_code.
  -- SkyData description: "ED8244" / "EM0539" / "ES3830" corresponden a equipos PUP244 / SUV539 / BUS830.
  UPDATE public.equipment SET gps_vehicle_id = '5067' WHERE plate = 'ED8244';
  UPDATE public.equipment SET gps_vehicle_id = '6218' WHERE plate = 'EM0539';
  UPDATE public.equipment SET gps_vehicle_id = '6612' WHERE plate = 'ES3830';
  ```

## 2026-04-19
- [fix] **J2 — Eliminar `requires_code` del código**: la columna `requires_code` fue dropeada en BD (prod + staging) pero el frontend seguía enviándola en inserts/updates → error PGRST204 "Could not find the 'requires_code' column of 'sm_request_lines' in the schema cache" al agregar líneas a solicitudes. Fix: eliminar todas las referencias en código y tests. Cambios: (1) `src/components/solicitudes/LineEditor.tsx` — quitado del payload de `handleSave`. (2) `src/app/(app)/solicitudes/nueva/page.tsx` — simplificado `handleLineSave` (ya no wrappa con `requires_code: true`). (3) `src/app/(app)/solicitudes/[id]/page.tsx` — quitado del mapper de línea para editar. (4) `src/hooks/useSolicitudes.ts` — `LineWithRelations` y `LineInput` sin `requires_code`; 3 inserts/updates limpios. (5) `src/hooks/useTrips.ts` — interface `TripLine` sin `requires_code`; 2 mappers + 2 SELECTs limpios (ya no se consulta la columna). (6) `src/lib/types/database.ts` — edición quirúrgica: quitadas las 3 ocurrencias de `requires_code` en Row/Insert/Update de `sm_request_lines` (NO regeneré con `gen types` porque destapaba drift de `qty_dispatched` entre prod y staging — ver nota abajo). (7) Tests: `tests/helpers.ts` sin opt `requiresCode`, `tests/solicitud-creation.spec.ts` sin test "All lines have requires_code=true by default", `tests/entrega-complete.spec.ts` sin comentario obsoleto. **Nota drift BD:** al intentar regenerar tipos con `npx supabase gen types` desde prod (`bzeoszympkkicwlfdtcn`), descubrí que prod NO tiene la columna `qty_dispatched` en `trip_line_assignments`, mientras que staging (`vonwkciosksqspyljzfy`) SÍ la tiene. El código frontend usa `qty_dispatched` intensivamente (Dispatch, Pickup, Delivery modals + mis-viajes flow) — no tocar sin decisión explícita de James. Documentado para investigación futura.
- [audit] **Drift prod/staging detectado**: `trip_line_assignments.qty_dispatched` existe en staging pero no en prod. Impacto: potencialmente los flows de Dispatch/Pickup/Delivery en prod están fallando silenciosamente. Requiere investigación — ¿prod realmente no tiene la columna, o el snapshot del MCP es incompleto? James debe decidir: (a) dropear `qty_dispatched` en staging para alinear, o (b) aplicar migración en prod para añadirla.

## 2026-04-17
- [chore] **Tooling upgrade**: Repomix v1.13.1 instalado globalmente + config `repomix.config.ts` (compress, tree-sitter, security check). Para dar contexto completo del codebase a Claude Chat con un solo archivo.
- [chore] **Superpowers enforcement**: `tool-usage.md` reescrito con reglas de uso obligatorio — brainstorming ANTES de features, systematic-debugging para bugs, Context7 ANTES de APIs, Repomix antes de Chat. Plan mode nativo desactivado (`EnterPlanMode` en deny list) — todo planning pasa por Superpowers.
- [chore] **Swap Superpowers pendiente**: cambio de obra/superpowers a pcvelz/superpowers (fork Claude Code-specific con task management nativo y hooks de enforcement). Requiere ejecución manual en terminal.

## 2026-04-16
- [fix] **G1 — Reversion guard valida registered_by**: `handleRevert` en `mis-viajes/[id]/page.tsx` ahora verifica que `registered_by.id === person.id` antes de permitir revertir. Admin bypasea (puede revertir cualquiera). Logistica solo puede revertir eventos que registró ella misma. TripEvent interface + loadEvents query actualizados para incluir `id` en registered_by (antes solo `name`).
- [fix] **G6 — Dashboard "En Tránsito Ahora" clickeable**: cada trip en el widget de dashboard es ahora un `<a>` con href a `/mis-viajes/{id}`. Hover: `bg-blue-100/60`.
- [fix] **G7 — DeliveryModal badge 🔑 per-line**: cada línea con `requires_code === true` muestra emoji 🔑 al lado del nombre. El usuario ve de entrada qué líneas pedirán código.
- [fix] **G10 — Incidencia min 10 chars**: EventModal valida `notes.trim().length >= 10` cuando `eventType === 'Incidencia'`. Error visible en rojo. No afecta otros event types.
- [docs] **G17+G18+G19 — Cleanup EVENTS_V2.md**: G17 `stop_location` → `location` (nombre real). G18 orden handleDelivery corregido (INSERT checkpoint primero, no UPDATE primero). G19 conteo notificaciones aclarado (2 de 4 planificadas implementadas, 2 pendientes G3/G4).
- [docs] **Decisión: códigos de entrega siempre obligatorios** — James + jefe decidieron que el código de confirmación de 4 dígitos es obligatorio en toda entrega y retiro, sin excepción. El feature `requires_code` per-line (que permitía hacer códigos opcionales por línea) se elimina como concepto. Actualizados: BACKLOG.md (J2 cerrado), TRAIL.md (J2 decidido, G7 badge obsoleto), EVENTS_V2.md (7 secciones actualizadas), CLAUDE.md regla #15. Implementación de código pendiente (eliminar checkboxes, simplificar DeliveryModal, limpiar hooks/tests).

## 2026-04-15
- [fix] **J4-B — Sort server-side (bug preexistente)**: el sort de columnas en DataTable operaba client-side sobre la página actual (`solicitudes`/`trips` ya paginados), entonces "sort por fecha más reciente" solo ordenaba dentro de la página visible. Bug introducido por la paginación server-side original, no por J4. **Fix:** contrato `externalSort` en `src/components/ui/DataTable.tsx` — cuando se provee, DataTable delega el sort al parent. Nuevo campo `Column.serverSortKey?: string` marca qué columnas se pueden ordenar server-side (las que tienen ese valor se hacen clickeables en modo externalSort; las que no, quedan solo display). `SolicitudesFilter` y `TripsFilter` ganan `sortColumn` + `sortDirection`; los hooks aplican `.order(filters.sortColumn ?? default, { ascending: ... })` en la query. Default: `date_required asc` (solicitudes), `scheduled_date desc` (trips). `src/app/(app)/solicitudes/page.tsx` marca `serverSortKey` en `request_id`, `date_required`, `date_submitted`, `status`. `src/app/(app)/programacion/page.tsx` marca `trip_id`, `scheduled_date`, `status` (driver queda solo-display en externalSort). Sort client-side en otras páginas (admin/masters) se mantiene como fallback cuando `externalSort` no se provee. **Resultado:** click en header sortea toda la data en BD y re-fetchea.
- [fix] **J4-A — Regresión click-día: separar `singleDay` de `dateFrom`/`dateTo`**: mi fix original de J4 (a80cf36) unificó demasiado el estado — el click en un día del calendario seteaba `dateFrom=dateTo=día`, lo cual aplicaba a la query de la tabla Y del calendario. Resultado: al clickear día 14, el calendario colapsaba a solo día 14 y perdías la vista semanal. **Fix:** agregué `singleDay` como campo separado en `SolicitudesFilter` y `TripsFilter`. Es un filtro ortogonal: el click-día setea solo `singleDay`, los inputs Desde/Hasta siguen seteando `dateFrom`/`dateTo`. Los hooks (`useSolicitudes.refetchList`, `useTrips.refetchTrips`) aplican AMBOS filtros al query de la tabla (intersección). La query del calendario SOLO aplica `dateFrom`/`dateTo` (ignora `singleDay`) → el calendario sigue mostrando los otros días aunque haya un día clickeado. Los chips del click-día y del rango Desde/Hasta son independientes y pueden coexistir. `clearAllFilters` limpia también `singleDay`. Archivos: `src/hooks/useSolicitudes.ts`, `src/hooks/useTrips.ts`, `src/app/(app)/solicitudes/page.tsx`, `src/app/(app)/programacion/page.tsx`.
- [fix] **J7-ext — Código de costo completo requerido (3 campos)**: el fix previo de J7 (d2d4733) solo hacía requerida la Fase. El usuario aclaró que "código de costo" se refiere a los 3 campos que lo componen: Extra/Sección (solo si el proyecto tiene extras), Fase, y Categoría. `src/components/solicitudes/LineEditor.tsx` — `validate()` ahora rechaza guardar si falta cualquiera de los 3: `extra` (condicional `hasExtras`), `cost_code` (fase), `cost_category`. Los 3 labels muestran asterisco `*` y el Select correspondiente muestra el error. CLAUDE.md regla #14 actualizada.
- [fix] **J4 — Calendarios y filtros unificados (rediseño)**: el calendario y la tabla en `/solicitudes` y `/programacion` ahora son una sola "vista de datos" con un set de filtros unificado server-side. Bug raíz: el `dateFilter` (y `tripProjectFilter` en programación) eran estado local que filtraba client-side sobre `solicitudes`/`trips` ya paginados — items en página 2+ no eran visibles cuando se hacía click en su día del calendario o se aplicaba un rango Desde/Hasta. **Cambios:** (1) `src/hooks/useTrips.ts` — nueva propiedad `projectId` en `TripsFilter` interface + `DEFAULT_FILTER`; `refetchTrips` ahora hace 2-step query cuando hay `projectId` (resuelve trip_ids via `trip_line_assignments → line → request → project_id` con inner joins, después filtra `trips.id IN (...)`) porque trips no tiene `project_id` directo. (2) `src/app/(app)/solicitudes/page.tsx` — eliminado tipo `DateFilter` + estado `dateFilter` + memo `displayedSolicitudes`; `calendarDate` se deriva de `filters.dateFrom === filters.dateTo`; click en día llama `setFilters({ dateFrom: day, dateTo: day, page: 0 })` con toggle (deselecciona si es el mismo día); inputs Desde/Hasta llaman `setFilters` directo; el query del calendario `calendarItems` ahora aplica TODOS los filtros (status, search, requesterId, dateFrom, dateTo, projectId) en lugar de solo `projectId`; tabla usa `solicitudes` directo (server ya filtró); chips de fechas y `clearAllFilters` adaptados. (3) `src/app/(app)/programacion/page.tsx` — eliminados `tripProjectFilter` local + `dateFilter` local + memo `filteredTrips`; el select de proyecto llama `setTripFilters({ projectId, page: 0 })`; handlers de fecha llaman `setTripFilters` directo; el query `calendarItems` aplica el 2-step de projectId + status + conductor + dateFrom + dateTo + search; tabla usa `trips` directo. **Resultado:** click en día del calendario, rango Desde/Hasta, status chip, proyecto, search — todos modifican el mismo `tripFilters`/`solicitudFilters` server-side y el calendario refleja exactamente el mismo conjunto que la tabla. Items en cualquier página son visibles via filter. Confirmado con James que: (Duda 1) `dateFrom === dateTo` colapsa a "día único", (Duda 2) click en día sobreescribe rango previo, (Duda 3) calendario respeta el filtro pero conserva su navegador < > Hoy de 2 semanas (3A).
- [feat] **J8b — Duplicar líneas en solicitud** (feedback Jacome): `src/components/solicitudes/LineRow.tsx` expone nuevo prop `onDuplicate?: () => void` y renderiza botón `Copy` (icon lucide) entre Editar y Eliminar cuando el callback está presente. `src/app/(app)/solicitudes/nueva/page.tsx` — nuevo `handleDuplicateLine` que `setLines(prev => [...prev, { ...prev[index] }])`. `src/app/(app)/solicitudes/[id]/page.tsx` — mismo handler pero solo activo cuando `canAddLines === true` (solicitud en Borrador, regla #2 CLAUDE.md). La copia se agrega al final de la lista sin abrir el editor; el usuario puede editarla después si quiere. En modo edición de solicitud post-Borrador, el botón se oculta automáticamente.
- [fix] **J8a — Scroll/zoom modales en mobile**: feedback de Jacome sobre "componentes que no tienen scroll y bloquean vista". Aplicado fix consistente a los 6 modales de viajes en jaime/dev: (1) `DeliveryModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` al empty-state (primer modal de "No hay líneas pendientes") que no lo tenía; padding `p-6` → `p-4 sm:p-6` en ambos modales (body y empty-state); (2) `DispatchModal.tsx` — padding responsive; (3) `PickupModal.tsx` — padding responsive; (4) `ParadaModal.tsx` — padding responsive; (5) `PreparationModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` (faltaba) + padding responsive; (6) `RevertModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` (faltaba) + padding responsive. Efecto combinado: en mobile el padding se reduce de 24px a 16px (shrink → más content visible), y si aún así el contenido excede el viewport, hay scroll como fallback. El flujo viejo en main (EventModal en `mis-viajes/[id]/page.tsx`) se aplica en commit paralelo separado al worktree main.
- [fix] **J7 — Código de costo requerido en líneas de solicitud**: `src/components/solicitudes/LineEditor.tsx` — `validate()` ahora rechaza guardar si `costCodeId` es null. El Select de "Fase / Código de Costo" muestra asterisco (`Fase / Código de Costo *`) y error "El código de costo es requerido" si falta. Antes era opcional (default null aceptado). Convención de regla #14 CLAUDE.md actualizada. La categoría de costo (`cost_category_id`) sigue siendo opcional — solo la fase es obligatoria.
- [fix] **J6 — Costo read-only cuando hay tarifa seleccionada**: en `src/components/programacion/TripForm.tsx`, el Input de costo ahora tiene `disabled={fieldsDisabled || !!rateId}`. `handleRateChange` simplificado: cuando se selecciona tarifa, siempre sobreescribe el costo con `rate.amount` sin confirmación (el campo no es editable mientras haya tarifa, así que no hay valor manual que preservar). Para editar un costo custom, el usuario debe deseleccionar la tarifa primero. Antes el campo seguía editable con diálogo de confirmación "¿Reemplazar el costo manual con la tarifa?". CLAUDE.md regla #9 actualizada.
- [fix] **J3 — RBAC conductores (security)**: el rol `campo` solo puede acceder a `/mis-viajes`, y solo ve los viajes donde es el driver asignado. 4 cambios coordinados: (1) `src/lib/utils/constants.ts` — `ROLE_ROUTES.campo` reducido a `['/mis-viajes']` (antes incluía `/dashboard`); (2) `src/proxy.ts` — tras auth, consulta `people.app_role`, y si es `campo` enforza que `pathname` empiece con `/mis-viajes` o sea `/change-password` (resto → redirect a `/mis-viajes`); además `/login` y `/` redirigen a `/mis-viajes` en vez de `/dashboard` para este rol; (3) `src/hooks/useMyTrips.ts` — lee `useAuth`, y si `role === 'campo'` agrega `.eq('driver_id', person.id)` al query (defense-in-depth sobre RLS, espera a `authLoading=false` antes del primer fetch); (4) `src/app/(app)/mis-viajes/[id]/page.tsx` — nuevo `useEffect` que redirige a `/mis-viajes` si un `campo` accede por URL directa a un trip ajeno (ownership guard post-carga); (5) `src/app/(app)/mis-viajes/page.tsx` — oculta el filtro de conductor cuando `role === 'campo'` (no tiene sentido filtrar por otros conductores si solo ves los tuyos). **Pending:** test manual por James con user real de rol campo antes de cherry-pick a main. Automated test `tests/role-permissions.spec.ts` solo cubre admin, no campo.

## 2026-04-14
- [verify] Hallazgo #5 audit pre-fase cerrado — `handleRevert` branch `Entrega` verificado por análisis estático contra 4 escenarios de entregas parciales. Lógica correcta para qty/status/delivered_at/trip_line_assignments. Escenarios: (E1) entrega parcial única qty=6 de 10 → revert la deja en `En Transito` con `qty_scheduled=10, qty_delivered=0`; (E2) última de 2 parciales qty=3 tras qty=4 → revert la deja `Parcial` con `qty_delivered=4, qty_scheduled=6` (primera sobrevive); (E3) entrega que completó la línea qty=2 tras qty=3 total=5 → revert vuelve a `Parcial` con `qty_delivered=3, qty_scheduled=2, delivered_at=null` (cascade_request_status lleva el parent de `Completada` a `En Proceso`); (E4) entrega con observaciones → qty vuelve atrás como E1 y las filas de `delivery_observations` sobreviven intactas (evidencia histórica inmutable, por diseño). Comentario JSDoc agregado al branch en `mis-viajes/[id]/page.tsx` documentando la verificación. Cierre completo del audit del 2026-04-13/14.
- [chore] BACKLOG: nuevo item **AD-5** — `tests/helpers.ts` `createSolicitud`/`createTrip` rotos (crean solicitud vacía Enviada, `createTrip` falla por `assignments.length===0`). Rompe todos los tests E2E que crean data fresca. Detectado durante Bloque 3 tras intentar correr el test de revert parcial. Necesita investigación con `--headed` — sospecha de drift de selectores, no de regresión de código reciente.
- [fix] Pre-push hook race con post-commit background build — pre-push caía en sync fallback mientras el background build del post-commit todavía tenía `.next/lock`, causando `⨯ Unable to acquire lock`. Fix: pre-push ahora poll-ea `.build-status` cada 5s hasta 120s antes de caer en sync fallback, y chequea `.next/lock` antes de arrancar sync como último recurso. Bug descubierto al commitear el parking mismo. `38030bd`
- [chore] Parking Git/GitHub practices cerrado — enforcement client-side de 3 capas activo: documental (`.claude/rules/git-workflow.md`), tool deny patterns (13 nuevos en `.claude/settings.json` — push a main, force, no-verify, reset hard, rebase -i), Husky hooks (pre-commit bloquea main, pre-push bloquea main+force y gatea por `.build-status`, post-commit lanza `npm run build` en background tras cada commit). Skill `/release` nuevo en `.claude/skills/git-release.md` — valida Vercel READY antes de crear PR + squash merge + tag semver `v{YYYY}.{MM}.{DD}-{N}` + push del tag. Capa server-side (GitHub branch protection) NO activa: requiere upgrade a GitHub Team para repos privados — probado con Rulesets y Branch Protection Rules clásico, ninguno enforza en plan gratuito. Los 3 layers client-side cubren a James y Claude Code, los únicos actores con write access al repo. `cba86e3` + `7faed7a` (docs honestos capa 4)
- [test] Fase E — `tests/audit-gates.spec.ts` nuevo: 5 tests BD-first para validar los gates de Fase B.1 sin depender de UI. SEC2 (trigger genera confirmation_code), BD-F7 (enforce_line_add_delete_only_in_borrador), BD-X1 (qty_invariant), N_R2_1 (enforce_trip_immutable_post_departure), audit_log RLS. Todos verdes en staging.
- [docs] CLAUDE.md — 44 → 47 tablas, target tsconfig ES2022, staging branch `vonwkciosksqspyljzfy` añadida al header Stack.
- [fix] `alerta_diaria_urgentes` referencia a variable local `today` eliminada en C.4 — causa del build rojo en Vercel en todos los commits de Fase C. Reemplazada por `daysBetweenInPanama(todayStr, req.date_required)`. `099fe17`
- [feat] Fase C.7 — smells cleanup: storage.ts console.log gated a dev (B1), useAuth getUser().catch() previene loading colgado (B5), tsconfig target ES2017 → ES2022 (N_R3_11). `e247ce6`
- [feat] Fase C.6 — event edges: revert Llegada bloqueado si hay Entrega/Retiro/Parada posteriores (N5); Pickup/Dispatch/Delivery/Preparation modals regeneran eventIdRef en catch (B2); generateRequestIdFallback eliminado — confiar en trigger BD (A3). `6a7ce94`
- [feat] Fase C.5 — admin masters: toggleStatus, addPersonProject, removePersonProject wrapped en useSubmitGuard (N_R3_4); handleSave valida required fields por tabla antes de insert (N_R3_5). `3a8bea5`
- [feat] Fase C.3 — forms UX: canDeleteLines gate explícito en solicitudes/[id] (N6/M2); scheduled_date Input min=hoy Panamá + guard server-side en saveTrip (N_R2_2); rate auto-fill pide confirmación si hay costo manual distinto (M1); pickup toggle pide confirmación si borra driver/vehicle/trailer (N_R2_7). `81ec148`
- [feat] Fase C.2 — notificaciones: A4 status filter en 12 notify* functions (early-return si trip/request/line ya no aplica); N_R3_7 dedup por recipient_email en TEST_EMAIL mode; N_R3_8 fail-closed si dedup query falla. `89c5f87`
- [feat] Fase C.1 — seguridad: SEC1 sentryBeforeSend redact hook (PII/tokens/headers/cookies) en server/edge/client; SEC2 eliminada generación client-side de confirmation_code — trigger BD única fuente; XSS1 escapeHtml() helper + wrap de 16 templates de notificación email. `ea0603c`
- [feat] Fase C.4 — timezone unificado: nuevo `src/lib/utils/datetime.ts` con helpers Panamá-safe; refactor de format.ts, calendario/page.tsx, notifications/actions.ts. Cubre N_R2_3, N_R2_4, N_R3_1, N_R3_3, N_R3_14, N4. `28cdb4d`
- [bd] Fase B.1 completa (staging) — audit BD aplicado en 4 bloques vía Supabase SQL Editor:
  - Bloque 1.A: RLS habilitada en 22 tablas (21 del subsystem equipment/workshop/procurement + `equipment_assemblies`) con policy `admin_all` baseline. BD-C1 cerrado.
  - Bloque 1.B: `ALTER FUNCTION ... SET search_path` en 7 funciones flagged (`enforce_qty_integrity`, `cascade_request_status`, `complete_pickup_trip`, `update_equipment_location_on_delivery`, `update_equipment_location_on_custody_transfer`, `generate_internal_asset_tag`, `log_equipment_status_change`). BD-C3 cerrado.
  - Bloque 1.C: `audit_log.read_all` reemplazada por `admin_read` — cierra leak de PII histórica. BD-F9 cerrado.
  - Bloque 2.A: Trigger `enforce_line_add_delete_only_in_borrador` en `sm_request_lines` — enforza la regla "no add/delete líneas después de Enviada" a nivel BD. BD-F7 cerrado.
  - Bloque 2.B: Trigger `enforce_trip_immutable_post_departure` en `trips` — bloquea cambios de vehicle/driver/trailer en trips En Ruta/Completado/Cancelado. N_R2_1 cerrado.
  - Bloque 2.C: 4 CHECK constraints duros en `sm_request_lines` (`qty_positive`, `qty_delivered_nonneg`, `qty_scheduled_nonneg`, `qty_invariant`) — el invariante combinado qty_scheduled+qty_delivered<=quantity es nuevo a nivel BD (trigger enforce_qty_integrity lo validaba por columna pero no combinado). BD-X1 cerrado. Data repair pre-aplicado sin violaciones en staging.
  - Bloque 3: 10 indexes FK en tablas core (`sm_request_lines`, `trips`, `trip_events`, `trip_event_lines`, `delivery_observations`). BD-H1 cerrado.
  - Bloque 4: Storage `attachments` policies `authenticated_upload` y `authenticated_update` ahora validan MIME type + tamaño ≤ 10MB contra `metadata`. BD-S1 parcial cerrado (fix stretch path-ownership + delete via API queda para Fase C).
- [audit] Audit extensivo consolidado (código + BD) — 3+ rondas de hallazgos, ~65 items accionables, fases A–F documentadas en plan. Nuevos hallazgos BD: 22 tablas con RLS disabled, 7 funciones con search_path mutable, 12 FKs sin índice en core tables. Plan guardado para ejecución por fases.
- [chore] X0 (middleware huérfano) descartado — `proxy.ts` es la convención correcta en Next.js 16, `middleware.ts` deprecado. Verificado con build real.
- [fix] Fase A.1 — handlePickup idempotencia + N8 + M6. INSERT trip_events como checkpoint con event_id pre-generado en PickupModal. Retry bajo red mala retorna early sin duplicar qty_delivered. Throw en trip_event_lines failure. notifyEntregaConfirmada loop por cada línea. (e232777)
- [fix] Fase A.2 — handleDelivery race + M6. Fresh SELECT de `trip_line_assignments.qty_delivered` antes del UPDATE para reducir race window bajo entregas concurrentes. notifyEntregaConfirmada loop por cada línea (mismo fix M6). Race completo requiere RPC atómica en Fase B. (a384f99)
- [feat] Fase A.3 — handleRevert branch Retiro (N1 fix). Espejo de Entrega para revertir qty_delivered/qty_scheduled/status, más rollback del trip de Completado a En Ruta. Antes el revert solo insertaba el Reversion event sin tocar la BD — ahora deshace todo. TODO: verificar body de complete_pickup_trip en Fase B.0 por si setea otros campos. (328810e)
- [fix] Fase A.4 — handleParada throw + handlePreparation idempotency (N7 + N9). Parada ahora throw en trip_event_lines failure (antes silencioso). PreparationModal expone event_id pre-generado; handlePreparation usa checkpoint pattern con 23505 early return. (5c3bdd0)
- [test] Fase A.5 — pickup-flow.spec.ts. Tests E2E para validar A.1, A.3, A.4: happy path Preparación → Retiro completa el trip + qty actualizadas; revert Retiro recalcula qty_delivered + trip vuelve a En Ruta + Reversion event. Helpers nuevos: registerPreparation, registerRetiro. (760d785)

## 2026-04-13
- [fix] handleRevert Entrega: status dinámico (Parcial si aún hay qty_delivered > 0, no hardcode 'En Transito'); delivered_at condicional.
- [fix] handleRevert Retorno: NO limpia actual_arrival (era bug — ese campo pertenece a Llegada).
- [feat] Dashboard widget "Entregas pendientes" visible para todos los roles (antes solo logistica/admin). Cancelar línea sigue gated a logistica/admin.
- [refactor] Event system — Retorno no-op (no toca cantidades), guard dialog cuando hay líneas En Transito, ConfirmDialog component reusable.
- [feat] Dashboard widget "Entregas pendientes en viajes cerrados" — listado accionable con Registrar Entrega tardía o Cancelar línea + razón.
- [feat] Entrega tardía — mis-viajes/[id] soporta action=Entrega en URL y botón "Registrar Entrega Tardía" visible en trips Completados con líneas En Transito.
- [fix] handleDispatch + handleDelivery idempotentes — INSERT trip_events con UUID pre-generado como checkpoint; retry bajo red mala retorna early sin duplicar cantidades.
- [fix] (main/prod) Entrega parcial resta qtyThisTrip, no quantity_assigned — evita qty_scheduled inflada (b7ebf1a)
- [feat] DispatchModal role-based editing — campo solo confirma, logistica/admin editan vehículo/conductor/líneas/cantidades. Defensive override en handleDispatch para rol campo.

## 2026-04-09
- [fix] Calendar shows ALL items independent of table pagination + default collapsed (20f98d6) — cherry-picked to main/production
- [fix] Quitar columna Remolque + Tarifa solo precio con tooltip en tabla programación (b97a83d)
- [feat] Sentry error monitoring con source maps y session replay (15d3a3e)
- [feat] E2E test suite — 12 files, 100+ tests con Playwright (af9be5e → 638cf72)

## 2026-04-08
- [feat] Parada Level 1 — intermediate stop event for supplier pickups (446b0c7)
- [fix] AD-4 — PM cannot see confirmation code on pickup trips (6b92458)
- [fix] Remove pickup radio from solicitud form — decided at programming level (2faf6e2)
- [fix] 2 bugs found in code audit — Parada error handling + saveTrip busyRef (e936e5b)
- [chore] Finalize workflow — clean reference docs, simplify CLAUDE.md (0e759cb)
- [chore] Simplify docs workflow — CHANGELOG + BACKLOG replace 4 stale files (e664838)
- [bd-pending] Crear tabla custody_transfers (vacía, con función sin trigger activo). Ver prompt abajo.

## 2026-04-06
- [docs] Audit cleanup — fix refs, reduce context bloat, sync 17 days of docs (f7e5683)
- [fix] Include En Transito lines in backlog for partial scheduling (697af3e)

## 2026-04-01
- [fix] Audit #2 — busyRef finally, notifyRetorno PMs, deliveredQuantities dead code, Retorno filter, suggestions error log, qty_scheduled clamp (7302a7c)
- [fix] Audit #1 — qty_dispatched reset on Retorno, terminal status guard, orphan trip cleanup, cron Bearer-only, Math.min clamp, eventError rename, PII dev-only logs (84b305c)

## 2026-03-25
- [fix] 8 pre-production issues — event revert qty, Retorno undelivered lines, notification placeholders, registerEvent guards, fulfillment_type preserved, viaje_editado eventType, entrega receiver name, Llegada revertible (296f2cf)
- [fix] Filter reverted events from has* checks, show qty_dispatched, timeline detail (54a44db)

## 2026-03-24
- [feat] Batch 11 — dashboard En Tránsito, pickup badges, 2 new notifications (c3216e0)
- [feat] Batch 10 — self-pickup flow with Preparation and Pickup modals (ed58c67)
- [feat] Batch 9 — event reversion + bulkRequiresCode fix (ebc6dce)
- [feat] Batch 8 — DeliveryModal with per-line status, trip_event_lines, conditional code (a6e5b48)
- [feat] Batch 7 — editable DispatchModal replaces simple Salida confirmation (1f9c1e9)
- [fix] React error #310 — useEffect before early returns, Suspense wrapper (e001512, b14ba4c, dfc605b)
- [fix] Missing fields in LineWithRelations, SolicitudWithRelations (a267467)

## 2026-03-23
- [feat] Batch 6 — fulfillment_type, requires_code, receiver per line (aeb14ea)
- [feat] Batch 5 — sub-status operativo, banner entrega, shortcuts, URL params (f821946)

## 2026-03-21
- [fix] Retorno button available after Salida without requiring Entrega (8de9637)
- [fix] Timezone America/Panama in salida and retorno notifications (8511124)
- [fix] PM role only sees Entrega and Incidencia buttons (3cba071)
- [fix] Allow PM role to register trip events (fe305f9)
- [fix] Skip alerta diaria urgentes on Sundays (658eebc)
- [fix] Cron auth — exclude /api/cron from middleware (e3241ef, 1dfa9f5)

## 2026-03-20
- [feat] 2 notificaciones urgentes — alerta inmediata + cron diario (5594728)
- [feat] Notification preferences — filtrado por prefs + admin UI tab (f90abe5)

## 2026-03-19
- [feat] Password reset flow — forgot-password, auth/confirm, change-password, proxy.ts, login link (f981c70→43ee9fc)

## 2026-03-18
- [docs] Reestructuración docs — CLAUDE.md fijo, skills con frontmatter, refs actualizadas (554f61b)
- [fix] Charris notificaciones — agregar a 1-3,9-12 (2153593, 68cd569)

## 2026-03-17
- [feat] Paginación server-side solicitudes + client-side viajes/admin (81b9deb)
- [feat] Filtro de fechas con rango Desde/Hasta (641b90a)
- [fix] DataTable expand/collapse controlled state (1b7e080)
- [fix] Bugs UX batch — loop infinito, layout line card, time picker (d3933fe, 49cb4c2)
- [feat] Renombrar Viaje → Movilización en toda la UI (0eae231)

## 2026-03-15
- [feat] File attachments — storage helper, FileUploader, FileDisplay (83b6977→f0a84d6)
- [feat] Columna Fecha Enviada en lista solicitudes (4f7dd68)

## 2026-03-12
- [feat] Entregas parciales — qty_delivered acumulado, backlog Parcial, guard Salida (38854f6→3bde6e9)
- [fix] Bugs #18-27 — timezone, días completadas, KPI, En Transito acento, receptores (6249867→7de6658)
- [feat] Prioridad eliminada de UI — columna Días es suficiente (d17771f)
- [feat] Admin mode sin restricciones — editar cualquier estado (86a222c)
- [feat] Extras en cascada + Admin Masters 6 tabs CRUD (5d7a6fb, 67875dd)

## BD changes (via Claude Chat — no en código)
- [bd] 2026-03-20: notification_preferences JSONB + prefs para 14 usuarios
- [bd] 2026-03-18: auth.users fields NULL→'' para 16 usuarios
- [bd] 2026-03-17: DB expansion 22→44 tablas, equipment 12 cols + auto-tag
- [bd] 2026-03-15: Storage bucket attachments + 4 RLS policies
- [bd] 2026-03-15: Email notifications — generate_request_id/trip_id SECURITY DEFINER
- [bd] 2026-03-12: RLS sm_request_lines operational_update, cascade_request_status fix
- [bd] 2026-03-12: trip_line_assignments.qty_delivered, cascade Parcial fix
- [bd] 2026-03-09: received_by_id, generate_confirmation_code trigger, generate_full_code dashes
