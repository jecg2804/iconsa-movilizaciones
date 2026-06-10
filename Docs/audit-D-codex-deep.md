# Audit D - Codex deep audit

Fecha: 2026-05-12/13  
Auditor: Codex  
Repo: `C:\Users\Jaime Cucalon\Documents\iconsa_apps\movimientOS`  
Branch revisada: `jaime/dev`  
HEAD observado: `a31505d docs: audit-A pre-merge...`

## Veredicto ejecutivo

**No recomiendo mergear este estado a `main`.** El repo esta mucho mas cerca de una app util que de un prototipo, pero todavia tiene riesgos de seguridad, autoridad de datos, drift de base de datos y documentacion operativa que no se pueden tratar como detalles.

El audit anterior `Docs/audit-C-codex-full.md` debe tratarse como **borrador C0**, no como cierre. Este Audit D vuelve a mirar desde cero y separa cuatro frentes:

1. **Codigo y seguridad de la app**: auth/RBAC, flujos de escritura, eventos, GPS, notificaciones y tests.
2. **Supabase y master data**: drift entre staging/prod/local, RLS/policies/functions, calidad inicial de datos y ausencia de gobierno MDM.
3. **Docs y Claude**: `CLAUDE.md`, `.claude/**`, specs, plans y docs desincronizados.
4. **SOP de movilizaciones**: comparacion contra `IC-LOG-PO-06` y sus formularios.

La conclusion principal: **el problema no es que falte una pantalla. El problema es que todavia no hay una fuente de verdad confiable para reglas, schema, permisos y master data.** Eso es normal para el contexto ICONSA que describiste, pero debe manejarse explicitamente antes de convertir MovimientOS en plataforma base para mas procedimientos.

## Estado del worktree

No modifique codigo de la app ni Supabase. Solo cree este documento.

Estado observado antes de escribir este audit:

```text
## jaime/dev
 M CLAUDE.md
 M repomix-MovimientOS.xml
 M repomix.config.json
?? Docs/audit-C-codex-full.md
?? "Docs/reference/IC-LOG-PO-06 Movilizaciones (con formularios).pdf"
?? "Docs/reference/Testing Plan.md"
?? "Entregas tardias plan.png"
?? spectrum-tests/
```

Durante la auditoria el Supabase CLI modifico `supabase/.temp/cli-latest` y el analisis del PDF genero `tmp_pdf_audit/`; ambos artefactos fueron limpiados. No toque los cambios preexistentes.

## Comandos y evidencia revisada

Se reviso:

