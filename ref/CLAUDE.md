# MovimientOS

Sistema digital de movilizaciones para ICONSA, constructora pesada en Panamá.
Digitaliza el procedimiento IC-LOG-PO-06: solicitudes → programación → ejecución.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS → Vercel
- **Backend:** NestJS (pendiente) → Railway/Fly.io
- **DB:** Supabase PostgreSQL + Auth + RLS (project `bzeoszympkkicwlfdtcn`, us-west-2)

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # Correr ANTES de cada push
npm run lint         # ESLint
```

## Reference Docs

| Documento | Cuándo leerlo |
|-----------|---------------|
| Docs/FEATURE_SPEC.md | Reglas de negocio, pantallas, campos, validaciones. **Source of truth.** |
| Docs/SPEC.md | Schema BD (20 tablas, 27 triggers, 14 funciones). Cascada de estados. |
| Docs/ROADMAP.md | Qué falta, en qué orden. |
| Docs/SYNC_LOG.md | **Leer al inicio de cada sesión.** Puente Chat↔Code. |
| Docs/BUGS.md | Bug tracker. Documentar bugs encontrados. |

## Tres actores

- **Chat:** Planificación, diseño, Supabase (write access). Source of truth para decisiones.
- **James:** Decisiones finales, aprobación, testing, negocio.
- **Code (tú):** Implementación. Supabase READ-ONLY via MCP. Commit+push a `jaime/dev`.

## Reglas críticas

1. **NO escribir en Supabase.** Cambios de BD → `Docs/SYNC_LOG.md` → James → Chat.
2. **NO modificar FEATURE_SPEC ni SPEC (Tier 1).** Discrepancias → `.claude/suggestions.md`.
3. **Commits solo a `jaime/dev`** (o `andy/dev`). Nunca `main`.
4. **`npm run build` antes de cada push.**
5. **Regenerar tipos después de cambios de schema:** `npx supabase gen types typescript --project-id bzeoszympkkicwlfdtcn > src/lib/types/database.ts`
5. **PMs ven TODAS las solicitudes.** Restricción solo en creación (sus proyectos).
6. **'En Transito' sin acento** — canónico en BD y código.
7. **'Parcial' solo a nivel de LÍNEA**, nunca solicitud.
8. **Líneas son la unidad operativa** — exponer contenido de líneas, no solo conteos.
9. **UI 100% español. Mobile-first.** Monospace para IDs (`25-506-SM-023`).
10. **Cost codes en cascada:** Proyecto → Extra (opcional) → Fase → Categoría.

## Design Tokens

```
Navy:   #1B3A5C  (primary — headers, nav, sidebar)
Gold:   #F0A500  (accent — ICONSA brand)
Blue:   #0A6EBD  (info, links, Enviada)
Green:  #1A7F5A  (success, Completada, Entregada)
Orange: #B45309  (warning, Urgente, En Proceso, Parcial)
Red:    #C0392B  (error, Vencida, Cancelada)
Purple: #553C9A  (Programada, asignaciones)
Gray:   #5A6272  (secondary text)
```

## Workflow

**ANTES:** Lee SYNC_LOG + ROADMAP para contexto.
**DURANTE:** Lee Feature Spec sección relevante. Verifica BD via MCP.
**DESPUÉS:** Commit → push → actualizar SYNC_LOG.
**CAMBIO DE BD:** SYNC_LOG: `"Code: SOLICITUD BD — {desc}. Razón: {por qué}."`

## Coding Conventions

- TypeScript strict. No `any`. Functional components + hooks. Server Components default.
- Tailwind. Nombres en inglés. Comentarios negocio en español.
- PascalCase.tsx componentes, camelCase.ts utils/hooks.

## Dominio

- **Solicitud (SM):** `{Proyecto}-SM-{###}`. Líneas = ítems (equipo/material).
- **Viaje (Trip):** `MOV-{YYYY}-{###}`. Many-to-many con líneas via `trip_line_assignments`.
- **Backlog:** Líneas sin programar. Vista de Charris.
- **Equipment unificado:** Vehículos = `type_code IN ('VHL','VHP')`. Remolques = `LIKE 'REM%'`.
- **Entregas parciales:** `qty_delivered` acumula. `Parcial` si < quantity. Backlog muestra disponible.

## Git

`main` estable. `jaime/dev` James. `andy/dev` Andy.
Formato: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` — español.
