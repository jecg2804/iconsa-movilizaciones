# MovimientOS

Sistema de operaciones para ICONSA (constructora pesada, Panamá). Digitaliza procedimientos del taller de Chilibre, empezando por movilizaciones (IC-LOG-PO-06): solicitudes → programación → ejecución.

## Quick Reference

- **47 tablas** en public schema con RLS habilitada en todas (usar Supabase MCP para detalles)
- **Stack:** Next.js 16 (App Router) + Supabase + Tailwind CSS → Vercel (`rein-eisenwerk.com`)
- **Auth:** Supabase Auth con RLS en todas las tablas
- **Patrón clave:** Operaciones a nivel de LÍNEA (logística programa LÍNEAS, no solicitudes)
- **Skills:** Ver `.claude/skills/` para CRUD, eventos, queries, entregas parciales, seed data, decisiones técnicas

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript (target ES2022) + Tailwind CSS → Vercel
- **DB:** Supabase PostgreSQL + Auth + RLS + Storage (prod `bzeoszympkkicwlfdtcn`, staging `vonwkciosksqspyljzfy`, 47 tablas)

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Build de producción — correr antes de push
npm run lint         # ESLint
npx supabase gen types typescript --project-id bzeoszympkkicwlfdtcn > src/lib/types/database.ts
```

## Key Directories

```
.claude/
├── rules/                        # Reglas que Claude Code debe seguir siempre
│   ├── commit-after-step.md
│   ├── cost-management.md
│   ├── no-modify-specs.md        # Sistema de Tiers (Tier 1: solo Chat, Tier 2: Code actualiza)
│   ├── supabase-readonly.md
│   └── tool-usage.md             # MCPs, plugins, skills — cuándo y cómo usar cada herramienta
├── skills/                       # Patrones de implementación (cargan on-demand)
│   ├── crud-page.md
│   ├── events-page.md
│   ├── form-submit-guard.md      # Anti doble-submit — useSubmitGuard en todo handler async
│   ├── supabase-queries.md
│   ├── self-update.md
│   ├── partial-delivery/SKILL.md
│   ├── seed-data/SKILL.md
│   └── technical-decisions/SKILL.md  # Funciones, triggers, cascada, RLS
src/
├── app/
│   ├── (auth)/login/           # Login (Supabase Auth)
│   ├── (app)/                  # Layout autenticado (sidebar + topbar + guard)
│   │   ├── dashboard/          # KPIs adaptativo por rol
│   │   ├── solicitudes/        # CRUD solicitudes (pm, logistica, admin)
│   │   ├── programacion/       # Backlog + viajes (logistica, admin)
│   │   ├── mis-viajes/         # Ejecución/eventos (logistica, campo, almacen, admin)
│   │   └── admin/masters/      # CRUD tablas maestras (admin)
├── components/
│   ├── ui/                     # Componentes base (Button, Badge, Select, DataTable)
│   ├── layout/                 # Sidebar, Topbar, MobileNav
│   ├── solicitudes/            # SolicitudForm, LineEditor, LineRow
│   ├── programacion/           # BacklogTable, TripForm, LineSelector
│   ├── viajes/                 # TripCard, EventTimeline, CodeConfirmation
│   └── dashboard/              # KpiCard, RecentActivity
├── lib/
│   ├── supabase/               # client.ts, server.ts, middleware.ts
│   ├── types/database.ts       # Tipos auto-generados de Supabase
│   └── utils/                  # constants, status, roles, format, priorities
├── hooks/                      # useAuth, useProjects, useSolicitudes, useTrips
└── middleware.ts               # Auth redirect + role guard
```

## Reference Docs

| Documento | Cuándo leerlo |
|-----------|---------------|
| @Docs/CHANGELOG.md | **Leer al inicio de cada sesión.** Qué se hizo recientemente (código + BD). Actualizar con cada commit. |
| @Docs/BACKLOG.md | Lo que falta por hacer. Consultar cuando se planifica siguiente feature. |
| Docs/FEATURE_SPEC.md | Reglas de negocio, pantallas, estados. Leer secciones relevantes (NO auto-cargar — 39K chars). |
| Docs/reference/ | Research docs de Chat: Vision Roadmap, Self-Pickup, Vibecoder's Guide, Events V2 specs. |
| Supabase MCP | **Schema source of truth.** Consultar tablas, columnas, relaciones directamente. 47 tablas con COMMENT ON TABLE/COLUMN. |

**IMPORTANTE:** Para schema, siempre consultar Supabase MCP (no docs estáticos). Para reglas de negocio, FEATURE_SPEC.md es la fuente de verdad. Ver `.claude/rules/` para reglas de commit, supabase, y modificación de specs.

## Coding Conventions

### TypeScript
- Strict mode. No `any` — usar `unknown` si necesario.
- Interfaces sobre types (excepto unions).
- ES modules (`import/export`), nunca CommonJS.
- Nombres de variables y funciones en **inglés**. Comentarios en **español** cuando aclaran lógica de negocio.

### React / Next.js
- Functional components con hooks. No class components.
- Server Components por default. `'use client'` solo cuando hay interactividad.
- App Router — no Pages Router.
- Tailwind para estilos. No CSS modules, no styled-components.

### Base de datos
- Todos los IDs son UUID (`gen_random_uuid()`).
- Todas las tablas tienen `created_at` y `updated_at` con trigger automático.
- RLS habilitado en todas las tablas.
- Tabla `equipment` es UNIFICADA (equipos + vehículos). Vehículos = `type_code IN ('VHL','VHP')`. Remolques = `spectrum_code LIKE 'REM%'`.
- **47 tablas** en public schema. Consultar Supabase MCP para detalles de cada tabla.
- **user_app_roles** existe como fundación multi-app RBAC pero el código MVP usa `people.app_role`. No migrar todavía.
- **cost_codes** filtrar por `project_id`. **cost_categories** filtrar via `cost_code_categories` por `cost_code_id` seleccionado.

### Archivos
- Componentes: `PascalCase.tsx` (ej: `SolicitudForm.tsx`)
- Utils/hooks: `camelCase.ts` (ej: `useSolicitudes.ts`)
- Un componente por archivo.

## Design Tokens

```
Navy:   #1B3A5C  (primary — headers, nav, branding)
Gold:   #F0A500  (accent — ICONSA brand)
Blue:   #0A6EBD  (info, links, estado Enviada)
Green:  #1A7F5A  (success, Completada)
Orange: #B45309  (warning, Urgente, En Proceso)
Red:    #C0392B  (error, Vencida, Cancelada)
Purple: #553C9A  (Programada, asignaciones)
Gray:   #5A6272  (secondary text)
```

## 5 Roles del Sistema

| Rol | Código | Acceso principal |
|-----|--------|-----------------|
| Ingeniero de Proyecto | `pm` | Solicitudes (CRUD sus proyectos, VER todas), Programación (lectura), Dashboard, Mis Viajes |
| Coordinador Logística | `logistica` | Todo excepto Admin y crear solicitudes. Dashboard. |
| Conductor | `campo` | Mis Viajes + eventos. Dashboard. |
| Almacenista | `almacen` | Mis Viajes + eventos, Dashboard. |
| Administrador | `admin` | Todo. |

## Reglas Críticas (NUNCA violar)

1. **PM ve TODAS las solicitudes** de todos los proyectos. Filtro default = su proyecto. Solo CREA/EDITA para SUS proyectos (via `person_projects`).
2. **NO agregar líneas después de Borrador.** Enviada = editar existentes, no agregar nuevas.
3. **Eventos: sin restricción por driver_id en MVP.** Cualquier logistica/campo/almacen registra eventos.
4. **Dashboard operativo único.** Todos los roles ven lo mismo: 4 KPIs + chart por proyecto + backlog crítico + recientes.
5. **UI 100% español.** Botones, labels, mensajes, placeholders — todo en español.
6. **Mobile-first.** Los ingenieros y conductores usan celulares.
7. **Monospace para IDs.** `25-506-SM-023` y `MOV-2026-042` siempre en fuente monoespaciada.
8. **Remolque condicional.** REQUERIDO cuando vehículo es cabezal (CAB### o 'CABEZAL'). Filtrar remolques por `spectrum_code LIKE 'REM%'`. Opcional para pick-up, volquete, camión grúa.
9. **Tarifa y Costo OPCIONALES.** No toda movilización tiene tarifa formal. Si se selecciona tarifa, pre-rellenar Costo con `rate`. Campo sigue editable.
10. **Redirect después de guardar/enviar.** Crear nuevo → redirige a lista. Editar existente → se queda en detalle. Enviar solicitud → siempre a lista.
11. **Filtro equipos en solicitud:** `type_code NOT IN ('ING')`. NO excluir VHL, VHP, TEC.
12. **Solicitante NO editable.** Auto-fill con usuario logueado. El campo es disabled/readonly.
13. **Aprobado por filtrado.** Dropdown filtra por `app_role = 'pm'` (11 personas de proyecto).
14. **Cost codes en cascada desde BD.** Proyecto → Fase (cost_codes filtrado por project_id) → Categoría (cost_categories filtrado via cost_code_categories) → Código auto-generado: `{proyecto}-{fase}-{categoría}`.
15. **Código de confirmación visible para pm/logistica/admin.** NUNCA para campo/almacen. PM lo ve en /solicitudes/[id] sección Viajes Programados. Código MUST be correct — no hay bypass. `received_by_id` vincula receptor a people.
16. **Timestamps de eventos automáticos.** now() automático, NO editable. El usuario no puede cambiar cuándo ocurrió un evento.
17. **Search de equipos por código.** Dropdowns de equipment buscan en spectrum_code Y description. Label: "{spectrum_code} — {description}".

## Estados y Cascada

```
Solicitud: Borrador → Enviada → En Proceso → Completada / Cancelada
Línea:     Pendiente → Programada → En Transito → Entregada / Parcial / Cancelada
Viaje:     Programado → En Ruta → Completado / Cancelado
```

**'Parcial' existe SOLO a nivel de LÍNEA.** Nunca a nivel de solicitud.
**'En Transito' SIN acento** es canónico — mismatches fallan silenciosamente.
Cascada (`cascade_request_status()`): cuando cambia una línea, re-evalúa la solicitud padre.

## Workflow

### Commands
- `/project:fix-bug "descripción"` — Diagnostica y arregla un bug
- `/project:deploy-check` — Verifica readiness pre-deploy (build, types, secrets, git)

### Flujo por tarea
1. CHANGELOG.md y BACKLOG.md se auto-cargan (contexto reciente + pendientes)
2. Feature nuevo → Plan Mode. Bug → `/fix-bug`. Auditoría → Explore agents.
3. Si toca eventos/fulfillment → leer `Docs/reference/Self-pickup.md`
4. Si planifica feature nuevo → leer `Docs/reference/Vision Roadmap.md`
5. Verifica schema via Supabase MCP si es necesario
6. `git commit` + `git push origin jaime/dev`. Husky `post-commit` lanza `npm run build` en background automáticamente — no hace falta correrlo a mano; si falla, el siguiente `git push` lo bloquea (ver `.claude/rules/git-workflow.md` para el flujo completo).
7. Commit → CHANGELOG.md entry (atómico, mismo commit)

### Cambios de BD
- STOP. Agregar `[bd-pending]` en CHANGELOG.md. James ejecuta via Supabase SQL Editor en staging (y después en prod con `/release`) → cambiar a `[bd]`.

### NUNCA
- No commits/push a `main`. Solo `jaime/dev`. Deny patterns + Husky lo bloquean técnicamente.
- No ESCRIBIR en Supabase via MCP. Solo LEER. Las tools mutantes del plugin están denegadas en `.claude/settings.json`.

### Quién hace qué
- **Code (yo):** Implementar, auditar, fix bugs, commits a jaime/dev. El `post-commit` hook ya dispara build para mí.
- **James:** Ejecutar SQL en Supabase SQL Editor, decisiones finales, aprobar PRs de release, configurar external services (GitHub, Vercel).
- **Chat:** Research web, leer PDFs de ICONSA, planificación estratégica de largo plazo.
- **James:** Decisiones finales, input de negocio, aprobaciones

## Git

- `main` — Estable. Solo docs y código aprobado.
- `jaime/dev` — Branch de James. Commits auto-push habilitado.
- `andy/dev` — Branch de Andy.
- Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` — mensaje en español.

