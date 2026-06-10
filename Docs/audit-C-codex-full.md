# Audit C Codex Full - 2026-05-12

Auditor: Codex  
Branch: `jaime/dev`  
Scope: repo completo, codigo, Supabase, docs, `.claude`, SOP IC-LOG-PO-06, testing y vision MDM/multi-app ICONSA.  
Modo: auditoria read-only. No DDL, no DML intencional. Unico test ejecutado contra staging fue `tests/data-integrity.spec.ts`, que por lectura del archivo solo hace SELECTs.

## Veredicto

**No recomiendo mergear `jaime/dev` a `main` ahora.**

El problema no es que "la app no sirva". La app ya tiene bastante trabajo serio: modelo por lineas, eventos, cantidad despachada/entregada, GPS, notificaciones, RLS, storage privado, y tests DB-direct. El problema es que el repo esta operando con demasiada deriva entre cuatro fuentes de verdad:

1. codigo actual,
2. staging Supabase,
3. produccion Supabase,
4. docs/CLAUDE/.claude.

Esa deriva ya afecta seguridad, release, pruebas, contexto de agentes y decisiones de master data. En su estado actual, un agente nuevo puede leer `CLAUDE.md` o `Docs/**` y tomar una decision incorrecta sobre rutas, tablas, plan mode, migraciones, tarifa/costo, `requires_code`, cantidad de tests, o estado real de prod.

## Evidencia de comandos

Comandos principales ejecutados:

- `git status --short --branch`
- `git log --oneline --decorate -n 25`
- `supabase projects list`
- `supabase branches list --project-ref bzeoszympkkicwlfdtcn`
- `supabase gen types typescript --project-id vonwkciosksqspyljzfy --schema public`
- `supabase gen types typescript --project-id bzeoszympkkicwlfdtcn --schema public`
- `supabase db query --linked -o json <audit SQL>`
- scripts Node read-only con `@supabase/supabase-js` contra staging desde `.env.local`
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npx playwright test --list`
- `npx playwright test tests/data-integrity.spec.ts`

Resultados de verificacion:

- `npm run build`: **pasa**. Next.js 16.1.6 compila, TypeScript durante build pasa, 18 rutas generadas.
- `npm run lint`: **falla** con 18 errores y 34 warnings.
- `npx tsc --noEmit --incremental false`: **falla** en `tests/programacion-viaje.spec.ts(34,56): Cannot find name 'sol'`.
- `npx playwright test --list`: **147 tests en 17 archivos**. README dice 131 tests en 14 archivos.
- `npx playwright test tests/data-integrity.spec.ts`: **13 passed**, `[info] Pending late deliveries ...: 0`.

## Estado del working tree

Antes de esta auditoria ya habia cambios no relacionados:

- `CLAUDE.md`
- `repomix-MovimientOS.xml`
- `repomix.config.json`
- `Docs/reference/IC-LOG-PO-06 Movilizaciones (con formularios).pdf`
- `Docs/reference/Testing Plan.md`
- `Entregas tardias plan.png`
- `spectrum-tests/`

Durante la auditoria renderice temporalmente paginas del PDF en `tmp/` y luego limpie esa carpeta. Este reporte es el unico archivo nuevo que agregue.

## Hallazgos Criticos

### C1. `confirmation_code` sigue expuesto y validado en cliente

Severidad: Critico  
Impacto: el codigo de entrega deja de ser una prueba real de recepcion si el usuario puede leerlo en el payload cliente.

Evidencia:

- `src/hooks/useMyTrips.ts:69-77` selecciona `confirmation_code` desde `trips` en el query de cliente.
- `src/components/viajes/DeliveryModal.tsx:137-138` compara `code === trip.confirmation_code` en el browser.
- `src/app/(app)/mis-viajes/[id]/page.tsx:674-686` inserta `confirmation_code_used`, pero no hay comparacion server-side contra el secreto.
- `src/app/(app)/mis-viajes/[id]/page.tsx:1042-1045` y `1142-1149` solo gatean visibilidad por rol en UI.
- `src/components/solicitudes/ActiveTripPanel.tsx:23-25` y `101-108` tambien renderizan el codigo para roles permitidos.
- `src/components/programacion/TripForm.tsx:300-307` muestra el codigo en modo edit/readonly sin un gate de rol propio, dependiendo del page parent.

Recomendacion:

- No exponer `trips.confirmation_code` en queries cliente.
- Convertir entrega en RPC o route handler server-side: input `trip_id`, `code`, `lines`, receptor, adjuntos. El servidor valida el codigo y escribe evento + lineas + observaciones en una transaccion.
- Opcional: almacenar hash del codigo y comparar hash, no texto plano.

### C2. RBAC central existe, pero el proxy no lo usa

Severidad: Critico/Alto  
Impacto: se asume que `ROLE_ROUTES` gobierna acceso, pero el enforcement real solo tiene hardcode para `campo`.

Evidencia:

- `src/lib/utils/constants.ts:83-110` define rutas por rol.
- `src/lib/utils/roles.ts:7-11` define `canAccess(role, route)`.
- `src/proxy.ts:69-90` consulta `people.app_role`, pero solo aplica restriccion especial a `role === 'campo'`.
- `src/proxy.ts:92-97` redirige `/` y `/login`, pero no bloquea rutas por `ROLE_ROUTES` para `pm`, `almacen`, `logistica`.

Recomendacion:

- En `proxy.ts`, despues de resolver rol, usar `canAccess(role, pathname)` para todas las rutas app.
- Mantener excepciones explicitas para `/change-password`, assets y APIs.
- Agregar tests por rol real, no solo admin.

### C3. Funciones SECURITY DEFINER y grants siguen expuestos en Supabase

Severidad: Critico  
Impacto: funciones internas aparecen ejecutables via RPC por `anon` y `authenticated` en el proyecto principal.

Evidencia SQL contra linked prod:

- `public_tables`: 44.
- `security_definer_public_functions`: `audit_trigger`, `cascade_request_status`, `generate_internal_asset_tag`, `generate_request_id`, `generate_trip_id`, `get_my_app_role`, `log_equipment_status_change`, `rls_auto_enable`.
- `public_functions_callable_by_anon`: 17 funciones, incluyendo triggers/helpers.
- `public_functions_callable_by_authenticated`: 17 funciones.
- `mutable_search_path_functions`: `public.cascade_request_status`, `public.enforce_qty_integrity`, `public.generate_internal_asset_tag`, `public.log_equipment_status_change`, `humanos.update_updated_at`.

El comando `supabase db query --linked` retorno data, pero luego mostro retries con `ECIRCUITBREAKER too many authentication failures`; por eso no segui insistiendo con queries al pooler.

Recomendacion:

- `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated` para funciones trigger/internal.
- Mantener expuestas solo RPCs deliberadas.
- Mover funciones internas fuera de schemas expuestos o fijar `search_path`.
- Revisar tambien staging, porque `supabase gen types` muestra `recalc_qty_for_line` como RPC en staging.

### C4. Drift fuerte entre staging, prod y schema local

Severidad: Critico  
Impacto: types, docs y despliegues pueden apuntar a realidades distintas.

Evidencia:

- Staging (`vonwkciosksqspyljzfy`) via `supabase gen types`: **51 tablas public**, 2 funciones expuestas, `gps_vehicle_id` existe, `requires_code` no existe, `stop_type` no existe.
- Prod (`bzeoszympkkicwlfdtcn`) via `supabase gen types`: **44 tablas public**, 1 funcion expuesta, sin `qty_rejected`, sin `delivery_observations`, sin `custody_transfers`, sin `pickup_orders`, sin `external_orders`.
- `supabase/full_schema.sql`: **22 tablas**, 15 funciones, no contiene `gps_vehicle_id`.
- `README.md:10-14` y `CLAUDE.md:7,16,84` dicen 47 tablas.
- `Docs/CHANGELOG.md:9-15` marca Cambio 6.5 aplicado en staging pero pendiente prod.
- `Docs/CHANGELOG.md:1083` dice `equipment.gps_vehicle_id` pendiente prod.
- `Docs/CHANGELOG.md:1116-1117` documenta drift previo de `qty_dispatched`.

Recomendacion:

- Declarar una fuente de verdad por ambiente.
- Generar un reporte `schema-diff staging vs prod` antes de cualquier merge.
- No regenerar types contra prod si el codigo actual apunta a staging con columnas nuevas.
- Convertir migraciones acumuladas en script consolidado versionado antes del merge v2.

### C5. Los gates locales no estan verdes

Severidad: Critico para release  
Impacto: build verde puede esconder lint, TS y test drift.

Evidencia:

- `npm run build`: pasa.
- `npm run lint`: 18 errores y 34 warnings. Errores incluyen React Compiler/purity, refs durante render, setState sync en effect, memoization no preservada, `no-explicit-any`.
- `npx tsc --noEmit --incremental false`: falla en `tests/programacion-viaje.spec.ts(34,56)`.
- `npx playwright test --list`: 147 tests/17 archivos, README sigue diciendo 131/14.
- `Docs/BACKLOG.md:165-166` ya documenta que helpers E2E y auth headless estan rotos o con workaround parcial.

Recomendacion:

- Definir gate real: build + lint + tsc + subset DB-direct + smoke manual.
- Si React Compiler esta activo, arreglar sus reglas o desactivarlo deliberadamente con decision documentada.
- Separar tests que escriben staging de tests read-only.

## Hallazgos Altos de Codigo

### H1. Muchos write flows cliente son multi-step y no transaccionales

Patron repetido: insert header, insert lines, update status, notificar, re-fetch. Si falla un paso intermedio, quedan estados parciales.

Evidencia:

- `src/hooks/useSolicitudes.ts:590-635`: crea solicitud en Borrador, inserta lineas, luego promueve a Enviada. Si line insert falla, deja header creado.
- `src/hooks/useTrips.ts:791-832`: inserta trip, inserta assignments, y si falla borra el trip manualmente como rollback best-effort.
- `src/hooks/useTrips.ts:947-952`: updates de assignments modificados no capturan ni chequean error.
- `src/app/(app)/mis-viajes/[id]/page.tsx:674-721`: entrega hace `trip_events`, `trip_event_lines`, `delivery_observations` en pasos separados; los inserts de lineas/observaciones no chequean errores.
- `src/hooks/usePickupOrders.ts:137-175`: crea pickup order y hace rollback manual si fallan lineas.
- `src/hooks/usePickupOrders.ts:246-269`: completa pickup actualizando lineas en loop y luego header.
- `src/components/dashboard/PendingDeliveriesAlert.tsx:132-160`: inserta incidencia y actualiza linea sin revisar errores.

Recomendacion:

- Mover acciones de negocio a RPCs transaccionales o route handlers server-side con service role limitado.
- Retornar errores user-friendly desde la capa transaccional.
- No depender de "rollback manual" desde cliente.

### H2. Admin masters es CRUD directo, sin MDM ni manejo de errores

Evidencia:

- `src/app/(app)/admin/masters/page.tsx:221-287` hace fetches y silencia errores.
- `src/app/(app)/admin/masters/page.tsx:341` toggle status ignora error.
- `src/app/(app)/admin/masters/page.tsx:383-386` insert/update ignora error.
- `src/app/(app)/admin/masters/page.tsx:398-409` person_projects insert/delete ignora error.
- `src/app/(app)/admin/masters/page.tsx:662-672` optimistic notification prefs update sin rollback.

Impacto:

La pagina que deberia cuidar master data permite edicion directa de personas, proyectos, equipos, ubicaciones, tarifas y notificaciones. Para una empresa con datos viniendo de Spectrum, ProjectSight, B2W, PayDay, Drives, Basecamp y Excels, esto refuerza el problema de MDM en vez de resolverlo.

### H3. Auth usa `user_metadata` para `must_change_password`

Evidencia:

- `src/proxy.ts:62-66` usa `user.user_metadata?.must_change_password`.
- `src/app/(auth)/change-password/page.tsx:27-30` actualiza `data: { must_change_password: false }` desde cliente.

No es el mismo riesgo que autorizar roles, pero sigue siendo metadata editable por la cuenta. Para flags de seguridad o lifecycle de usuario, mejor `people` o tabla de auth policy controlada por backend.

### H4. GPS esta bien encaminado, pero hay deuda operacional

Lo bueno:

- `src/lib/gps/skydata-client.ts:33-44` normaliza `x/y` correctamente.
- `src/components/gps/TripLiveMap.tsx:110-150` pausa polling en tab oculta/stale.
- `src/app/api/gps/trip/[tripId]/position/route.ts:15-24` exige auth y deja que RLS filtre viajes.

Riesgos:

- `src/lib/gps/skydata-client.ts:65-68` devuelve cache vieja si upstream falla, sin exponer edad del cache del fetch fallido.
- `src/components/gps/TripLiveMap.tsx:186-188` mantiene branch muerto `status === 'pickup'`.
- `Docs/superpowers/specs/2026-04-20-gps-live-tracking-design.md:214-216` contiene material tipo credencial/placeholder de SkyData. No repetir secretos en docs.
- `.env.local.example:1-6` ya dice que falta usuario dedicado `api-movimientos`.

### H5. Notificaciones dependen de constraints que han drifted antes

Evidencia:

- `src/lib/notifications/templates/index.ts:13` default `NEXT_PUBLIC_APP_URL` cae a `https://rein-eisenwerk.com`.
- `src/lib/notifications/send.ts:41` usa service role.
- `src/lib/notifications/send.ts:77-88,142-154,158-169` escribe `notification_log`.
- `Docs/CHANGELOG.md:1066-1078` documenta que `notification_log.valid_event_type` ya se desincronizo entre staging/prod y codigo.
- `supabase/full_schema.sql:661-678` todavia tiene el constraint viejo con 13 event types.