- Inventario git: `git status`, `git log -n 20`, conteo de archivos con `rg --files`.
- Codigo: rutas App Router, hooks, writers Supabase, auth proxy, componentes de eventos, GPS, notificaciones y tests.
- Supabase CLI: version, proyectos, branches, generacion de tipos de staging/prod, queries read-only a catalogos y conteos.
- Supabase REST via `.env.local`: conteos read-only de tablas principales y checks de calidad de master data.
- Docs: `README.md`, `CLAUDE.md`, `.claude/**`, `Docs/BACKLOG.md`, `Docs/CHANGELOG.md`, specs, plans, reference docs.
- SOP PDF: `Docs/reference/IC-LOG-PO-06 Movilizaciones (con formularios).pdf`, paginas escaneadas y formularios anexos.
- Gates: `npm run build`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npx playwright test --list`, `npx playwright test tests/data-integrity.spec.ts`.

## Hallazgos criticos

### D-C1 - RBAC de rutas no protege `/admin/masters` en servidor/proxy

Severidad: Critica  
Area: auth, RBAC, master data

El repo tiene una matriz formal de rutas en `src/lib/utils/constants.ts:83` y helper `canAccess` en `src/lib/utils/roles.ts:7`, pero el proxy no la usa. `src/proxy.ts:45-46` marca rutas publicas y `src/proxy.ts:53` valida sesion con `getUser`, lo cual esta bien, pero despues solo aplica un caso especial para `campo`. El layout de app solo verifica que exista `people.app_role` (`src/app/(app)/layout.tsx:24-34`), no que el rol pueda entrar a la ruta actual.

En `src/app/(app)/admin/masters/page.tsx`, el redirect de no-admin ocurre en cliente (`201-203`), pero `fetchData()` corre aparte por `useEffect` (`290-292`) y lee `projects`, `people`, `equipment`, `locations`, `mobilization_rates`, `project_extras` y datos de notificaciones (`221-287`). En la base, las policies observadas permiten `SELECT` autenticado amplio en varias master tables. Resultado: el control real depende demasiado de UI/redirect, no de servidor/RLS.

Impacto:

- Un usuario autenticado no-admin puede tener una ventana para cargar datos de admin si entra a la ruta o si invoca queries desde el browser.
- Como `people`, `equipment`, `projects`, roles y notificaciones son master data sensible, esto rompe la idea de que `/admin` es solo UI.

Recomendacion:

- En `src/proxy.ts`, aplicar `canAccess(role, pathname)` para todos los roles.
- En `src/app/(app)/admin/masters/page.tsx`, mover lectura/escritura sensible a server actions/RPCs admin-only o gate server-side.
- Endurecer RLS de master data: `people`, `user_app_roles`, notificaciones y tablas administrativas no deben ser `SELECT true` para todo authenticated si la UI pretende restringirlas.

### D-C2 - El codigo de confirmacion no funciona como secreto

Severidad: Critica  
Area: eventos, seguridad funcional, integridad de entregas

El codigo de confirmacion se selecciona y viaja al cliente:

- `src/hooks/useMyTrips.ts:76` selecciona `confirmation_code`.
- `src/hooks/useMyTrips.ts:173` lo mapea al objeto usado por UI.
- `src/components/viajes/DeliveryModal.tsx:137-138` valida `code === trip.confirmation_code` en cliente.
- `src/app/(app)/mis-viajes/[id]/page.tsx:686` guarda `confirmation_code_used`, pero no hay comparacion server-side contra el codigo real en ese flujo.
- `src/app/(app)/mis-viajes/[id]/page.tsx:1043` define `canSeeConfirmationCode` para `logistica/admin/pm`, y el codigo se renderiza tambien en otras pantallas (`programacion/viaje/[id]`, `TripForm`, `ActiveTripPanel`).

Esto significa que el codigo opera como friccion de UI, no como control de autorizacion. Si el browser ya tiene el secreto, la validacion no prueba que el receptor lo aporto.

Impacto:

- Un usuario con acceso a la pantalla puede inspeccionar el codigo y completar la entrega.
- La BD registra `confirmation_code_used`, pero no impide por si sola un codigo incorrecto.
- La documentacion dice "no hay bypass", pero el control actual se puede bypassar en cliente.

Recomendacion:

- No seleccionar `confirmation_code` hacia el cliente para el rol que confirma.
- Crear un RPC o server action transaccional tipo `confirm_delivery(trip_id, payload, code)` que compare en DB y haga todos los inserts/updates.
- Guardar solo resultado auditado: quien confirmo, codigo usado o hash/veredicto, timestamp, lineas afectadas.

### D-C3 - Flujos de escritura multi-step no son transaccionales

Severidad: Critica  
Area: integridad operacional

La app escribe directamente desde cliente con varios pasos encadenados. Hay mejoras de idempotencia en eventos, pero todavia quedan muchos puntos donde un error parcial deja estado inconsistente.

Ejemplos:

- `src/app/(app)/mis-viajes/[id]/page.tsx:671-721`: entrega inserta `trip_events`, luego `trip_event_lines`, luego `delivery_observations`; los inserts de lineas/observaciones no se chequean con el mismo rigor que el evento.
- `src/app/(app)/mis-viajes/[id]/page.tsx:735-747`: despues de entrega se recalculan/actualizan lineas; esos pasos no forman parte de una transaccion de app.
- `src/app/(app)/mis-viajes/[id]/page.tsx:838` y bloques posteriores de reversion hacen multiples updates sin rollback atomico.
- `src/hooks/useSolicitudes.ts`: crear solicitud inserta header, lineas y luego promueve estado; si falla a mitad, puede quedar parcial.
- `src/hooks/useTrips.ts`: trip + assignments dependen de rollback manual.
- `src/hooks/usePickupOrders.ts` y `src/hooks/useExternalOrders.ts`: headers, lines y completions se escriben en varias operaciones.
- `src/app/(app)/admin/masters/page.tsx:398-409` y `664-672`: writes admin/notification optimisticos sin manejar error de Supabase.

Impacto:

- En construccion, donde el flujo real tiene mala conectividad, tablets/celulares y usuarios no tecnicos, los partial writes son un riesgo operativo real.
- Los triggers ayudan, pero no sustituyen una unidad de trabajo transaccional cuando la UI escribe 3-8 tablas por accion.

Recomendacion:

- Mover acciones de dominio a RPCs o server actions con transacciones: crear solicitud, programar viaje, despacho, entrega, retorno, reversion, pickup/external completion.
- UI debe enviar intencion de negocio, no secuencia de writes.
- Mantener los triggers como cinturones de seguridad, no como orquestador primario invisible.

### D-C4 - Supabase tiene drift serio entre staging, prod y schema local

Severidad: Critica  
Area: release management, datos, DX

Branches observadas:

```text
woonbmfmconldxbeqdnr  humanos-dev  MIGRATIONS_FAILED
bzeoszympkkicwlfdtcn  main         MIGRATIONS_FAILED
vonwkciosksqspyljzfy  staging      MIGRATIONS_FAILED
```

Conteos observados:

```text
staging generated types: 51 public tables, 2 functions
prod generated types:    44 public tables, 1 function
src/lib/types/database.ts: 51 tables, 2 functions
supabase/full_schema.sql: 22 tables, 15 functions
```

`src/lib/types/database.ts` esta alineado con staging, no con prod. `supabase/full_schema.sql` y la baseline local no representan el estado vivo actual. Ademas, todos los branches listados aparecen como `MIGRATIONS_FAILED`.

Impacto:

- No hay una fuente de verdad confiable para schema.
- Los auditores/agentes pueden aprobar cambios contra un schema que no existe en prod.
- Generar tipos puede ocultar drift si no se etiqueta explicitamente de que branch salieron.
- `humanos-dev` aparece dentro del mismo proyecto/listado de branches, lo cual aumenta el riesgo de mezclar apps internas sin boundary claro.

Recomendacion:

- Declarar branch autoritativo por ambiente: local, staging, prod.
- Resolver `MIGRATIONS_FAILED` antes de seguir agregando migraciones.
- Regenerar baseline o crear diff formal staging->prod con decision explicita.
- Versionar docs de schema como snapshots con fecha/ref (`staging vonwk... 2026-05-12`) y no como verdad permanente.

### D-C5 - Funciones/RPCs y SECURITY DEFINER requieren hardening

Severidad: Critica  
Area: Postgres security

En catalogo de prod/main observado via Supabase CLI:

- 44 tablas publicas.
- 17 funciones publicas.
- 8 funciones `SECURITY DEFINER`: `audit_trigger`, `cascade_request_status`, `generate_internal_asset_tag`, `generate_request_id`, `generate_trip_id`, `get_my_app_role`, `log_equipment_status_change`, `rls_auto_enable`.
- Funciones con `search_path` mutable: `cascade_request_status`, `enforce_qty_integrity`, `generate_internal_asset_tag`, `log_equipment_status_change`.
- `anon` y `authenticated` tienen execute sobre varias funciones publicas.

No afirmo que todas sean explotables. Si afirmo que, como postura de seguridad, **SECURITY DEFINER + grants amplios + search_path mutable no debe quedar sin revision funcion por funcion**.

Recomendacion:

- Revocar execute por defecto en schema public donde aplique.
- Dar grants explicitos solo a RPCs que deban ser llamadas por clientes.
- Fijar `SET search_path` seguro en funciones definers.
- Documentar owner, proposito, caller permitido, tablas tocadas y tests por funcion.

## Hallazgos altos

### D-H1 - La base actual no muestra data rota en invariantes puntuales, pero eso no prueba seguridad

`npx playwright test tests/data-integrity.spec.ts` paso 13/13. Eso es buena senal: la data actual no rompe invariantes como cantidades negativas, delivered > quantity, orphan reversions, etc.

Pero esos tests son checks de estado actual, no pruebas de atomicidad, RBAC, server-side validation o resiliencia ante fallas parciales. No contradicen D-C1, D-C2 o D-C3.

### D-H2 - Lint y TypeScript estan rojos

Gates observados:

```text
npm run build: PASS
npm run lint: FAIL - 18 errors, 34 warnings
npx tsc --noEmit --incremental false: FAIL
npx playwright test --list: PASS - 147 tests in 17 files
npx playwright test tests/data-integrity.spec.ts: PASS - 13/13
```

TypeScript falla en:

```text
tests/programacion-viaje.spec.ts(34,56): error TS2304: Cannot find name 'sol'.
```

Lint falla principalmente por reglas de React hooks/compiler:

- `Date.now()` durante render.
- setState directo en effects.
- refs leidos durante render.
- dependencias faltantes.
- memoizacion manual que el compiler no puede preservar.
- `findLineById` usado antes de declararse en `LineSelector`.
- `any` en tests.

Build verde no es suficiente para merge si lint/tsc estan rojos.

### D-H3 - Credenciales de admin hardcodeadas en tests

Hay credenciales de admin hardcodeadas en tests. No reproduzco el secreto en este documento. Esto se debe rotar y mover a variables de entorno/secret manager.

Impacto:

- Riesgo de exposicion accidental por repo, repomix, logs o screenshots.
- Los agentes pueden arrastrar secretos en outputs si no se les guia.

Recomendacion:

- Rotar la credencial.
- Usar `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`.
- Agregar guard para fallar tests si faltan env vars.
- Asegurar que repomix y docs no incluyan secretos.

### D-H4 - Master data no tiene gobierno MDM suficiente

La data staging no esta desastrosa en duplicados obvios:

```text
people: 178 rows, duplicate emails 0, duplicate codes 0
projects: 6 rows, duplicate codes 0
equipment: 377 rows, duplicate spectrum IDs 0, duplicate plates 0
cost_codes: 138 rows, duplicate full_code groups 0
mobilization_rates: 14 rows, duplicate code 0
```

Pero eso solo prueba que algunos duplicados superficiales no aparecen. No existe aun un modelo serio de master data:

- No hay `source_system` consistente.
- No hay `external_id` por sistema origen para Spectrum, ProjectSight, B2W, PayDay, Drive, Basecamp, Excel.
- No hay tabla de aliases/crosswalks.
- No hay ownership de cada dominio.
- No hay estrategia de merge/split de entidades.
- No hay lineage de imports o snapshot dates.
- No hay "golden record" formal.

Para ICONSA, esto es el centro del problema. MovimientOS puede digitalizar el SOP, pero si empieza a crear su propia verdad aislada sin MDM, termina siendo otro silo.

### D-H5 - Hay tablas futuras/producto en prod con RLS enabled pero sin policies

En prod/main aparecen muchas tablas con RLS enabled pero sin policies, por ejemplo vendors, purchase orders, warehouse, work orders, inspections, fuel/meter readings, rental agreements y equipment assemblies.

Eso puede ser intencional si son modulos futuros bloqueados. Pero debe documentarse como tal. Si esas tablas van a entrar a uso, necesitan policies antes de UI o imports.

### D-H6 - GPS v1 esta razonablemente acotado, pero docs/tipos quedaron con diseno viejo

El endpoint GPS actual esta acotado:

- Requiere auth.
- Verifica que el trip exista via RLS.
- Solo sirve si el trip esta `En Ruta`.
- Busca `equipment.gps_vehicle_id`.
- Usa SkyData con cache TTL/stale window.

Pero `TripLiveMap` y tipos todavia mencionan estados/branch `pickup`, mientras el endpoint ya no lo retorna. La spec GPS historica tambien conserva diseno de pickup/self-pickup. No es un blocker critico, pero es deuda de coherencia.

### D-H7 - Notificaciones tienen buen esqueleto, pero el APP_URL fallback parece incorrecto

`src/lib/notifications/templates/index.ts` tiene fallback a `https://rein-eisenwerk.com`. Si ese dominio no es intencional para MovimientOS, es un riesgo de links incorrectos en correos. Ademas, el envio depende de service role en server-side, lo cual esta bien, pero los eventos notificables deben mantenerse alineados con constraints de `notification_log`.

