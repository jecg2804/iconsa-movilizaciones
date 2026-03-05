# ICONSA Movilizaciones — Plan de Construcción MVP

## ESTRUCTURA DE CARPETAS

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (providers, fonts)
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Login con email/contraseña
│   ├── (app)/
│   │   ├── layout.tsx                # App layout (sidebar + topbar + auth guard)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Home — KPIs globales (todos ven lo mismo)
│   │   ├── solicitudes/
│   │   │   ├── page.tsx              # Lista (todos ven TODAS, PM filtra su proyecto por default)
│   │   │   ├── nueva/
│   │   │   │   └── page.tsx          # Crear solicitud (PM solo para sus proyectos)
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Ver/editar solicitud
│   │   ├── programacion/
│   │   │   ├── page.tsx              # Backlog de líneas pendientes + viajes recientes
│   │   │   ├── viaje/
│   │   │   │   ├── nuevo/
│   │   │   │   │   └── page.tsx      # Crear viaje (seleccionar líneas, asignar)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Ver/editar viaje
│   │   │   └── calendario/
│   │   │       └── page.tsx          # Look-ahead 2 semanas (placeholder Fase 2)
│   │   ├── mis-viajes/
│   │   │   ├── page.tsx              # Lista viajes activos (logistica/campo/almacen)
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Detalle + registrar eventos
│   │   └── admin/
│   │       └── masters/
│   │           └── page.tsx          # CRUD tablas maestras
│   └── globals.css                   # Tailwind + custom tokens
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── SelectWithFallback.tsx    # Dropdown + "No está en lista" → texto libre
│   │   ├── Badge.tsx                 # Status/priority badges con colores
│   │   ├── Modal.tsx
│   │   ├── DataTable.tsx             # Tabla con sort/filter
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── DuplicateWarning.tsx      # Warning visual de líneas duplicadas
│   │   └── LoadingSpinner.tsx
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── MobileNav.tsx
│   │   └── Breadcrumbs.tsx
│   │
│   ├── solicitudes/
│   │   ├── SolicitudForm.tsx
│   │   ├── LineEditor.tsx
│   │   ├── LineRow.tsx
│   │   └── SolicitudCard.tsx
│   │
│   ├── programacion/
│   │   ├── BacklogTable.tsx
│   │   ├── TripForm.tsx
│   │   ├── LineSelector.tsx
│   │   └── CalendarView.tsx          # Fase 2
│   │
│   ├── viajes/
│   │   ├── TripCard.tsx
│   │   ├── EventTimeline.tsx
│   │   ├── EventButton.tsx
│   │   └── CodeConfirmation.tsx
│   │
│   └── dashboard/
│       ├── KpiCard.tsx
│       └── RecentActivity.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   │
│   ├── types/
│   │   └── database.ts
│   │
│   └── utils/
│       ├── constants.ts
│       ├── status.ts
│       ├── priorities.ts
│       ├── roles.ts
│       ├── format.ts
│       └── duplicates.ts            # Detección de líneas duplicadas
│
├── hooks/
│   ├── useAuth.ts
│   ├── useProjects.ts
│   ├── useEquipment.ts
│   ├── useLocations.ts
│   ├── useSolicitudes.ts
│   ├── useTrips.ts
│   └── useRealtime.ts
│
└── middleware.ts
```

---

## ORDEN DE CONSTRUCCIÓN

### Fase 0: Fundación (no hay UI visible todavía)

**Objetivo:** Todo lo que cada pantalla necesita.

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 0.1 | `lib/types/database.ts` | Tipos TypeScript generados del schema verificado |
| 0.2 | `lib/supabase/client.ts` | `createBrowserClient()` con env vars |
| 0.3 | `lib/supabase/server.ts` | `createServerClient()` para SSR |
| 0.4 | `lib/utils/constants.ts` | Design tokens, enums de estados, mapeo roles→rutas |
| 0.5 | `lib/utils/status.ts` | `getStatusColor()`, `getStatusLabel()`, `getPriorityColor()` |
| 0.6 | `lib/utils/roles.ts` | `canAccess(role, route)`, `canEditSolicitud(role, projectId, userProjects)`, `canCreateSolicitud(role, projectId, userProjects)` |
| 0.7 | `lib/utils/format.ts` | `formatDate()`, `formatCurrency()`, `formatId()` |
| 0.8 | `hooks/useAuth.ts` | Hook: user, role, loading, signOut, userProjects |
| 0.9 | `middleware.ts` | Redirect a /login si no autenticado, bloqueo por rol |

**Criterio de éxito:** `npm run build` pasa sin errores, tipos compilando.

**Entregables de documentación:**
- Crear `.env.example` con todas las variables necesarias
- Verificar `.mcp.json` (Supabase MCP) funciona en Claude Code
- Crear `supabase/seed.sql` con datos de desarrollo
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 0

---

### Fase 1: Auth + Layout Shell

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 1.1 | `app/globals.css` | Tailwind config + tokens ICONSA |
| 1.2 | `app/layout.tsx` | Root layout: fonts, providers, metadata |
| 1.3 | `app/(auth)/login/page.tsx` | Form email+contraseña, redirect a /dashboard |
| 1.4 | `components/ui/Button.tsx`, `Input.tsx` | Componentes base para login |
| 1.5 | `components/layout/Sidebar.tsx` | Nav lateral role-aware. Español. |
| 1.6 | `components/layout/Topbar.tsx` | Nombre usuario, rol badge, logout |
| 1.7 | `components/layout/MobileNav.tsx` | Hamburger menu |
| 1.8 | `app/(app)/layout.tsx` | Layout autenticado: sidebar + topbar + guard |
| 1.9 | `app/(app)/dashboard/page.tsx` | Placeholder: "Bienvenido, {nombre}. Rol: {rol}" |

**Prerequisito Supabase:** 3+ usuarios en Auth + app_role + auth_id + person_projects.

**Entregables de documentación:**
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 1

---

### Fase 2: Solicitudes (flujo del PM)

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 2.1 | `components/ui/Badge.tsx` | Badge de estado y prioridad |
| 2.2 | `components/ui/Select.tsx` | Select genérico |
| 2.3 | `components/ui/SelectWithFallback.tsx` | Select + fallback |
| 2.4 | `components/ui/DataTable.tsx` | Tabla con sort/filter |
| 2.5 | `hooks/useProjects.ts` | Proyectos (todos para filtros, solo asignados para crear/editar) |
| 2.6 | `hooks/useEquipment.ts` | Equipos filtrados por type_code |
| 2.7 | `hooks/useLocations.ts` | Ubicaciones activas |
| 2.8 | `hooks/useSolicitudes.ts` | CRUD + líneas + duplicados |
| 2.9 | `lib/utils/duplicates.ts` | Busca líneas activas similares |
| 2.10 | `components/ui/DuplicateWarning.tsx` | Banner warning no bloqueante |
| 2.11 | `app/(app)/solicitudes/page.tsx` | Lista: TODOS ven TODAS. PM filtro default = su proyecto. |
| 2.12 | `components/solicitudes/SolicitudForm.tsx` | Header form |
| 2.13 | `components/solicitudes/LineEditor.tsx` | Agregar (solo Borrador), editar, eliminar (con warning si programada) |
| 2.14 | `components/solicitudes/LineRow.tsx` | Fila de línea |
| 2.15 | `app/(app)/solicitudes/nueva/page.tsx` | Crear (PM solo sus proyectos) |
| 2.16 | `app/(app)/solicitudes/[id]/page.tsx` | Ver/editar según reglas de edición |

**Reglas de edición:**
- **Borrador:** Todo editable + agregar/eliminar líneas. PM solo si es su proyecto.
- **Enviada:** Editar header y líneas existentes. NO agregar nuevas. Eliminar programada con warning. PM solo si es su proyecto.
- **En Proceso+:** Solo lectura (TBD con feedback).
- **Completada/Cancelada:** Solo lectura.
- Logística edita cualquiera en Borrador/Enviada (no crea solicitudes). Admin crea y edita cualquiera.

**Cancelación:**
- Cancelar solicitud: cancela líneas pendientes, libera líneas programadas.
- Eliminar línea programada: warning → remueve asignación del viaje.

**Entregables de documentación:**
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 2
- Verificar que Feature Spec sección 4 (Solicitudes) coincide con lo implementado

---

### Fase 3: Programación (flujo de Charris)

**Objetivo:** Backlog, selección de líneas, creación de viajes.

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 3.1 | `hooks/useTrips.ts` | CRUD viajes + asignaciones + cancelación |
| 3.2 | `components/programacion/BacklogTable.tsx` | Líneas pendientes con prioridad visual |
| 3.3 | `components/programacion/LineSelector.tsx` | Checkboxes para seleccionar líneas |
| 3.4 | `components/programacion/TripForm.tsx` | Form: fecha, conductor, vehículo, remolque, tarifa, ATT, escolta |
| 3.5 | `app/(app)/programacion/page.tsx` | Backlog + viajes recientes |
| 3.6 | `app/(app)/programacion/viaje/nuevo/page.tsx` | Crear viaje |
| 3.7 | `app/(app)/programacion/viaje/[id]/page.tsx` | Ver/editar viaje (Programado=todo, En Ruta=notas, Completado/Cancelado=lectura) |
| 3.8 | `app/(app)/programacion/calendario/page.tsx` | Placeholder Fase 2 |

**Cancelación de viaje:** Líneas regresan a Pendiente. Cascada re-evalúa solicitudes.

**Reglas de formulario de viaje:**
- Remolque: REQUERIDO cuando vehículo es cabezal (CAB### / 'CABEZAL'). Opcional para pick-up, volquete, camión grúa.
- Tarifa: al seleccionar, pre-rellena campo Costo con `rate`. Costo sigue editable.
- Guardar Viaje redirige a `/programacion`.
- Líneas asignadas deben mostrar fecha requerida de la solicitud padre.

**Entregables de documentación:**
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 3

---

### Fase 4: Ejecución (Eventos)

**Objetivo:** Registrar eventos secuenciales. Entrega con código 4 dígitos.

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 4.1 | `components/viajes/TripCard.tsx` | Card del viaje |
| 4.2 | `components/viajes/EventTimeline.tsx` | Timeline de eventos |
| 4.3 | `components/viajes/EventButton.tsx` | Botón grande mobile-friendly |
| 4.4 | `components/viajes/CodeConfirmation.tsx` | Input 4 dígitos |
| 4.5 | `app/(app)/mis-viajes/page.tsx` | Lista viajes activos. NO filtrado por driver_id. |
| 4.6 | `app/(app)/mis-viajes/[id]/page.tsx` | Detalle + registrar eventos |

**Quién registra:** Cualquier logistica, campo, almacen. Sin restricción por driver_id.

**Entregables de documentación:**
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 4

---

### Fase 5: Dashboard

**Objetivo:** KPIs globales — todos los roles ven lo mismo.

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 5.1 | `components/dashboard/KpiCard.tsx` | Tarjeta de métrica |
| 5.2 | `components/dashboard/RecentActivity.tsx` | Últimas solicitudes/viajes |
| 5.3 | `app/(app)/dashboard/page.tsx` | Dashboard real con KPIs globales |

**KPIs:** Solicitudes pendientes, líneas sin programar, viajes hoy/semana, completadas mes.

**Entregables de documentación:**
- Actualizar `Docs/PROJECT_STATUS.md` con estado de Fase 5

---

### Fase 6: Admin + Notificaciones + Deploy

| Paso | Archivo(s) | Qué hace |
|------|-----------|----------|
| 6.1 | `app/(app)/admin/masters/page.tsx` | CRUD masters + gestión usuarios/roles |
| 6.2 | NestJS: `notifications/` module | Notificaciones email (ver tabla abajo) |
| 6.3 | NestJS: `cron/` module | Alerta diaria de solicitudes vencidas |
| 6.4 | Todos | Responsive testing, error handling |
| 6.5 | N/A | Deploy frontend a Vercel, backend NestJS a Railway/Fly.io |

**Notificaciones email (NestJS):**
- Solicitud enviada → Charris
- Solicitud programada → PM solicitante
- Solicitud completada → PM solicitante
- Solicitud vencida (daily cron) → Charris + PM
- Sugerencia fallback → Admin

**Entregables de documentación:**
- Crear `apps/api/CLAUDE.md` (convenciones NestJS, estructura módulos)
- Crear `Docs/api-contracts.md` (endpoints, request/response shapes)
- Actualizar `Docs/PROJECT_STATUS.md` con estado final pre-deploy
- Actualizar RLS policies de `USING(true)` a políticas reales basadas en roles

---

## REGLAS DE NEGOCIO CRÍTICAS (resumen para Claude Code)

1. PM ve TODAS las solicitudes. Filtro default = su proyecto. CREA y EDITA solo para SUS proyectos.
2. NO agregar líneas después de Borrador. Enviada = editar existentes, no agregar.
3. SÍ se puede eliminar línea programada — con warning.
4. Cancelar viaje libera líneas → regresan a Pendiente.
5. Cancelar solicitud → cancela pendientes, libera programadas.
6. Eventos: cualquier logistica/campo/almacen. No filtrar por driver_id.
7. Dashboard: métricas globales, sin restricción por rol.
8. Warning duplicados: visual, no bloqueante.
9. Notificaciones email (NestJS): enviada→Charris, programada→PM, completada→PM, vencida→ambos.

---

## PREREQUISITOS ANTES DE FASE 1

1. Crear usuarios en Supabase Auth (mínimo 3: admin, pm, logistica)
2. Asignar app_role + auth_id + email en tabla people
3. Crear registros en person_projects para PM de prueba
4. Verificar .env.local tiene SUPABASE_URL y SUPABASE_ANON_KEY
5. Inicializar proyecto NestJS (backend) con conexión a Supabase Postgres

**Stack:** Next.js (frontend/Vercel) + NestJS (backend/Railway) + Supabase (DB/Auth) + Metabase (reporting)
