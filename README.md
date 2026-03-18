# MovimientOS

Sistema de operaciones para ICONSA (Ingeniería Continental S.A.), empresa de construcción pesada en Panamá. Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales).

**Deployed:** [rein-eisenwerk.com](https://rein-eisenwerk.com)

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS → Vercel
- **Base de datos:** Supabase PostgreSQL + Auth + RLS + Storage (44 tablas)

## Base de datos

44 tablas en Supabase PostgreSQL. 22 operativas (movilizaciones) + 22 para futuros módulos (inspecciones, work orders, fuel, warehouse, billing).

Tabla `equipment` unificada (377 equipos/vehículos/remolques con auto-tag IC-####). Clasificación por `type_code`, filtrado en queries.

## Features

1. **Autenticación** — Supabase Auth, 5 roles (admin, pm, logistica, campo, almacen)
2. **Solicitudes** — Ingenieros crean solicitudes de movilización con líneas detalladas
3. **Programación** — Backlog de líneas, calendario, viajes con qty management
4. **Ejecución** — Eventos secuenciales (salida, llegada, entrega con código 4 dígitos, retorno)
5. **Dashboard** — KPIs operativos por rol
6. **Admin** — CRUD tablas maestras con paginación
7. **Notificaciones** — 12 templates email via Resend
8. **Attachments** — Archivos en solicitudes, viajes, y eventos

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `CLAUDE.md` | Contexto del proyecto para Claude Code |
| `Docs/FEATURE_SPEC.md` | Spec v4 — reglas de negocio, pantallas, validaciones |
| `Docs/FEATURE_SPEC_v3_FOUNDATIONAL.md` | Spec original (1249 líneas, schema outdated) |
| `Docs/SYNC_LOG.md` | Log de cambios entre Chat/Code/James |
| `Docs/BUGS.md` | Tracking de bugs |

## Desarrollo

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # Verificar antes de push
```

## Branching

- `main` — Versión estable. Deploy automático a Vercel.
- `jaime/dev` — Branch de desarrollo. PR a main para deploy.
