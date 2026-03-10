# SYNC_LOG — Bridge entre Chat y Claude Code

Ambos actores escriben aquí. James lo revisa para mantenerse al día.

---

## 2026-03-12 — Chat: Project Extras (CAMBIO MAYOR)

- Nueva tabla `project_extras` creada (19 tablas ahora)
- `cost_codes.extra_id` FK agregado (nullable, NULL = proyecto base)
- 12 extras insertados:
  - 24-404: E1 Camino acceso, E2 Edificio Principal, E3 Muelles Flotantes, E4 Tanque combustible, E5 Trabajos electricos, E6 Trabajos mecanicos
  - 25-505: E1 Pilotes Acero, E2 Flotadores, E3 Estructuras Fijas, E4 Rampas, E5 Trabajos Electricos, E6 Pintura flotadores
- Cost codes reimportados con clasificación por extra: 122 fases (era 98), 784 combos
- Trigger `generate_full_code()` actualizado: `{proyecto}{extra}-{fase}` ej: `24-404E1-01-3100`
- **Claude Code:** La cascada en LineEditor necesita dropdown "Extra" condicional. Ver SPRINT_TODAY.md Bloque 1.

## 2026-03-12 — Chat: database.ts regenerado

- James colocará en src/lib/types/database.ts
- Incluye: project_extras, extra_id en cost_codes, received_by_id en trip_events

## 2026-03-12 — Chat: Flujo de trabajo mejorado

- Nuevo sistema de Tiers para documentación (ver .claude/rules/no-modify-specs.md)
- Nueva skill self-update (ver .claude/skills/self-update.md)
- .claude/suggestions.md creado para sugerencias de Claude Code
- Docs/BUGS.md creado para tracking de bugs
- **Claude Code:** Lee SPRINT_TODAY.md en Docs/ para las tareas de hoy

## 2026-03-09 — Chat: Schema changes anteriores

- received_by_id UUID FK people agregado a trip_events
- Trigger generate_confirmation_code() en trips
- Trigger generate_full_code() en cost_codes (todo dashes)
- confirmation_code backfilled en viajes existentes
- Sequences corregidos

## 2026-03-09 — James: App deployed

- URL: https://www.rein-eisenwerk.com/login
- Vercel connected to jaime/dev branch