## Auditoria por modulo de codigo

### Auth/RBAC

Bien:

- `src/proxy.ts` usa `supabase.auth.getUser()`, no `getSession()`.
- Hay helpers de roles y constantes centralizadas.
- `must_change_password` se fuerza antes de rutas app.

Mal/riesgo:

- La matriz `ROLE_ROUTES` no se aplica globalmente.
- Admin depende de redirect cliente.
- `user_metadata.must_change_password` puede ser conveniente, pero authz operacional no debe depender solo de metadata manipulable sin controles claros.

Prioridad: alta antes de mas features.

### Solicitudes

Bien:

- El dominio ya distingue header/lines, borrador/enviado, requester, project, cost code, equipment/material, origin/destination, quantities.
- Hay esfuerzos de invariantes de cantidad.

Mal/riesgo:

- Crear/actualizar/cancelar solicitud son multi-step client writes.
- Algunos deletes/updates secundarios no se chequean.
- Las reglas de negocio estan divididas entre UI, hooks, triggers y tests; cuesta saber quien manda.

Recomendacion: RPC transaccional para `create_request`, `update_request_lines`, `send_request`, `cancel_request`.

### Programacion / Trips

Bien:

- La programacion ya cubre driver, vehicle, trailer, scheduled date/time, rate/cost, ATTT/escort/attachments y assignments.
- La politica "tarifa siempre requerida" aparece en tests.

