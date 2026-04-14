# MovimientOS

Sistema de operaciones para ICONSA (Ingeniería Continental S.A.), empresa de construcción pesada en Panamá. Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales).

**Deployed:** [rein-eisenwerk.com](https://rein-eisenwerk.com)

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript (target ES2022) + Tailwind CSS → Vercel
- **Base de datos:** Supabase PostgreSQL + Auth + RLS + Storage (47 tablas, dos branches: prod + staging)

## Base de datos

47 tablas en Supabase PostgreSQL con RLS habilitada en todas. ~25 operativas (movilizaciones, solicitudes, eventos, cost codes, notifications) + ~22 para futuros módulos (inspecciones, work orders, fuel, warehouse, purchase orders, billing campaigns, custody transfers).

Tabla `equipment` unificada (377 equipos/vehículos/remolques con auto-tag IC-####). Clasificación por `type_code`, filtrado en queries.

## Features

1. **Autenticación** — Supabase Auth, 5 roles (admin, pm, logistica, campo, almacen)
2. **Solicitudes** — Ingenieros crean solicitudes de movilización con líneas detalladas
3. **Programación** — Backlog de líneas, calendario, viajes con qty management
4. **Ejecución** — Eventos secuenciales (salida, llegada, entrega con código 4 dígitos, retorno), paradas intermedias, self-pickup, reversiones con audit trail
5. **Dashboard** — KPIs operativos + widgets accionables (entregas pendientes en viajes cerrados)
6. **Admin** — CRUD tablas maestras con paginación
7. **Notificaciones** — 16 templates email via Resend, redact de PII en Sentry
8. **Attachments** — Archivos en solicitudes, viajes, y eventos (MIME + size validation BD)

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `CLAUDE.md` | Contexto del proyecto para Claude Code |
| `Docs/CHANGELOG.md` | Cambios recientes (código + BD). Se actualiza con cada commit. |
| `Docs/BACKLOG.md` | Qué falta por hacer — features tier-orderadas + architectural debt |
| `Docs/FEATURE_SPEC.md` | Spec v4 — reglas de negocio, pantallas, validaciones (no auto-cargado, 39K chars) |
| `Docs/reference/Vision Roadmap.md` | Estrategia: 13 SOPs de ICONSA que MovimientOS tocará |
| `Docs/reference/Self-pickup.md` | Decisión arquitectónica sobre pickup flow |
| `Docs/archive/` | Docs históricos: BUGS, SYNC_LOG, PROJECT_STATUS, BUILD_PLAN |

## Desarrollo

```bash
npm install   # instala deps + corre `husky` para configurar hooks
npm run dev   # http://localhost:3000
npm run build # build manual (post-commit ya lo corre en background)
npm test      # corre Playwright E2E (131 tests en 14 archivos)
```

## Branching y releases

- `main` — Versión estable. Deploy automático a Vercel en producción.
- `jaime/dev` — Branch de desarrollo. Commits frecuentes, push directo.
- **Protegido por Husky**: pre-commit bloquea commits en main local, pre-push bloquea push a main + force pushes, post-commit lanza build en background.
- **Releases**: `/release` skill automatiza `jaime/dev → main` (valida Vercel READY, crea PR, squash merge, taggea `v{YYYY}.{MM}.{DD}-{N}`).
