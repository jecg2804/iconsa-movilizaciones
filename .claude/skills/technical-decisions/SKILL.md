---
name: technical-decisions
description: Funciones, triggers, estados, cascada, RLS, cost codes, y decisiones arquitectónicas. Consultar cuando necesites entender cómo funciona la BD internamente.
---

# Technical Decisions & DB Internals

> **Schema de tablas:** usar Supabase MCP (47 tablas con COMMENT ON TABLE/COLUMN).
> Este skill cubre la lógica interna: funciones, triggers, cascada, RLS, cost codes.

---

## 1. Funciones — 17

| Función | Security | Descripción |
|---------|----------|-------------|
| `get_my_app_role()` | DEFINER | Retorna `app_role` de `people` para `auth.uid()`. Base de RLS. |
| `generate_request_id()` | DEFINER | `{proyecto}-SM-{###}` via tabla `sequences`. |
| `generate_trip_id()` | DEFINER | `MOV-{YYYY}-{###}` via tabla `sequences`. |
| `generate_confirmation_code()` | | 4 dígitos aleatorio para viajes. También generado en frontend como safety net. |
| `generate_full_code()` | | Auto-genera `full_code` en cost_codes: `{proyecto}[-{extra}]-{fase}`. |
| `calculate_priority()` | | Días hasta date_required: <0=Vencida, 0-3=Urgente, 4-7=Proxima, 8+=Normal. |
| `capture_initial_priority()` | | Snapshot de prioridad al crear. Gotcha: captura NULL (ver gotchas). |
| `capture_lifecycle_timestamps()` | | Registra date_submitted/date_completed/date_cancelled. |
| `capture_trip_cancelled()` | | Registra date_cancelled en viajes cancelados. |
| `cascade_request_status()` | DEFINER | Re-evalúa solicitud padre al cambiar línea. Ver sección 2. |
| `update_equipment_location_on_delivery()` | | En Entrega: actualiza equipment.current_location y current_project_id. |
| `audit_trigger()` | DEFINER | Registra cambios en audit_log con JSONB old/new. |
| `update_updated_at()` | | `updated_at = now()` en todas las tablas. |
| `rls_auto_enable()` | DEFINER | Habilita RLS automáticamente en tablas nuevas. |
| `generate_internal_asset_tag()` | DEFINER | Auto-genera IC-{####} para equipos sin tag. Secuencia global. |
| `log_equipment_status_change()` | DEFINER | Registra cambios de equipment.status en equipment_status_log. |
| `enforce_qty_integrity()` | | Rechaza qty_scheduled > quantity y negativos. Capa 3 de protección. |

---

## 2. Estados y Cascada

### Flujo canónico

```
Solicitud: Borrador → Enviada → En Proceso → Completada / Cancelada
Línea:     Pendiente → Programada → En Transito → Entregada / Parcial / Cancelada
Viaje:     Programado → En Ruta → Completado / Cancelado
```

**'Parcial' solo existe a nivel de LÍNEA.** Nunca a nivel de solicitud.
**'En Transito' SIN acento** es canónico — mismatches fallan silenciosamente.

### Cascada (cascade_request_status)

Trigger AFTER UPDATE en sm_request_lines. SECURITY DEFINER.

```
Contadores: total, delivered, cancelled, in_progress (Programada+En Transito), parcial

1. delivered + cancelled = total AND delivered > 0 → Completada
2. cancelled = total → Cancelada
3. in_progress > 0 OR delivered > 0 OR parcial > 0 → En Proceso
4. Ninguna anterior → Enviada

NO modifica solicitudes en Borrador o Cancelada.
```

### Gotchas críticos

- INSERT con status final NO dispara cascade (trigger es AFTER UPDATE, no INSERT)
- `trg_initial_priority` ejecuta antes que `trg_priority` (orden alfabético) → captura NULL
- 'En Transito' sin acento — mismatches fallan silenciosamente
- Equipment master data (current_location, current_project_id) NO se limpia al borrar data transaccional
- FK deletion order: trip_events → trip_line_assignments → trips → sm_request_lines → sm_requests → audit_log
- PostgreSQL rechaza ORDER BY dentro de UNION ALL subqueries — usar CTEs

---

## 3. RLS — 73 políticas (tablas operativas)

Base: `get_my_app_role()` retorna rol del usuario autenticado.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| sm_requests | `true` (all) | pm, admin | pm, admin | admin |
| sm_request_lines | `true` | pm, admin | pm, admin, logistica, campo, almacen | pm, admin |
| trips | `true` | logistica, admin | logistica, admin | admin |
| trip_line_assignments | `true` | logistica, admin | logistica, admin | logistica, admin |
| trip_events | `true` | logistica, campo, almacen, admin | — | — |

Tablas maestras: SELECT = authenticated. INSERT/UPDATE/DELETE = admin.
**22 tablas nuevas (expansión Mar 17):** sin RLS hasta que se construya UI de cada módulo.

---

## 4. Cost Codes — Cascada de 4 tablas

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

---

## 5. Decisiones arquitectónicas

1. **`people.app_role`** es el RBAC activo. `user_app_roles` es fundación futura, no en uso.
2. **Equipment unificada.** Equipos+vehículos+remolques en una tabla. 377 items con auto-tag IC-0001→IC-0377.
3. **Equipment expandida (Mar 17):** 12 columnas nuevas + equipment_categories (10 rows) + assemblies many-to-many.
4. **Prioridad dual:** BD trigger (INSERT/UPDATE) + client-side `calculatePriority()` para display real-time.
5. **Cost codes de Spectrum.** Importados de Phase Listing exports. 138 fases, 656 combinaciones.
6. **Entregas parciales:** `qty_delivered` acumula en trip_line_assignments Y sm_request_lines. Parcial = qty_delivered < quantity.
7. **Qty management 3 capas:** Frontend clamp (originalAssignments fijo) + save validation + DB trigger enforce_qty_integrity().
8. **Fallback universal:** Cada dropdown tiene "No está en lista" → campo texto libre (`_text` columns).
9. **Secuencias:** Por proyecto para solicitudes (`{code}-SM-{NNN}`), global para viajes (`MOV-{YYYY}-{NNN}`).
10. **Confirmation code dual:** Frontend genera en useTrips + trigger BD genera como safety net.
11. **Equipment location tracking:** Trigger actualiza current_location/current_project_id en Entrega.
12. **Paginación:** Server-side (solicitudes, viajes con `.range()` + `count: 'exact'`), client-side (admin masters).
13. **Notificaciones:** Server actions via Resend (no Edge Functions). 12 templates. Fire-and-forget.
14. **47 tablas total:** 22 operativas + 22 nuevas (inspecciones, work orders, fuel, PO, warehouse, campaigns, vendors) + 3 Events V2 (trip_event_lines, delivery_observations, custody_transfers).
