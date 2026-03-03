# ICONSA Movilizaciones

Sistema digital de gestión de movilizaciones para ICONSA (Ingeniería Continental S.A.), empresa de construcción pesada en Panamá.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel (pendiente)
- **Reporting:** Metabase (futuro)
- **Automations:** n8n (futuro)

## Base de datos

16 tablas en Supabase PostgreSQL. Ver `PROJECT_STATUS.md` para schema completo.

**Maestras:** equipment (377), people (160), projects (4), locations (9), mobilization_rates (14), units (11), cost_codes (pendiente), person_projects, sequences, suggestions.

**Transaccionales:** sm_requests, sm_request_lines, trips, trip_line_assignments, trip_events.

Decisión clave: tabla `equipment` unificada (equipos + vehículos). Clasificación por `type_code` (EQP, GRU, MAR, VHL, VHP, etc.), filtrado en queries.

## MVP (5 features)

1. **Autenticación** — Login con Supabase Auth, 5 roles (admin, pm, logistica, campo, almacen)
2. **Solicitudes** — Ingenieros crean solicitudes de movilización con líneas detalladas
3. **Programación** — Charris ve backlog, crea viajes asignando conductor/vehículo/fecha
4. **Ejecución** — Conductores registran eventos (salida, llegada, entrega con código 4 dígitos, retorno)
5. **Dashboard** — KPIs por rol: pendientes, programados, completados

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `PROJECT_STATUS.md` | **Fuente de verdad.** Schema completo, estado de datos, decisiones, pendientes. |
| `ICONSA_MVP_Sprint_Brief.md` | Contexto para desarrollo. Features, reglas de negocio, UI guidelines. |
| `ICONSA_Feature_Specification_v2.docx` | Spec formal completa (~45 páginas). |
| `ICONSA_Guia_Operativa.md` | Cómo opera ICONSA hoy (proceso actual en papel). |

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

## Workflow

- **Claude.ai Chat** — Arquitectura, decisiones, documentación
- **Claude Code (VS Code)** — Construcción, código, debugging
- **James** — Director del proyecto, verificación, deployment