## Dominio

- **Solicitud (SM):** Pedido formal para mover equipo/material. ID: `{Proyecto}-SM-{###}`.
- **Línea:** Un ítem dentro de una solicitud (equipo o material con origen, destino, cantidad).
- **Viaje (Trip):** Salida física de un vehículo. ID: `MOV-{YYYY}-{###}`. Puede llevar líneas de múltiples solicitudes (many-to-many via `trip_line_assignments`).
- **Backlog:** Todas las líneas pendientes de programar. Vista principal de Charris.
- **Charris:** Carlos Charris — Coordinador de Logística. Usuario más importante del sistema.
- **Chilibre:** Taller central de ICONSA (= Almacén Central). Origen/destino principal.
- **Fase / Código de Costo:** Línea presupuestaria de Sage/Spectrum. Cada proyecto tiene sus propias fases. Tabla `cost_codes`.
- **Categoría de Costo:** Tipo de gasto: CON, EQA, EQI, ICS, MAT, OTR, SAL, SUB. Tabla `cost_categories`. Cada fase usa un subconjunto via `cost_code_categories`.
- **Código de Costo Completo:** `{proyecto}-{fase}-{categoría}`. Ejemplo: `25-506-01-3100-EQI`. Todo con dashes. Trigger `generate_full_code()` en BD.
- **Fallback:** Texto libre cuando un valor no existe en un dropdown. Crea sugerencia para admin en tabla `suggestions`.
- **Cascada:** Trigger que actualiza estado de solicitud basándose en estados de sus líneas.
- **Código de confirmación:** 4 dígitos generados al crear viaje (trigger BD + frontend). Mecanismo de delegación de autoridad — PM decide quién recibe al compartir el código. MUST be correct, sin bypass. Receptor seleccionado de dropdown de personas del proyecto destino. `received_by_id` vincula a people.

## Proyectos Activos (5)

| Código | Nombre | Fases |
|--------|--------|:-----:|
| 24-404 | Costa Norte | 49 |
| 25-505 | Paraíso | 23 |
| 25-506 | Muelle 14 | 11 |
| 26-604 | Inyecciones Metro | 7 |
| 26-605 | Micropilotes Multiplaza | 8 |

ASTIBAL (25-504) está cerrado. No aparece en dropdowns (filtro `status = 'Activo'`).
