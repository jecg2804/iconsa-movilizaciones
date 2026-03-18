# MovimientOS

Sistema de operaciones para ICONSA (constructora pesada, Panamá). Digitaliza procedimientos del taller de Chilibre, empezando por movilizaciones (IC-LOG-PO-06): solicitudes → programación → ejecución.

## Quick Reference

- **44 tablas** en public schema (usar Supabase MCP para detalles)
- **Stack:** Next.js 16 (App Router) + Supabase + Tailwind CSS → Vercel (`rein-eisenwerk.com`)
- **Auth:** Supabase Auth con RLS en todas las tablas
- **Patrón clave:** Operaciones a nivel de LÍNEA (logística programa LÍNEAS, no solicitudes)
- **Skills:** Ver `.claude/skills/` para CRUD, eventos, queries, entregas parciales, seed data, decisiones técnicas

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS → Vercel
- **DB:** Supabase PostgreSQL + Auth + RLS + Storage (project `bzeoszympkkicwlfdtcn`, 44 tablas)

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Build de producción — correr antes de push
npm run lint         # ESLint
npx supabase gen types typescript --project-id bzeoszympkkicwlfdtcn > src/lib/types/database.ts
```

## Key Directories

```
.claude/                          # ⚠️ EN LA RAÍZ DEL REPO, NO en tu directorio de usuario
├── rules/                        # Reglas que Claude Code debe seguir siempre
│   ├── commit-after-step.md
│   ├── cost-management.md
│   └── no-modify-specs.md        # Sistema de Tiers (Tier 1: solo Chat, Tier 2: Code actualiza, Tier 3: Code sugiere)
├── skills/                       # Patrones de implementación por tipo de tarea
│   ├── crud-page.md
│   ├── events-page.md
│   ├── supabase-queries.md
│   └── self-update.md            # Cómo mantener docs sincronizados
└── suggestions.md                # Claude Code escribe aquí sugerencias a Tier 1
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
| @Docs/FEATURE_SPEC.md | **Reglas de negocio, pantallas, campos, validaciones, estados.** Spec v4 (fuente de verdad para lógica de negocio). |
| @Docs/FEATURE_SPEC_v3_FOUNDATIONAL.md | Contexto profundo: el spec original de 1249 líneas. Schema outdated pero reglas de negocio ~90% vigentes. |
| @Docs/SYNC_LOG.md | **Leer al inicio de cada sesión.** Cambios recientes de Chat/James que te afectan. |
| @Docs/BUGS.md | Bugs encontrados y resueltos. |
| Supabase MCP | **Schema source of truth.** Consultar tablas, columnas, relaciones directamente. 44 tablas con COMMENT ON TABLE/COLUMN. |

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
- **44 tablas** en public schema. Consultar Supabase MCP para detalles de cada tabla.
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

## Workflow para Claude Code

**ANTES de cada sesión:**
1. Lee `CLAUDE.md` y `@Docs/SYNC_LOG.md` para ver cambios recientes.
2. Verifica columnas y relaciones consultando Supabase via MCP (read-only).

**DURANTE la sesión:**
3. Lee la sección relevante del Feature Spec para campos, validaciones, y UX.
4. Implementa. Corre `npm run build` para verificar que compila sin errores.
5. `/compact` al llegar a 50% de contexto.
6. Usar `use context7` en prompts cuando necesites docs actualizados de librerías.

**DESPUÉS de cada paso completado:**
7. `git add -A` + `git commit` + `git push origin jaime/dev` automáticamente.
8. Formato commit: `feat:`, `fix:`, `docs:`, `refactor:` — mensaje descriptivo.
9. Escribir en `Docs/SYNC_LOG.md`: qué se implementó, discrepancias encontradas.
10. Si encontraste un bug, documentarlo en `Docs/BUGS.md`.
11. Continuar al siguiente paso sin esperar aprobación.

**CUANDO NECESITES UN CAMBIO DE BD:**
- NO modificar Supabase. Escribir en `Docs/SYNC_LOG.md`:
  "Code: SOLICITUD BD — {descripción}. Razón: {por qué}."
- James lo verá y delegará a Chat para ejecutar.

**NUNCA:**
- No hacer commits ni push a `main`. Solo `jaime/dev`.
- No modificar Feature Spec ni CLAUDE.md (solo Chat los modifica).
- No ESCRIBIR en Supabase. Solo LEER via MCP.

## Tres actores — quién hace qué

**Claude Chat (claude.ai):** Planificación, diseño, discusión de lógica de negocio, auditoría de documentos, cambios directos en Supabase (tiene acceso de escritura). Si Claude Code necesita un cambio de BD → James consulta con Chat primero.

**James (humano):** Decisiones finales, input de negocio, coordinación con equipo ICONSA, aprobación de cambios. Push a git solo desde `jaime/dev`.

**Claude Code (tú):** Implementación de código, testing, builds. Puede: crear/editar archivos de código, correr npm run build/lint, LEER Supabase via MCP (read-only, NO escribir), actualizar SYNC_LOG/BUGS, hacer commit+push automático a jaime/dev.

**Regla de oro:** Si algo involucra cambiar BD o lógica de negocio no documentada → STOP, escribe en SYNC_LOG.md, y dile a James que consulte con Chat. Si es solo implementación de código basada en lo que ya está en docs → HAZLO.

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
