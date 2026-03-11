# SYNC_LOG — Bridge entre Chat y Claude Code

Ambos actores escriben aquí. James lo revisa para mantenerse al día.

---

## 2026-03-12 — Code: UX mejoras — métricas vivas, layout, dashboard global

5 archivos modificados (commit 3592470):
- `format.ts`: 3 nuevas funciones (daysUntilDue, formatDaysUntilDue, daysUntilDueColor)
- `programacion/page.tsx`: backlog primero, calendario después; calendar cards con conteo líneas
- `solicitudes/page.tsx`: columna "Días", prioridad viva client-side, calendar cards mejoradas
- `BacklogTable.tsx`: días-al-vencimiento junto a fecha, prioridad viva
- `dashboard/page.tsx`: métricas globales para TODOS los roles (quitado filtro PM, redirect campo, guard isGlobalRole)
- Opacity en filas completadas/canceladas eliminada de ambas tablas

Decisión: prioridad client-side (`calculatePriority()`) para display en páginas client. Dashboard (Server Component) sigue usando valor de BD (pg_cron 6AM es aceptable).

---

## 2026-03-12 — Code: Bloque 1 + Bloque 2 completados

### Bloque 1: Extras en cascada de cost codes
- LineEditor.tsx: nuevo prop `projectId`, fetch extras interno
- Cascada: Proyecto → Extra (condicional) → Fase → Categoría
- Dropdown "Extra / Sección" solo visible si proyecto tiene extras (24-404, 25-505)
- Opción "(Proyecto Base)" para fases sin extra
- Detección automática de extra al editar línea existente
- database.ts actualizado: project_extras + extra_id en cost_codes

### Bloque 2: Fase 6 — Admin Masters
- Nuevo componente Modal.tsx (dialog nativo, backdrop click, ESC)
- /admin redirige a /admin/masters
- 6 tabs: Proyectos, Personas, Equipos, Ubicaciones, Tarifas, Extras
- CRUD completo en cada tab con DataTable + Modal
- Tab Personas incluye panel "Proyectos Asignados" (person_projects CRUD)
- Tab Extras con filtro por proyecto
- Toggle activar/desactivar en todas las tablas
- Búsqueda por nombre/código en cada tab

---

## 2026-03-12 — Chat: Person Projects insertados

- 30 asignaciones totales (era 12)
- Franklin Marciaga → app_role=pm, asignado 25-506
- Héctor Pino → app_role=pm, asignado 24-404
- Lourdes Dominguez → app_role=pm, asignado 24-404
- César Caballero → agregado a 25-506
- Andrés Solís → 24-404, 25-505
- David Ríos → 24-404, 25-505
- Madeleine Lange → 24-404, 25-505
- Jenniffer Troetsch → 24-404, 25-505
- Juan Jácome → 24-404, 25-506
- Edward Rodriguez → 25-506
- Marisa Pozza → 26-604 (Gerente)
- Ariel González → 26-604 (Superintendente)
- Velideth González → 26-605 (Ingeniero)
- PENDIENTE mañana: Javier Ferrer (26-605), Luis Lima (26-605), Yanelys Sánchez, emails reales

## 2026-03-12 — Chat: Project Extras (CAMBIO MAYOR)

- Nueva tabla `project_extras` creada (19 tablas ahora)
- `cost_codes.extra_id` FK agregado (nullable, NULL = proyecto base)
- 12 extras insertados:
  - 24-404: E1 Camino acceso, E2 Edificio Principal, E3 Muelles Flotantes, E4 Tanque combustible, E5 Trabajos electricos, E6 Trabajos mecanicos
  - 25-505: E1 Pilotes Acero, E2 Flotadores, E3 Estructuras Fijas, E4 Rampas, E5 Trabajos Electricos, E6 Pintura flotadores
- Cost codes reimportados con clasificación por extra: 122 fases, 784 combos
- Trigger `generate_full_code()` actualizado. Formato con dash: `24-404-E1-01-3100`
- full_code base sigue igual: `24-404-01-3100`
- **Claude Code:** La cascada en LineEditor necesita dropdown "Extra" condicional. Ver SPRINT_TODAY.md Bloque 1.

## 2026-03-12 — Chat: database.ts regenerado

- James colocará en src/lib/types/database.ts
- Incluye: project_extras, extra_id en cost_codes, received_by_id en trip_events

## 2026-03-12 — Chat: Flujo de trabajo mejorado

- Nuevo sistema de Tiers para documentación (ver .claude/rules/no-modify-specs.md)
- Nueva skill self-update (ver .claude/skills/self-update.md)
- .claude/suggestions.md creado para sugerencias de Claude Code
- Docs/BUGS.md creado para tracking de bugs

## 2026-03-09 — Chat: Schema changes anteriores

- received_by_id UUID FK people agregado a trip_events
- Trigger generate_confirmation_code() en trips
- Trigger generate_full_code() en cost_codes (todo dashes)
- confirmation_code backfilled en viajes existentes
- Sequences corregidos

## 2026-03-09 — James: App deployed

- URL: https://www.rein-eisenwerk.com/login
- Vercel connected to jaime/dev branch
