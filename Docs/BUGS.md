# BUGS — Issues conocidos

Claude Code puede actualizar este archivo directamente.

## Resueltos

| # | Bug | Fecha | Commit |
|---|-----|-------|--------|
| 1 | Trigger generate_request_id off-by-one | 2026-03-05 | — |
| 2 | Indexes duplicados sequences | 2026-03-05 | — |
| 3 | Tarifa no pre-rellena Costo | 2026-03-06 | — |
| 4 | Dropdowns no filtrados (equipo, conductor) | 2026-03-06 | — |
| 5 | Redirect incorrecto al guardar | 2026-03-06 | — |
| 6 | Viajes Recientes falta info | 2026-03-06 | — |
| 7 | Fecha requerida en líneas viaje | 2026-03-06 | — |
| 8 | Remolque siempre opcional | 2026-03-06 | — |
| 9 | IDs off-by-one en sequences | 2026-03-06 | — |
| 10 | Remolque incluye camiones | 2026-03-06 | — |
| 11 | Categoría costo eliminada al agregar Categoría Material | 2026-03-07 | 4892737 |
| 12 | CodeConfirmation permitía bypass | 2026-03-07 | a353a43 |
| 13 | confirmation_code NULL en viajes nuevos | 2026-03-08 | — (trigger BD + frontend fix) |
| 14 | qty_delivered siempre 0 en líneas Entregada | 2026-03-11 | 6198f5b |
| 15 | created_by usaba requester_id en vez de personId | 2026-03-12 | — |
| 16 | cascade_request_status() orden incorrecto (Parcial antes de En Proceso) | 2026-03-12 | — (fix BD) |
| 17 | RLS bloqueaba UPDATE sm_request_lines para roles operativos | 2026-03-12 | — (fix BD) |
| 18 | formatCompletionDelta timezone: TIMESTAMPTZ parseado como DATE causa desfase 1 día en UTC-5 | 2026-03-12 | 6249867 |
| 19 | Columna "Días" en solicitudes: completadas/canceladas mostraban días vs hoy en vez de delta | 2026-03-12 | 4808839 |
| 20 | KPI "Ítems sin programar" contaba líneas de solicitudes Borrador/Cancelada/Completada | 2026-03-12 | 01d5e59 |
| 22 | /programacion/viaje/[id] no mostraba eventos de ejecución + trip_id no era clickeable en solicitud | 2026-03-12 | 49b898e |
| 23 | Receptor dropdown muy restringido — solo personas del proyecto destino | 2026-03-12 | 7de6658 |
| 24 | Backlog no mostraba líneas parcialmente programadas | 2026-03-12 | d6dfbe2 |
| 25 | Entrega no acumulaba qty_delivered (siempre sobrescribía) | 2026-03-12 | 38854f6 |
| 26 | Entrega siempre marcaba Entregada sin verificar cantidad vs total | 2026-03-12 | 38854f6 |
| 27 | 'En Tránsito' con acento no coincidía con BD | 2026-03-12 | ad43ec0 |

## Abiertos

| # | Bug | Reportado | Prioridad |
|---|-----|-----------|-----------|
| — | Ninguno conocido | — | — |

## Mejoras pendientes (no son bugs)

| Mejora | Prioridad | Estado |
|--------|-----------|--------|
| Backlog con más contexto visual | Baja | Por discutir |
| Columna "FECHA" ambigua en viajes recientes | Baja | Por discutir |
| Asignar 10 ingenieros a person_projects | Media | Lunes con info oficina |
| Admin Masters CRUD | Media | Fase 6 |
| RLS policies reales (no USING(true)) | Alta | Pre-producción |
| Notificaciones email | Media | Fase 6 |
