# MovimientOS

Sistema digital de gestión de movilizaciones para ICONSA (Ingeniería Continental S.A.), empresa de construcción pesada en Panamá. Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales).

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS → Vercel
- **Backend:** NestJS (TypeScript) → Railway / Fly.io
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS + Storage + Realtime)
- **Reporting:** Metabase
- **Data/ETL/AI:** Python (scripts)
- **Campo (futuro):** KoboToolbox (inspecciones offline)

## Base de datos

15 tablas en Supabase PostgreSQL. Ver `Docs/PROJECT_STATUS.md` para schema completo.

**Maestras:** equipment (377), people (160), projects (4), locations (9), mobilization_rates (14), units (11), cost_codes (pendiente), person_projects, sequences, suggestions.

**Transaccionales:** sm_requests, sm_request_lines, trips, trip_line_assignments, trip_events.

Decisión clave: tabla `equipment` unificada (equipos + vehículos). Clasificación por `type_code` (EQP, GRU, MAR, VHL, VHP, etc.), filtrado en queries.

## MVP (5 features)

1. **Autenticación** — Login con Supabase Auth, 5 roles (admin, pm, logistica, campo, almacen)
2. **Solicitudes** — Ingenieros crean solicitudes de movilización con líneas detalladas
3. **Programación** — Charris ve backlog, crea viajes asignando conductor/vehículo/fecha
4. **Ejecución** — Conductores registran eventos (salida, llegada, entrega con código 4 dígitos, retorno)
5. **Dashboard** — KPIs globales: pendientes, programados, completados

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `Docs/PROJECT_STATUS.md` | **Fuente de verdad.** Schema completo, estado de datos, decisiones, pendientes. |
| `Docs/ICONSA_Feature_Specification_v2.md` | Spec formal completa (~45 páginas). Versión 2.1. |
| `Docs/ICONSA_MVP_Sprint_Brief.md` | Contexto para desarrollo. Features, reglas de negocio, UI guidelines. |
| `Docs/BUILD_PLAN.md` | Plan de construcción por fases con archivos y pasos específicos. |
| `Docs/ICONSA_Guia_Operativa.md` | Cómo opera ICONSA hoy (proceso actual en papel). |
| `Docs/supabase_schema_verified.sql` | Schema SQL verificado contra Supabase live. |

## Desarrollo

```bash
npm install
npm run dev    # http://localhost:3000
```

Variables de entorno en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://bzeoszympkkicwlfdtcn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Branching

- `main` — Versión estable. Docs y código aprobado.
- `jaime/dev` — Branch de desarrollo de James.