Mal/riesgo:

- Crear/editar trip sigue con writes encadenados.
- Rollback manual no equivale a transaccion.
- TypeScript tiene falla en test de programacion (`sol` no definido).

Recomendacion: RPC `create_trip_with_assignments` y `update_trip_with_assignments`.

### Mis viajes / Eventos

Bien:

- Hay modelo de eventos mas rico: Salida, Entrega, Parada, Retorno, Reversion.
- Existen pruebas de integridad para varios casos.
- Cambio 6.5 movio parte de la logica a triggers/checks.

Mal/riesgo:

- Entrega y reversion siguen con pasos client-side no atomicos.
- Codigo de confirmacion se valida en cliente.
- Algunas inserciones secundarias no chequean errores.

Recomendacion: `register_departure`, `register_delivery`, `register_stop`, `register_return`, `revert_event` como RPCs transaccionales con tests BD-direct.

### Admin / Masters

Bien:

- La pantalla centraliza proyectos, personas, equipos, ubicaciones, tarifas, extras y preferencias de notificaciones.

Mal/riesgo:

- Ruta no protegida server-side con matriz de permisos.
- Reads masivos corren antes/independiente del redirect.
- Writes optimisticos sin manejo de errores.
- No hay modelo MDM ni lineage de fuentes.

