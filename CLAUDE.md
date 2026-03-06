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
│   │   ├── dashboard/          # KPIs globales (todos los roles)
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
| @Docs/ICONSA_Feature_Specification_v3.md | Detalle completo de pantallas, campos, validaciones, estados. |
| @Docs/PROJECT_STATUS.md | Schema actual de BD (16 tablas), estado de cada componente. |
| @Docs/supabase_schema_verified.sql | SQL exacto del schema verificado contra Supabase live. |

**IMPORTANTE:** Si una regla de negocio no está clara, consulta el Feature Spec. Si hay conflicto entre documentos, PROJECT_STATUS.md es la fuente de verdad para el schema, y Feature Spec v3.1 para reglas de negocio.

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
- Tabla `equipment` es UNIFICADA (equipos + vehículos). Vehículos = `type_code IN ('VHL','VHP')`.
- **No crear tablas nuevas.** El schema de 16 tablas ya está definido y verificado.
- **user_app_roles** existe como fundación multi-app RBAC pero el código MVP usa `people.app_role`. No migrar a user_app_roles todavía.

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
| Ingeniero de Proyecto | `pm` | Solicitudes (CRUD sus proyectos, VER todas), Programación (lectura), Dashboard |
| Coordinador Logística | `logistica` | Todo excepto Admin y crear solicitudes |
| Conductor | `campo` | Mis Viajes + eventos, Dashboard |
| Almacenista | `almacen` | Mis Viajes + eventos, Dashboard |
| Administrador | `admin` | Todo |

## Reglas Críticas (NUNCA violar)

1. **PM ve TODAS las solicitudes** de todos los proyectos. Filtro default = su proyecto. Solo CREA/EDITA para SUS proyectos (via `person_projects`).
2. **NO agregar líneas después de Borrador.** Enviada = editar existentes, no agregar nuevas.
3. **Eventos: sin restricción por driver_id en MVP.** Cualquier logistica/campo/almacen registra eventos.
4. **Dashboard: métricas globales.** Todos los roles ven lo mismo. Sin restricción por rol.
5. **UI 100% español.** Botones, labels, mensajes, placeholders — todo en español.
6. **Mobile-first.** Los ingenieros y conductores usan celulares.
7. **Monospace para IDs.** `25-506-SM-023` y `MOV-2026-042` siempre en fuente monoespaciada.
8. **Remolque condicional.** REQUERIDO cuando vehículo es cabezal (CAB### o 'CABEZAL'). Opcional para pick-up, volquete, camión grúa.
9. **Tarifa y Costo OPCIONALES.** No toda movilización tiene tarifa formal. Si se selecciona tarifa, pre-rellenar Costo con `rate`. Campo sigue editable.
10. **Redirect después de guardar/enviar.** Crear nuevo → redirige a lista. Editar existente → se queda en detalle mostrando estado actualizado. Enviar solicitud → siempre a lista.
11. **Filtro equipos en solicitud:** `type_code NOT IN ('ING')`. NO excluir VHL, VHP, TEC.

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

**DURANTE la sesión:**
3. Lee la sección relevante del Feature Spec para campos, validaciones, y UX.
4. Verifica columnas y relaciones en `@Docs/PROJECT_STATUS.md` o via Supabase MCP.
5. Implementa. Corre `npm run build` para verificar que compila sin errores.
6. `/compact` al llegar a 50% de contexto. Después de 60% la calidad degrada.

**DESPUÉS de cada paso completado:**
7. Sugiere commit message: `feat: paso X.Y — descripción`
8. Espera aprobación de James antes de continuar al siguiente paso.
9. `/clear` entre pasos no relacionados. NUNCA acumular múltiples fases en una sesión.

**NUNCA:**
- No hagas commits automáticos. James revisa y commitea.
- No modifiques archivos en Docs/ que sean specs de referencia (Feature Spec, BUILD_PLAN, Sprint Brief).
- Solo PROJECT_STATUS.md es editable por Claude Code.

## Git

- `main` — Estable. Solo docs y código aprobado.
- `jaime/dev` — Branch de James.
- `andy/dev` — Branch de Andy.
- Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` — mensaje en español.
- Ejemplo: `feat: crear formulario de solicitud con líneas`

## Dominio

- **Solicitud (SM):** Pedido formal para mover equipo/material. ID: `{Proyecto}-SM-{###}`.
- **Línea:** Un ítem dentro de una solicitud (equipo o material con origen, destino, cantidad).
- **Viaje (Trip):** Salida física de un vehículo. ID: `MOV-{YYYY}-{###}`. Puede llevar líneas de múltiples solicitudes (many-to-many via `trip_line_assignments`).
- **Backlog:** Todas las líneas pendientes de programar. Vista principal de Charris.
- **Charris:** Carlos Charris — Coordinador de Logística. Usuario más importante del sistema.
- **Chilibre:** Taller central de ICONSA. Origen/destino principal.
- **Fallback:** Texto libre cuando un valor no existe en un dropdown. Crea sugerencia para admin en tabla `suggestions`.
- **Cascada:** Trigger que actualiza estado de solicitud basándose en estados de sus líneas.
- **Código de confirmación:** 4 dígitos generados al crear viaje. Tipo Uber — receptor da el código al conductor para confirmar entrega.