Recomendacion:

- Mover event types a una sola fuente compartida codigo/SQL.
- Agregar test read-only que compare `src/lib/notifications/actions.ts` contra constraint real.

## Supabase y MDM

### Estado observado en staging

Usando `.env.local` sin imprimir secretos, staging apunta a `vonwkciosksqspyljzfy`.

Conteos read-only relevantes:

- `people`: 178, activos 176, roles: 14 pm, 2 admin, 5 campo, 1 logistica, 2 almacen, 154 sin rol.
- `people.withRoleNoAuth`: 7.
- `people.withAuthNoRole`: 1.
- `equipment`: 377, todos `Activo`, 13 con `gps_vehicle_id`.
- `projects`: 6, activos 5, cerrado 1.
- `locations`: 8, activas 7.
- `mobilization_rates`: 14 activas.
- `cost_codes`: 138, `full_code` sin nulos ni duplicados, pero 15 duplicados por par `project_id + phase_code` (puede ser por extras, requiere modelo explicito).
- `cost_code_categories`: 656.
- `user_app_roles`: 19, pero el codigo sigue usando `people.app_role`.
- tablas futuras vacias: `purchase_orders`, `purchase_order_lines`, `vendors`, `warehouse_items`, `warehouse_transactions`, `work_orders`.
- storage: bucket `attachments` privado, MIME allowlist y limite 10MB configurados.