Recomendacion: tratar Admin Masters como modulo de gobierno de datos, no solo CRUD.

### Pickup / External Orders

Bien:

- El repo ya reconoce flujos externos: pickup orders, external orders, lineas y completions.
- Esto calza con el SOP cuando no hay disponibilidad interna y hay proveedores/mensajeros.

Mal/riesgo:

- Writes multi-step.
- Relacion con vendor/procurement/ProjectSight/Spectrum no esta modelada.
- No hay ownership de datos externos.

Recomendacion: antes de expandir esto, definir vendors/source records/crosswalks.

### Notifications

Bien:

- Uso de service role parece confinado a server-side.
- Hay logs de notificacion.
- Cron tiene bearer guard con `CRON_SECRET`.

Mal/riesgo:

- Proxy excluye `/api/cron`; depende solo del guard del handler.
- Event types y constraints han tenido drift historico.
- Fallback de dominio debe corregirse/verificarse.

### Storage

Bien:

- Bucket `attachments` no es publico.
- MIME types estan restringidos a PDF e imagenes.
- Anon no pudo listar tablas principales ni buckets en checks puntuales.

Pendiente:

- Revisar policies de storage por rol/proyecto/procedimiento.
- Definir retention y naming por SOP/formulario.

## Auditoria Supabase y MDM

