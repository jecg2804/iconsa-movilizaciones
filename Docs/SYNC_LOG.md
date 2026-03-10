# SYNC_LOG — Bridge entre Chat y Claude Code

Ambos actores escriben aquí. James lo revisa para mantenerse al día.
Formato: fecha, quién (Chat/Code/James), qué cambió, acción requerida.

---

## 2026-03-09 — Chat: Schema changes aplicados

- `received_by_id UUID FK people` agregado a `trip_events` (migración `add_received_by_id_to_trip_events`)
- Trigger `generate_confirmation_code()` creado en trips (migración `auto_generate_confirmation_code`)
- Trigger `generate_full_code()` creado en cost_codes — formato todo dashes (migración `auto_generate_full_code_with_dashes`)
- `full_code` corregido de puntos a dashes en 98 registros
- `confirmation_code` backfilled en viajes que tenían NULL
- Sequences corregidos: 24-404 SM next=3, trips next=4
- **Claude Code:** Los triggers generan confirmation_code y full_code automáticamente. No necesitas generarlos en frontend (pero el frontend también lo hace como doble capa).

## 2026-03-09 — Chat: database.ts regenerado

- James colocó manualmente `src/lib/types/database.ts` con tipos actualizados
- Incluye: cost_categories, cost_code_categories, received_by_id en trip_events, cost_category_id y material_category en sm_request_lines
- **Claude Code:** No correr `npx supabase gen types`. Los tipos ya están actualizados.

## 2026-03-09 — Chat: Documentación v3.3 sincronizada

- Feature Spec actualizado a v3.3 (sistema entrega, timestamps, dashes, sección 11)
- CLAUDE.md en raíz actualizado (17 reglas, v3.3, sin acceso write Supabase)
- PROJECT_STATUS actualizado (34 decisiones, triggers nuevos, pendientes actualizados)
- Sprint Brief actualizado (6 proyectos, 177 people, 98 cost codes, received_by_id)
- events-page.md skill actualizado (must be correct, timestamps no editables)
- supabase-queries.md skill actualizado (search spectrum_code)
- supabase_schema_verified.sql regenerado con todos los cambios

## 2026-03-09 — James: App deployed

- URL: https://www.rein-eisenwerk.com/login
- Vercel connected to jaime/dev branch
