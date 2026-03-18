# SPEC.md — Technical Specification

**Verificado contra Supabase:** 2026-03-14
**Proyecto Supabase:** `bzeoszympkkicwlfdtcn` (us-west-2 Oregon)

---

## 1. Schema — 20 tablas

### 1.1 Tablas del flujo operativo

| Tabla | Cols | Descripción |
|-------|:---:|-------------|
| sm_requests | 19 | Solicitudes de movilización |
| sm_request_lines | 27 | Líneas de solicitud (equipo/material) |
| trips | 23 | Viajes programados |
| trip_line_assignments | 7 | Puente N:M viajes ↔ líneas |
| trip_events | 11 | Eventos de ejecución (Salida/Llegada/Entrega/Retorno) |

### 1.2 Tablas maestras

| Tabla | Cols | Registros | Notas |
|-------|:---:|:---------:|-------|
| projects | 14 | 6 (5 activos) | code, name, status, pm_id |
| equipment | 25 | 377 | Unificada: equipos+vehículos+remolques. Vehículos=`type_code IN ('VHL','VHP')`. Remolques=`spectrum_code LIKE 'REM%'`. Tiene `current_location`, `current_project_id` (auto-trigger), `parent_equipment_id` (self-ref FK). |
| people | 20 | 177 | `auth_id` (link Supabase Auth), `app_role` (admin/pm/logistica/campo/almacen). Tiene `supervisor_id` (self-ref FK), `cedula`, `license_type`, `license_expiry`, `hire_date`, `emergency_contact_*`. |
| locations | 11 | 8 | name, location_type (Taller/Proyecto/Proveedor/Otro), project_id |
| cost_codes | 8 | 138 | Fases de Spectrum por proyecto+extra. `full_code` auto-generado por trigger. |
| cost_categories | 6 | 8 | Tipos: CON, EQA, EQI, ICS, MAT, OTR, SAL, SUB |
| cost_code_categories | 4 | 656 | Puente N:M cost_codes ↔ cost_categories |
| project_extras | 8 | 12 | Secciones de cost codes (E1-E6) por proyecto. Solo 24-404 y 25-505 tienen extras. |
| mobilization_rates | 7 | 14 | Tarifas con `rate` (numeric, B/.) |
| person_projects | 7 | 30 | Puente N:M people ↔ projects. Determina qué proyectos puede crear un PM. |
| units | 5 | 11 | Unidades de medida |

### 1.3 Tablas de soporte

| Tabla | Cols | Notas |
|-------|:---:|-------|
| audit_log | 9 | JSONB old_data/new_data + changed_fields |
| sequences | 4 | seq_type ('sm'/'trip') + project_id + next_number |
| suggestions | 7 | Sugerencias de Claude Code a docs Tier 1 |
| user_app_roles | 10 | Fundación RBAC multi-app. **NO en uso** — código usa `people.app_role`. |

---

## 2. Funciones — 14

| Función | Security | Descripción |
|---------|----------|-------------|
| `get_my_app_role()` | DEFINER | Retorna `app_role` de `people` para `auth.uid()`. Base de RLS. |
| `generate_request_id()` | | `{proyecto}-SM-{###}` via tabla `sequences`. |
| `generate_trip_id()` | | `MOV-{YYYY}-{###}` via tabla `sequences`. |
| `generate_confirmation_code()` | | 4 dígitos aleatorio para viajes. También generado en frontend como safety net. |
| `generate_full_code()` | | Auto-genera `full_code` en cost_codes: `{proyecto}[-{extra}]-{fase}`. Ej: `24-404-E1-01-3100`. |
| `calculate_priority()` | | Días hasta date_required: <0=Vencida, 0-3=Urgente, 4-7=Proxima, 8+=Normal. También calculada client-side. |
| `capture_initial_priority()` | | Snapshot de prioridad al crear. Gotcha: captura NULL porque ejecuta antes que calculate_priority (orden alfabético). |
| `capture_lifecycle_timestamps()` | | Registra date_submitted/date_completed/date_cancelled según cambios de status. |
| `capture_trip_cancelled()` | | Registra date_cancelled en viajes cancelados. |
| `cascade_request_status()` | DEFINER | Re-evalúa solicitud padre al cambiar línea. Ver sección 3. |
| `update_equipment_location_on_delivery()` | | En Entrega: actualiza equipment.current_location y current_project_id. |
| `audit_trigger()` | DEFINER | Registra cambios en audit_log. |
| `update_updated_at()` | | `updated_at = now()` en todas las tablas. |
| `rls_auto_enable()` | DEFINER | Habilita RLS automáticamente en tablas nuevas. |

---

## 3. Estados y Cascada

### Flujo real

```
Solicitud: Borrador → Enviada → En Proceso → Completada / Cancelada
Línea:     Pendiente → Programada → En Transito → Entregada / Parcial / Cancelada
Viaje:     Programado → En Ruta → Completado / Cancelado
```

**NO existe 'Parcial' a nivel de solicitud.** Solo a nivel de línea.
**'En Transito' SIN acento** es canónico.

### Cascada (cascade_request_status)

Trigger AFTER UPDATE en sm_request_lines. SECURITY DEFINER. Lógica:

```
Contadores: total, delivered, cancelled, in_progress (Programada+En Transito), parcial

1. delivered + cancelled = total AND delivered > 0 → Completada
2. cancelled = total → Cancelada
3. in_progress > 0 OR delivered > 0 OR parcial > 0 → En Proceso
4. Ninguna anterior → Enviada

NO modifica solicitudes en Borrador o Cancelada.
```

### Gotchas

- INSERT con status final NO dispara cascade (trigger es AFTER UPDATE, no INSERT)
- `trg_initial_priority` ejecuta antes que `trg_priority` (orden alfabético) → captura NULL
- 'En Transito' sin acento — mismatches fallan silenciosamente