### Ambientes y schema

La realidad actual es:

- **Staging (`vonwkciosksqspyljzfy`)**: lo que usa `.env.local` y `src/lib/types/database.ts`.
- **Prod/main (`bzeoszympkkicwlfdtcn`)**: menos tablas y menos functions.
- **Local files (`supabase/full_schema.sql`, baseline migration)**: muy atrasados.
- **HumanOS branch (`woonbmfmconldxbeqdnr`)**: aparece en el mismo proyecto/listado de branches y tambien con migraciones fallidas.

Esto necesita orden antes de que MovimientOS sea base de una plataforma multi-app.

### Calidad inicial de master data

Observaciones positivas:

- No se detectaron duplicados obvios por email/codigo en `people`.
- No se detectaron duplicados obvios por code en `projects`.
- No se detectaron duplicados obvios por Spectrum ID o placa en `equipment`.
- `equipment` tiene 377 activos y 13 con GPS mapeado.
- `mobilization_rates` tiene 14 activas y sin duplicados de code.

Observaciones preocupantes:

- `people.app_role` esta mayormente `NULL` (154 de 178).
- Hay personas con rol app sin auth y una con auth sin rol, segun checks realizados.
- `cost_codes` tiene 15 grupos duplicados por `project_id + phase_code`, aunque `full_code` no duplica. Puede ser valido, pero debe explicarse.
- Las tablas futuras estan casi vacias y algunas sin policies utiles.

### Modelo MDM recomendado

Para la vision ICONSA, MovimientOS deberia evolucionar hacia un core MDM liviano, no a un mega ERP. Propuesta de dominios:

1. **Personas e identidad**
   - `people` como golden record humano.
   - `auth.users` como identidad de login, no como master persona.
   - Crosswalks a PayDay, Spectrum, ProjectSight, Basecamp, correos personales/corporativos.

2. **Organizacion y proyectos**
   - Proyectos ICONSA con codigo, estado, cliente, ubicacion, PM, contrato, fechas.
   - Crosswalk a Spectrum/ProjectSight/Drive/Basecamp.

3. **Equipos y activos**
   - Golden record de equipo.
   - IDs Spectrum, GPS/SkyData, placas, categorias, ownership, estado operacional.
   - Historial de ubicacion separado de master.

4. **Ubicaciones**
   - Proyectos, talleres, bodegas, proveedores, sitios temporales.
   - Geocoding opcional, aliases y direcciones normalizadas.

5. **Cost codes y categorias**
   - Modelo canonico por proyecto.
   - Source/version/import batch.
   - Evitar que cada app invente fases/categorias.

6. **Vendors/materiales/procurement**
   - Proveedores y materiales como dominio aparte, no solo texto libre.
   - Crosswalk a ProjectSight/Spectrum si aplica.

7. **Procedimientos y formularios**
   - SOPs como entidades/versiones: codigo, version, fecha, owner, formularios asociados.
   - Movilizaciones seria el primer procedimiento digitalizado, no un caso especial aislado.

8. **Documentos/attachments**
   - Relacionar attachments a procedimiento, formulario, solicitud, viaje, evento y source system.
   - Retention y auditoria.

Tablas de soporte recomendadas:

- `source_systems`
- `source_records`
- `entity_aliases`
- `import_batches`
- `merge_decisions`
- `data_quality_issues`
- `data_steward_assignments`

La regla practica: **cada dato clave debe poder responder de donde vino, quien lo puede corregir, como se relaciona con sistemas externos, y que app lo puede consumir.**

## Auditoria Docs y Claude

### CLAUDE.md

`CLAUDE.md` esta desalineado con la app actual:

- Dice 47 tablas, pero staging/types tienen 51, prod 44 y schema local 22.
- Referencia `middleware.ts`; el repo usa `src/proxy.ts`.
- Lista `.claude/rules/cost-management.md`, pero ese archivo no existe.
- Dice que el codigo de confirmacion no tiene bypass, pero la validacion ocurre en cliente.
- Indica "Feature nuevo -> Plan Mode", mientras `.claude/settings.json` deniega `EnterPlanMode`.
- Indica commit + push origin `jaime/dev` y auto-push, mientras `.claude/rules/git-workflow.md` dice que Code no pushea y que push es solo James.