### Diagnostico MDM

El sistema tiene master tables, pero todavia no tiene master data management.

Problemas estructurales:

- `people.app_role` sigue siendo RBAC activo mientras `user_app_roles` existe pero no gobierna.
- Admin masters permite edicion manual directa sin fuente, confianza, propietario, vigencia o aprobacion.
- No hay `source_system`, `source_record_id`, `import_batch_id`, `match_status`, `merge_status`, `canonical_id`, `field_provenance`.
- Equipos, personas, proyectos, codigos de costo y ubicaciones viven en `public`, mezclados con tablas operativas.
- Varias tablas futuras para compras, warehouse, work orders y equipos existen en prod/staging con RLS incompleta o sin datos.

Recomendacion MDM para ICONSA:

- Separar schemas: `mdm`, `ops_mobilizations`, `integrations`, `audit`, `app`.
- Crear entidades canonicas:
  - `mdm.people`
  - `mdm.projects`
  - `mdm.equipment`
  - `mdm.cost_codes`
  - `mdm.locations`
  - `mdm.vendors`
  - `mdm.org_units`
- Crear staging/source tables por sistema:
  - `integrations.spectrum_equipment`
  - `integrations.projectsight_projects`
  - `integrations.b2w_equipment`
  - `integrations.payday_people`
  - `integrations.drive_project_files`
  - `integrations.basecamp_projects`
- Crear crosswalks:
  - `mdm.source_records(entity_type, canonical_id, source_system, source_record_id, confidence, last_seen_at)`
  - `mdm.aliases(entity_type, canonical_id, alias_value, alias_type)`
  - `mdm.merge_candidates`
  - `mdm.field_provenance`
- Cambiar admin masters a "review queue", no CRUD libre para campos externos.
- Definir data owner por dominio: equipos, proyectos, RRHH/personas, compras/proveedores, codigos de costo.

## SOP IC-LOG-PO-06 vs app

El PDF original es `Procedimiento de Movilizaciones`, codigo `IC-LOG-PO-06`, version 02, firmado en 2018. Varias paginas son escaneadas, pero los formularios finales si tienen texto extraible.

Lo que la app cubre parcialmente:

- Solicitud de movilizacion `IC-LOG-F-06-03`: solicitante, aprobador, proyecto, equipo/material, desde/hasta, fecha requerida, codigo, conductor.
- Programacion/logistica: backlog, calendario, trips, conductor, vehiculo, remolque, ATTT, escolta.
- Ejecucion: Salida, Parada, Entrega, Retorno, Incidencia.
- Bitacora parcial via `trips`, `trip_events`, `trip_line_assignments`.
- Facturacion/costos parcial via `mobilization_rates`, `trips.cost`, reportes pendientes.

Gaps SOP relevantes:

- Two-week lookahead `IC-LOG-F-06-02` no existe como artefacto formal, solo vistas de programacion/calendario.
- Inspeccion entrada/salida `IC-EQ-F-01-02` no esta integrada al flujo.
- Nota de entrega de material `IC-LOG-F-04-04` no esta modelada como documento/proof formal.
- Permiso ATTT y escolta son booleanos, no workflow con responsable, vencimiento, evidencia, costo o estado.
- Transporte externo se implementa como modalidad, pero no esta conectado a cotizacion/procurement `IC-LOG-PO-01`.
- Bitacora `IC-LOG-F-06-04` y facturacion mensual `IC-LOG-06-05` no estan cerradas como reportes oficiales.
- Retornos de material/equipo deberian requerir nueva solicitud segun SOP; la app permite Retorno como evento de viaje.

## Docs y Claude

### `CLAUDE.md` esta util, pero desincronizado

Problemas con evidencia:

- `CLAUDE.md:7,16,84` dice 47 tablas; staging tiene 51, prod 44, schema local 22.
- `CLAUDE.md:33` referencia `.claude/rules/cost-management.md`, archivo no presente.
- `CLAUDE.md:63-67` habla de `middleware.ts`; el repo usa `src/proxy.ts`.
- `CLAUDE.md:162` dice que costo queda read-only con tarifa; `src/components/programacion/TripForm.tsx:385-394` dice costo siempre editable.
- `CLAUDE.md:168` dice codigo nunca visible para `campo/almacen` y sin bypass; el payload cliente aun contiene `confirmation_code`.
- `CLAUDE.md:192` dice "Feature nuevo -> Plan Mode"; `.claude/settings.json:27` deniega `EnterPlanMode`.
- `CLAUDE.md:196` y `214-215` empujan `git push`; esto contradice el flujo de no push automatico que se ha usado en cambios riesgosos.

### `.claude/settings.json` tiene namespace drift

- `.claude/settings.json:3-14` deniega tools mutantes del namespace viejo `mcp__claude_ai_Supabase__*`.
- `.claude/settings.local.json` local permite `mcp__plugin_supabase_supabase__get_logs`, probando que al menos existe namespace nuevo en alguna sesion.
- Si el plugin actual expone mutaciones bajo namespace nuevo, el deny-list no las cubre.

### `.claude/rules/supabase-readonly.md` esta obsoleto

- Lineas `23-25`: dice que el proyecto no usa `supabase/migrations`, pero el repo tiene `supabase/migrations/00000000000000_baseline.sql`.
- Lineas `65-68`: dice dos branches; `supabase branches list` muestra `main`, `staging` y `humanos-dev`, todas `MIGRATIONS_FAILED`.
- Lineas `74-82`: enforcement documentado contra namespace viejo.

### Plans y specs violan su propio lifecycle

- `.claude/rules/plan-lifecycle.md:49-60` dice limpiar si supera 300 lineas, hard cap 1000, borrar al cerrar tarea.
- `Docs/superpowers/plans/` contiene 14 archivos, incluyendo planes de 176KB, 120KB, 89KB y 79KB.
- `.claude/rules/spec-lifecycle.md:25-43` exige frontmatter de status; varios specs siguen `draft` para features ya implementadas o en Cambio 6.x.

Recomendacion:

- Reescribir `CLAUDE.md` a 120-180 lineas, solo verdades actuales.
- Separar "reglas para agentes" de "contexto historico".
- Crear un `Docs/AGENT_CONTEXT.md` o equivalente con links al estado actual.
- Limpiar `.claude/skills` que mencionan `PickupModal`, `PreparationModal`, generacion frontend de confirmation code, 47 tablas, etc.

## Testing y CI

Lo bueno:

- Hay tests DB-direct para invariantes reales.
- Hay suite `data-integrity.spec.ts` read-only y paso completa: 13/13.
- Hay intentos de cubrir RLS, triggers, cantidad, cancelacion, reversion, notificaciones.

Lo malo:

- Lint y tsc no estan verdes.
- Tests usan service role en helpers (`tests/helpers.ts:13-16`), correcto para verificacion DB, pero requiere aislamiento fuerte.
- Hay credenciales admin hardcodeadas en tests (`tests/auth.setup.ts:59-62`, `tests/helpers.ts:20`, `tests/e2e-full-flow.spec.ts:26`, `tests/role-permissions.spec.ts:12-18`). No imprimo el valor en este reporte. Deben rotarse.
- README `README.md:47` esta stale: dice 131 tests en 14 archivos, actual es 147 en 17.
- `Docs/BACKLOG.md:165-166` ya reconoce helpers rotos y auth headless con workaround parcial.

Recomendacion:

- Mover credenciales a env y rotar la password actual.
- Dividir Playwright en proyectos:
  - `db-readonly`
  - `db-write-staging`
  - `ui-smoke-authenticated`
  - `manual-smoke-prod`
- Agregar pgTAP o SQL transaction tests para RLS/triggers si el equipo va a seguir creciendo.

## Lo que esta bien

- La decision de modelar por lineas, no por solicitud, es correcta para construccion.
- `rate_id` requerido en `useTrips.ts:770-785` y `891-903` esta alineado con la regla de tarifa obligatoria.
- Storage bucket `attachments` es privado, con MIME allowlist y 10MB.
- GPS usa proxy server-side y no expone SkyData al browser.
- `src/lib/supabase/client.ts` valida env publica y `server.ts` usa `@supabase/ssr`.
- `src/lib/notifications/send.ts:111-118` fail-closed en dedup de email, buen patron.
- `tests/data-integrity.spec.ts` es el tipo correcto de test para esta app: invariantes DB sobre casos operativos.

## Roadmap recomendado

### Fase 0: Congelar merge

- No merge a `main`.
- No aplicar mas cambios funcionales encima de Cambio 6.5 hasta cerrar seguridad y drift.
- Confirmar ambiente objetivo: staging como fuente de types para `jaime/dev`; prod como release target.

### Fase 1: Seguridad release-blocking

1. Sacar `confirmation_code` del cliente y validar entrega server-side.
2. Usar `ROLE_ROUTES` en `proxy.ts`.
3. Revocar EXECUTE en funciones internas.
4. Arreglar `search_path` mutable en funciones SECURITY DEFINER.
5. Rotar credenciales hardcodeadas de tests.

### Fase 2: Supabase drift

1. Generar diff staging vs prod.
2. Crear script consolidado del merge v2.
3. Separar schema local obsoleto: regenerarlo o marcarlo deprecated.
4. Resolver branches `MIGRATIONS_FAILED`.
5. Sacar `supabase/.temp/*` del repo tracking aunque ya este en `.gitignore`.

### Fase 3: Gates

1. Lint verde o React Compiler desactivado con decision documentada.
2. `tsc --noEmit` verde.
3. `data-integrity.spec.ts` como gate read-only.
4. Smoke manual sobre staging para los 5 flujos criticos: solicitud, fleet trip, delivery parcial/rejected, pickup, external.

### Fase 4: Docs y agentes

1. Reescribir `CLAUDE.md`.
2. Limpiar `.claude/skills`.
3. Borrar o archivar planes gigantes.
4. Marcar specs `shipped/deprecated/draft` correctamente.
5. Convertir Audit A/B/C en backlog priorizado, no dejarlos como documentos paralelos.

### Fase 5: MDM ICONSA

1. Definir dominios maestros y owners.
2. Crear `mdm` e `integrations` schemas.
3. Introducir source records/crosswalks.
4. Cambiar admin masters a review queue.
5. Preparar integraciones por prioridad: PayDay/personas, Spectrum/equipos, proyectos/cost codes, vendors/purchase orders.

## Merge recommendation

**Bloqueado.**  
Minimo para desbloquear:

- C1, C2, C3 resueltos.
- Diff staging/prod revisado y migracion v2 consolidada.
- `npm run lint` y `npx tsc --noEmit --incremental false` verdes, o excepciones documentadas y aceptadas.
- Credenciales de test rotadas.
- `CLAUDE.md` y `.claude/rules` corregidos para que Claude no siga instrucciones falsas.