---

## 4. Triggers — 27

| Tabla | Trigger | Timing | Events |
|-------|---------|--------|--------|
| sm_requests | audit_sm_requests | AFTER | I/D/U |
| sm_requests | sm_requests_updated_at | BEFORE | U |
| sm_requests | trg_initial_priority | BEFORE | I |
| sm_requests | trg_lifecycle_timestamps | BEFORE | U |
| sm_requests | trg_priority | BEFORE | I/U |
| sm_requests | trg_request_id | BEFORE | I |
| sm_request_lines | audit_sm_request_lines | AFTER | I/D/U |
| sm_request_lines | sm_request_lines_updated_at | BEFORE | U |
| sm_request_lines | trg_cascade_status | AFTER | U |
| trips | audit_trips | AFTER | I/D/U |
| trips | trg_generate_confirmation_code | BEFORE | I |
| trips | trg_trip_cancelled | BEFORE | U |
| trips | trg_trip_id | BEFORE | I |
| trips | trips_updated_at | BEFORE | U |
| trip_line_assignments | audit_trip_line_assignments | AFTER | I/D/U |
| trip_line_assignments | trip_line_assignments_updated_at | BEFORE | U |
| trip_events | trg_update_equipment_location | AFTER | I |
| cost_codes | cost_codes_updated_at | BEFORE | U |
| cost_codes | trg_generate_full_code | BEFORE | I/U |
| equipment | equipment_updated_at | BEFORE | U |
| locations | locations_updated_at | BEFORE | U |
| mobilization_rates | rates_updated_at | BEFORE | U |
| people | people_updated_at | BEFORE | U |
| person_projects | person_projects_updated_at | BEFORE | U |
| project_extras | project_extras_updated_at | BEFORE | U |
| projects | projects_updated_at | BEFORE | U |
| units | units_updated_at | BEFORE | U |

---

## 5. RLS — 69 políticas

Base: `get_my_app_role()` retorna rol del usuario autenticado.

### Tablas operativas

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| sm_requests | `true` (all) | pm, admin | pm, admin | admin |
| sm_request_lines | `true` | pm, admin | pm, admin, logistica, campo, almacen | pm, admin |
| trips | `true` | logistica, admin | logistica, admin | admin |
| trip_line_assignments | `true` | logistica, admin | logistica, admin | logistica, admin |
| trip_events | `true` | logistica, campo, almacen, admin | — | — |

**⚠️ PROBLEMA CONOCIDO:** sm_requests UPDATE solo permite pm/admin. Logistica (Charris) no puede cancelar/editar solicitudes directamente. La cascada funciona porque es SECURITY DEFINER, pero operaciones directas fallan.

### Tablas maestras

SELECT: todos los authenticated. INSERT/UPDATE/DELETE: solo admin.

---

## 6. Cost Codes — 4 tablas en cascada

```
projects → project_extras (secciones E1-E6, opcional)
    ↓
cost_codes (fase por proyecto+extra, 138 total)
    ↓
cost_code_categories (puente N:M, 656 combos)
    ↓
cost_categories (8 tipos: CON/EQA/EQI/ICS/MAT/OTR/SAL/SUB)
```

**Cascada UI:** Proyecto → Extra (dropdown, opcional) → Fase (filtrada por project+extra) → Categoría (filtrada por cost_code_categories) → Código auto-generado.

**`generate_full_code()`:** `{proyecto}[-{extra}]-{fase}`. Ejemplo: `24-404-E1-01-3100`.

| Proyecto | Secciones | Fases | Combos |
|----------|:---------:|:-----:|:------:|
| 24-404 Costa Norte | 7 (BASE+E1-E6) | 63 | 399 |
| 25-505 Paraíso | 7 (BASE+E1-E6) | 36 | 105 |
| 25-506 Muelle 14 | 1 (BASE) | 24 | 100 |
| 26-604 Inyecciones | 1 (BASE) | 7 | 34 |
| 26-605 Micropilotes | 1 (BASE) | 8 | 18 |

---

## 7. Decisiones técnicas

1. **`people.app_role`** es el RBAC activo. `user_app_roles` es fundación futura, no en uso.
2. **Equipment unificada.** No hay tabla separada de vehículos. `parent_equipment_id` para relación equipo-componente.
3. **Prioridad dual:** BD trigger (INSERT/UPDATE) + client-side `calculatePriority()` para display real-time.
4. **Cost codes de Spectrum.** Importados de Phase Listing exports. 138 fases, 656 combinaciones.
5. **Entregas parciales:** `qty_delivered` acumula en trip_line_assignments Y sm_request_lines. Parcial = qty_delivered < quantity.
6. **Fallback universal:** Cada dropdown tiene "No está en lista" → campo texto libre (`_text` columns).
7. **Secuencias:** Por proyecto para solicitudes (`{code}-SM-{NNN}`), global para viajes (`MOV-{YYYY}-{NNN}`).
8. **Confirmation code dual:** Frontend genera en useTrips + trigger BD genera como safety net.
9. **Equipment location tracking:** Trigger `update_equipment_location_on_delivery` actualiza current_location/current_project_id en Entrega.
10. **FK deletion order:** trip_events → trip_line_assignments → trips → sm_request_lines → sm_requests → audit_log → sequences reset → equipment reset.

---

## 8. Proyectos activos

| Código | Nombre | Estado |
|--------|--------|--------|
| 24-404 | Costa Norte | Activo |
| 25-504 | ASTIBAL | Cerrado |
| 25-505 | Paraiso | Activo |
| 25-506 | Muelle 14 | Activo |
| 26-604 | Inyecciones Metro | Activo |
| 26-605 | Micropilotes Multiplaza | Activo |