Recomendacion: reescribir `CLAUDE.md` como documento corto de verdad actual, no como acumulado historico.

### `.claude/**`

Problemas principales:

- `settings.json` deniega namespaces viejos de Supabase MCP; puede no cubrir namespaces actuales del plugin.
- `supabase-readonly.md` dice que no existe `supabase/migrations`, pero el repo tiene baseline.
- `supabase-readonly.md` menciona dos branches; el CLI lista tres.
- `tool-usage.md` habla de `repomix-output.xml` y `repomix.config.ts`; el repo tiene `repomix-MovimientOS.xml`, `repomix-MovimientOS-main.xml` y `repomix.config.json`.
- Skills internos mencionan 47 tablas, 73 policies, frontend fallback de confirmation code y componentes removidos.

Recomendacion: separar `.claude` en:

- reglas vivas minimas,
- runbooks verificados,
- skills activos,
- archivo historico/deprecated.

### Docs

Problemas principales:

- `README.md` tiene conteos y flujo de push desactualizados.
- `Docs/BACKLOG.md` conserva texto ambiguo sobre `requires_code`: cerrado, eliminado, pero con "implementacion pendiente" y columna que "puede quedar".
- `Docs/CHANGELOG.md` es util pero gigante; debe seguir siendo cronologia, no fuente de verdad operacional.
- `Docs/superpowers/plans` acumula planes enormes con muchos `pending` aunque varias piezas ya se shippearon.
- Specs con status `draft` o `in-progress` parecen representar funcionalidades ya implementadas.
- Hay duplicidad historica en audits de `.claude` bajo `Docs/reference`.
- `supabase/full_schema.sql` parece historico, no schema vivo.

Recomendacion:

- Crear una matriz `Docs/DOCS_INDEX.md` con status: `current`, `historical`, `draft`, `deprecated`.
- Archivar docs historicos sin borrarlos si todavia sirven de evidencia.
- Hacer que `TRAIL`, `BACKLOG`, `CHANGELOG`, specs y `.claude` no se contradigan.
- Marcar `audit-C` como draft o superseded por este Audit D.

## SOP de movilizaciones vs app

El PDF `IC-LOG-PO-06` es un SOP de 2018 para movilizaciones. Las paginas 1-9 son escaneadas; paginas 10-15 tienen formularios extraibles:

- `IC-EQ-F-01-02` - Reporte de entrada/salida de equipo al taller de Chilibre.
- `IC-LOG-04-04` - Nota de entrega de material.
- `IC-LOG-F-06-02` - Two Week Look-Ahead Schedule.
- `IC-LOG-F-06-03` - Solicitud de movilizacion de equipo o material.
- `IC-LOG-F-06-04` - Bitacora de movilizaciones.
- `IC-LOG-06-05` - Movilizaciones mes de facturacion.

### Cobertura actual

MovimientOS cubre bien:

- Solicitud de movilizacion con header y lineas.
- Equipo/material, origen/destino, cantidad, unidad, proyecto, cost code.
- Programacion de viaje.
- Chofer, vehiculo, trailer.
- Tarifa/costo.
- ATTT/escort como campos.
- Adjuntos.
- Salida, parada, entrega, retorno y reversion.
- Confirmacion de entrega.
- Vista calendario/lookahead.
- GPS live map para viajes en ruta.

### Gaps frente al SOP

1. **Two-week lookahead**
   - App tiene calendario/programacion.
   - Falta workflow formal de cierre/publicacion/envio a gerencia, bodega y proyectos.

2. **Permiso ATTT**
   - App lo modela como boolean/attachment.
   - Falta estado del permiso, vencimiento, documento requerido, responsable y aprobacion.

3. **Inspeccion de equipo**
   - SOP referencia `IC-EQ-F-01-02`.
   - Tablas de inspeccion existen/futuras, pero sin UI/policies maduras.

4. **Nota de entrega de material**
   - App maneja entrega y attachments.
   - No hay generacion/control formal del formulario `IC-LOG-04-04`.

