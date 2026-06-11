# Merge delta prod ← staging — VALIDADO EN VIVO (2026-06-11)

> **Cómo se obtuvo:** Claude Code con read-access ejecutó `information_schema`
> + `pg_catalog` + `pg_constraint` contra prod (`bzeoszympkkicwlfdtcn`) y
> staging (`vonwkciosksqspyljzfy`) vía Supabase MCP. **NO es reconstrucción
> de docs** — es el estado real de ambas BDs al 2026-06-11. Este es el input
> exacto del script BD consolidado del merge v2 (reemplaza la prosa `[bd]`
> del CHANGELOG como fuente del script).

## Resumen

| | Prod (Events V1) | Staging (Events V2 + Cambios 2-6.5) |
|---|---|---|
| Tablas public | **44** | **51** |
| Funciones public | **17** | **38** |
| `trips.rate_id` | nullable | NOT NULL |
| `trip_line_assignments` | 7 columnas | 9 columnas |

## 1. Tablas que faltan en prod (7) — el script las CREA

`custody_transfers`, `delivery_observations`, `external_order_lines`, `external_orders`, `pickup_order_lines`, `pickup_orders`, `trip_event_lines`

(+ sus RLS policies — recordar el incidente Cambio 5: tablas con RLS enabled y CERO policy rompen todo INSERT. Las 14 policies de pickup/external están en el CHANGELOG 2026-04-28; verificar contra staging vía pg_policies antes de portar.)

## 2. Columnas que faltan en `trip_line_assignments` en prod (2)

`qty_dispatched`, `qty_rejected` — el código de jaime/dev las usa intensivamente (5 archivos). Sin ellas → `PGRST204` en runtime. El script las agrega + los CHECKs asociados (`qty_dispatched_le_assigned`, `qty_delivered_plus_rejected_le_dispatched`).

## 3. Funciones que faltan en prod (21) — el script las CREA

auto_cancel_empty_external_order, auto_cancel_empty_pickup_order, enforce_cancellation_reason_external_orders, enforce_cancellation_reason_pickup_orders, enforce_cancellation_reason_trips, enforce_line_add_delete_only_in_borrador, enforce_notes_on_with_observations, enforce_one_active_delivery_per_trip_line, enforce_quantity_immutable_with_active_assignments, enforce_revert_only_on_active_trip, enforce_trip_immutable_post_departure, generate_external_id, generate_pickup_id, recalc_qty_for_line, sync_assignment_on_delivery_event, sync_assignment_on_delivery_revert, trg_recalc_from_assignment_change, trg_recalc_from_external_order_status_change, trg_recalc_from_pickup_order_status_change, trg_recalc_from_trip_status_change, update_equipment_location_on_custody_transfer

## 4. Funciones en AMBOS pero con cuerpo distinto (V1 vs V2) — el script hace REPLACE

Las comparte por nombre pero la versión de prod es V1 (pre-Events V2). Requieren `CREATE OR REPLACE` a la versión de staging (verificar cuerpo con `pg_get_functiondef` antes): **cascade_request_status** (V1 1365 chars sin pickup/external), **enforce_qty_integrity**, **generate_confirmation_code**, **capture_lifecycle_timestamps**, **capture_trip_cancelled**, **generate_full_code**. (Las 11 restantes compartidas — audit_trigger, get_my_app_role, update_updated_at, etc. — probablemente idénticas; diff por `pg_get_functiondef` en la construcción del script.)

## 5. Constraints / NOT NULL a aplicar en prod

- `trips.rate_id SET NOT NULL` — **BLOQUEADO HOY: hay 1 trip en prod con `rate_id IS NULL`.** El script debe resolver ese trip (asignar tarifa o documentar excepción) ANTES del `SET NOT NULL`, o falla.
- CHECKs de qty en `trip_line_assignments` (H7/H8 + Cambio 6.5).
- `valid_event_type` (en `notification_log`, NO en trip_events): staging tiene 18 event types. Prod: verificar que el ALTER del 2026-04-20 (superset de 18) ya está — el CHANGELOG dice que sí se aplicó a prod; validar con pg_constraint antes de asumir.

## 6. Estado de data en prod que el merge debe limpiar (gates pre-merge)

- **7 líneas `En Transito` zombie** (status En Transito sin trip activo) — el bug V1 de Retorno-no-reconcilia, manifestado. El script/migración debe sanearlas (recalc tras instalar las funciones V2, o cleanup manual).
- **1 trip con rate_id NULL** (ver §5).
- (BL-EXCLUSIVITY no aplica en prod: las tablas pickup/external no existen aún, así que una línea no puede estar en 3 modalidades estructuralmente.)

## Pendiente de validar en vivo (próximos diagnósticos)

- `pg_get_functiondef` de las 6 funciones compartidas V1-vs-V2 → confirmar cuáles realmente cambian.
- pg_policies completo de staging para las 7 tablas nuevas → portar exactas al script.
- Advisors de prod post-script (RLS, search_path) → el hardening 2026-04-14 que solo llegó a staging.
- Backfill: orden de operaciones (columnas → tablas → constraints → funciones → triggers → recalc de saneamiento).

**Este doc se convierte en el plan del script consolidado en el merge track (S4+). Cada ítem se verifica contra la BD viva antes de ejecutarse — nunca se confía en esta foto sin revalidar.**
