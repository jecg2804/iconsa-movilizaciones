# MovimientOS

Sistema digital de movilizaciones para ICONSA, constructora pesada en Panamá.
Digitaliza el procedimiento IC-LOG-PO-06: solicitudes → programación → ejecución → dashboard.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS → Vercel
- **Backend:** NestJS (TypeScript) → Railway/Fly.io (se integra en Fase 6)
- **DB:** Supabase PostgreSQL + Auth + RLS + Storage
- **Reporting:** Metabase (post-MVP)

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
│   └── no-modify-specs.md
├── skills/                       # Patrones de implementación por tipo de tarea
│   ├── crud-page.md
│   ├── events-page.md
│   └── supabase-queries.md
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

## Reference Docs (leer antes de implementar)

| Documento | Cuándo leerlo |
|-----------|---------------|
| @Docs/BUILD_PLAN.md | **SIEMPRE primero.** Orden de fases, archivos por paso, reglas críticas. |
| @Docs/ICONSA_MVP_Sprint_Brief.md | Contexto rápido: features MVP, modelo de datos, UI guidelines. |
| @Docs/ICONSA_Feature_Specification_v3.md | Detalle completo de pantallas, campos, validaciones, estados (v3.3). |
| @Docs/PROJECT_STATUS.md | Schema actual de BD (18 tablas), estado de cada componente, decisiones. |
| @Docs/supabase_schema_verified.sql | SQL exacto del schema verificado contra Supabase live. |

**IMPORTANTE:** Si una regla de negocio no está clara, consulta el Feature Spec. Si hay conflicto entre documentos, PROJECT_STATUS.md es la fuente de verdad para el schema, y Feature Spec v3.3 para reglas de negocio.

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
- **18 tablas definidas y verificadas.** No crear tablas nuevas sin discusión con James (vía Chat).
- **user_app_roles** existe como fundación multi-app RBAC pero el código MVP usa `people.app_role`. No migrar a user_app_roles todavía.
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
Solicitud: Borrador → Enviada → En Proceso → Completada / Parcial / Cancelada
Línea:     Pendiente → Programada → En Tránsito → Entregada / Parcial / Cancelada
Viaje:     Programado → En Ruta → Completado / Cancelado
```

Cascada (`cascade_request_status()`): cuando cambia una línea, re-evalúa la solicitud padre.
Ver Feature Spec sección 8.4 para reglas exactas.

## Workflow para Claude Code

**ANTES de cada sesión:**
1. `/model sonnet` — Sonnet es el default. Solo usar `/model opus` para arquitectura compleja.
2. Lee `@Docs/BUILD_PLAN.md` para confirmar la fase actual y qué archivos crear.
3. Lee `@Docs/PROJECT_STATUS.md` sección "PENDIENTE PARA CLAUDE CODE" para ver tareas priorizadas.

**DURANTE la sesión:**
4. Lee la sección relevante del Feature Spec para campos, validaciones, y UX.
5. Verifica columnas y relaciones en `@Docs/PROJECT_STATUS.md`. NO acceder a Supabase directamente.
6. Implementa. Corre `npm run build` para verificar que compila sin errores.
7. `/compact` al llegar a 50% de contexto. Después de 60% la calidad degrada.

**DESPUÉS de cada paso completado:**
8. `git add -A` + `git commit` + `git push origin jaime/dev` automáticamente.
9. Formato commit: `feat: paso X.Y — descripción` o `fix: bug #X — descripción`.
10. Continuar al siguiente paso sin esperar aprobación.
11. `/clear` entre fases no relacionadas.

**NUNCA:**
- No hacer commits ni push a `main`. Solo `jaime/dev` o `andy/dev`.
- No modificar archivos en Docs/ que sean specs de referencia (Feature Spec, BUILD_PLAN, Sprint Brief).
- Solo PROJECT_STATUS.md es editable por Claude Code.
- No crear tablas nuevas en Supabase. Cambios de BD se discuten con James vía Chat.
- No acceder a Supabase directamente. No correr `npx supabase`. James genera database.ts manualmente.

## Tres actores — quién hace qué

**Claude Chat (claude.ai):** Planificación, diseño, discusión de lógica de negocio, auditoría de documentos, cambios directos en Supabase (tiene acceso de escritura). Si Claude Code necesita un cambio de BD → James consulta con Chat primero.

**James (humano):** Decisiones finales, input de negocio, coordinación con equipo ICONSA, aprobación de cambios. Push a git solo desde `jaime/dev`.

**Claude Code (tú):** Implementación de código, testing, builds. Puede: crear/editar archivos de código, correr npm run build/lint, actualizar PROJECT_STATUS.md, hacer commit+push automático a jaime/dev. **NO tiene acceso a Supabase.** Cambios de BD los hace James via Claude Chat.

**Regla de oro:** Si algo involucra cambiar BD o lógica de negocio no documentada → STOP y dile a James que consulte con Chat. Si es solo implementación de código basada en lo que ya está en docs → HAZLO.

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