5. **Bitacora de movilizaciones**
   - App tiene eventos.
   - Falta reporte operacional equivalente a `IC-LOG-F-06-04`.

6. **Facturacion mensual**
   - SOP usa bitacora + tabla de tarifas para facturacion mensual.
   - App tiene tarifas/costos, pero no reporte `IC-LOG-06-05` ni cierre contable/finanzas.

7. **Retornos**
   - SOP dice que retornos requieren nueva solicitud.
   - App modela Retorno como evento dentro del viaje. Puede ser mejor producto, pero la desviacion debe documentarse como decision consciente.

8. **Disponibilidad y transporte externo**
   - SOP contempla disponibilidad interna y cotizacion externa si no hay transporte.
   - App ya tiene pickup/external orders, pero falta integracion con vendors/procurement/source systems.

### Lectura de producto

El SOP debe ser **baseline historico**, no camisa de fuerza. Digitalizarlo literalmente puede replicar procesos viejos. La oportunidad es convertirlo en workflow auditable y medible:

- solicitud,
- disponibilidad,
- programacion,
- permisos,
- ejecucion,
- evidencia,
- cierre,
- costo,
- facturacion,
- data lineage.

## Recomendacion de secuencia

### Fase 0 - Congelar merge a main

- No mergear mientras lint/tsc esten rojos.
- No mergear mientras RBAC admin y codigo de confirmacion sigan client-side.
- No empujar prod schema sin resolver `MIGRATIONS_FAILED`.

### Fase 1 - Seguridad minima

1. Aplicar matriz `ROLE_ROUTES` en proxy.
2. Gate server-side para admin masters.
3. Endurecer RLS de master data sensible.
4. Rotar credenciales hardcodeadas en tests.
5. Corregir fallback APP_URL de notificaciones si no es intencional.

### Fase 2 - Confirmacion y eventos transaccionales

1. Crear RPC/server action para entrega con codigo server-side.
2. Mover `trip_events`, `trip_event_lines`, `delivery_observations` y updates de cantidades a una transaccion.
3. Hacer lo mismo para salida, retorno y reversion.
4. Mantener tests BD-direct para invariantes.

### Fase 3 - Supabase release discipline

1. Resolver migraciones fallidas.
2. Definir staging/prod/local autoritativos.
3. Crear diff formal staging -> prod.
4. Regenerar types con metadata del branch.
5. Clasificar `supabase/full_schema.sql` como historico o refrescarlo.

### Fase 4 - Docs/Claude cleanup

1. Reescribir `CLAUDE.md`.
2. Actualizar `.claude/rules/supabase-readonly.md`, `tool-usage.md`, `git-workflow.md`.
3. Marcar skills desactualizados como deprecated o corregirlos.
4. Clasificar specs/plans con lifecycle real.
5. Crear `Docs/DOCS_INDEX.md`.

### Fase 5 - MDM foundation

1. Definir `source_systems`, `source_records`, `entity_aliases`, `import_batches`.
2. Elegir dominios iniciales: people, projects, equipment, cost codes, locations.
3. Definir owners: quien corrige cada master.
4. Crear data quality dashboard interno.
5. Integrar Spectrum/ProjectSight/B2W/PayDay/Drive/Basecamp por fases, no todo a la vez.

## Que no hice

- No hice cambios de codigo.
- No hice DDL/DML en Supabase.
- No ejecute full Playwright suite.
- No consulte directamente Spectrum, ProjectSight, B2W, PayDay, Google Drive o Basecamp.
- No valide con usuarios operativos el SOP versus proceso actual.

## Cierre

MovimientOS ya tiene una base funcional importante: formularios, trips, eventos, cantidades, GPS, notificaciones y tests. Pero si la meta es convertirse en plataforma interna de datos/procedimientos para ICONSA, el proximo salto no es agregar pantallas: es **cerrar autoridad**.

Autoridad significa:

- quien puede ver y escribir,
- que schema manda,
- que accion es transaccional,
- que dato es master,
- de donde vino,
- quien lo corrige,
- y que documento/procedimiento esta vigente.

Ese es el trabajo que separa una app util de una plataforma interna confiable.
