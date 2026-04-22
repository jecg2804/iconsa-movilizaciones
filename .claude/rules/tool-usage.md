# Rule: Uso de Herramientas — Cuándo y Cómo

Política fija de cuándo usar qué herramienta. Superpowers-driven.

## Modelo de 3 actores

- **Claude Chat**: arquitecto, planifica, escribe a Supabase (con aprobación de James), genera prompts goal-oriented.
- **Claude Code (tú)**: implementa, lee codebase completo, verifica su propio trabajo. NUNCA escribe a BD.
- **James**: decisiones, aprobaciones, testing, contexto de negocio.

## Superpowers — obligatorio (no es opcional)

Plan mode nativo de Claude Code está **desactivado** (`EnterPlanMode` en deny-list). Todo flow de planificación / ejecución / review pasa por el plugin Superpowers (fork `pcvelz/superpowers`).

- **Feature nuevo o rediseño (3+ commits esperados)** → invocar `brainstorming` ANTES de escribir código o spec. Sin excepción, aunque "ya entiendas".
- **Después de brainstorming aprobado** → `writing-plans` genera plan file en `Docs/superpowers/plans/` (ver `plan-lifecycle.md`).
- **Ejecución del plan** → `executing-plans` (secuencial) o `subagent-driven-development` (paralelo).
- **Bug complejo (3+ archivos)** → `systematic-debugging` (ver `fix-bug.md` para el flujo reducido de 1-archivo).
- **Después de step mayor** → `requesting-code-review` (revisor contextual del plan, no un agente genérico).

Para fixes triviales (1 archivo, obvio): decir "skip brainstorming" explícitamente. Default es invocar.

## Supabase MCP — read-only

SIEMPRE antes de tocar BD: verificar schema via MCP.

- Tools permitidas (lectura): `list_tables`, `generate_typescript_types`, `get_logs`, `get_advisors`, `search_docs`, etc. Lista completa en `supabase-readonly.md`.
- Tools mutantes (`execute_sql`, `apply_migration`, `deploy_edge_function`…) bloqueadas por deny-list en `.claude/settings.json`.
- Default project_id: **staging** (`vonwkciosksqspyljzfy`). Prod (`bzeoszympkkicwlfdtcn`) solo para drift comparison y anunciado explícitamente en chat.

Si necesitas un cambio de BD → STOP → `[bd-pending]` en `Docs/CHANGELOG.md` con el SQL exacto → James ejecuta manualmente en Supabase SQL Editor → `[bd-pending]` pasa a `[bd]`.

## Context7 — docs actualizados

SIEMPRE antes de usar APIs que cambian entre versiones:

- Next.js App Router, Supabase SSR, React hooks, Tailwind v4, MapLibre, react-map-gl.
- NO saltar porque "ya conozco esta API" — las versiones cambian los contratos.
- Invocar: `use context7` o `use library /supabase/supabase` en el prompt.

## Playwright MCP — verificación visual

- **Después de cambios visuales** → abrir `localhost:3000` y verificar el flow end-to-end.
- **Debugging de flow** → navegar paso a paso cuando un bug no es obvio en código.
- NUNCA en `rein-eisenwerk.com` (producción) sin permiso explícito de James.

## Chrome DevTools MCP — debugging bajo capa

- **Errores no obvios** → consola del browser (`listConsoleMessages`).
- **APIs fallidas** → network requests a Supabase.
- **Performance issues** → Lighthouse audit.

## Repomix — contexto comprimido para Chat

- Antes de una sesión con Claude Chat: correr `repomix` en root del proyecto → `repomix-output.xml` con signatures only (~70% reducción de tokens). Subir a Chat.
- Config vive en `repomix.config.ts` (compress + tree-sitter + security-check).
- Token budgeting: `repomix --token-count-tree`.
- **Repomix es snapshot del working tree, no sync en tiempo real.** Si Code hace cambios después de la última generación, Chat no los ve hasta que se regenere y se suba de nuevo. En sesiones largas, regenerar cuando haya cambios estructurales.

## Subagent dispatching (Task tool)

Usar `Task` con `subagent_type` cuando:

- **Investigación paralelizable** (explorar 3 features a la vez) → `Explore` o `general-purpose`.
- **Implementación paralelizable** (editar 4 archivos independientes) → flow `subagent-driven-development` de Superpowers.
- **Preservar contexto del main** (búsqueda extensa que llenaría >30K tokens) → delegar a un subagent para que solo devuelva el resumen.

NO usar para tareas triviales que se resuelven con 1-2 tool calls en el main session.

## Skills del proyecto (on-demand)

Los skills se cargan automáticamente cuando la tarea matchea su `description` frontmatter. También se pueden invocar explícitamente.

| Skill | Cuándo se activa |
|---|---|
| `crud-page` | Página con lista/tabla + formulario |
| `events-page` | Mis Viajes, eventos, timeline |
| `supabase-queries` | Filtros, joins, cost codes |
| `partial-delivery` | `qty_scheduled`, `qty_delivered`, entregas fraccionadas |
| `seed-data` | Crear datos de prueba, orden de FK para deletes |
| `technical-decisions` | Funciones, triggers, RLS, decisiones arquitectónicas |
| `form-submit-guard` | Anti doble-submit en handlers async |
| `debug-skydata` | Probar la API de SkyData con script standalone |

## Flujo estándar por tipo de tarea

### Feature nuevo (prompt goal-oriented de Chat)

1. Leer el prompt completo — entender **problema**, no solo la instrucción.
2. `brainstorming` → acordar approach con James.
3. Verificar schema vía Supabase MCP.
4. `writing-plans` → plan file en `Docs/superpowers/plans/`.
5. `executing-plans` o implementación manual paso a paso.
6. Post-commit hook lanza `npm run build` en background; si falla, el siguiente push lo bloquea.
7. Verificar con Playwright MCP si tocó UI.
8. Commit atómico + entry en `Docs/CHANGELOG.md` (mismo commit).
9. Al cerrar la feature, actualizar `Docs/TRAIL.md` (posición en el árbol de tareas) y `Docs/BACKLOG.md` si corresponde.

### Bug fix

1. Si 3+ archivos tocados → `systematic-debugging`. Si 1 archivo obvio → directo (ver `fix-bug.md`).
2. Verificar schema vía Supabase MCP si toca BD.
3. Fix mínimo — sin refactors oportunísticos.
4. Verificar con Playwright MCP.
5. Commit + entry en `Docs/CHANGELOG.md`. Si el bug es recurrente o tiene contexto durable, entry en `Docs/BACKLOG.md`.

### Tarea de UI / diseño

1. `UI-UX-Pro-Max` + `frontend-design` antes de codear — dejan el design system listo.
2. Seguir `crud-page` si es tabla + formulario.
3. Mobile-first; verificar responsive con Playwright MCP.

## Sincronización de docs vivos (responsabilidad de Code)

Los docs vivos del proyecto son **responsabilidad de Claude Code**, no de Chat. Mantenerlos sincronizados:

- `Docs/CHANGELOG.md` → entry atómico en el **mismo commit** que el código.
- `Docs/BACKLOG.md` → cuando se cierra un item, se descubre uno nuevo, o cambia prioridad.
- `Docs/TRAIL.md` → cuando se cierra una tarea o cambia la posición en el árbol de tareas. Este doc es la primera lectura al inicio de sesión.

Ver `.claude/rules/plan-lifecycle.md` para el ciclo de vida de plan files y specs.

## Screenshots y archivos temporales

- Screenshots de E2E tests (`Docs/test-screenshots/`, `test-results/`, `playwright-report/`) son temporales. Borrar antes de cerrar sesión.
- NUNCA commitear imágenes al repo — `.gitignore` los excluye, verificar antes de `git add`.
- Si un screenshot es relevante para documentación permanente, describirlo en texto en CHANGELOG/BACKLOG.

## NUNCA

- Escribir a Supabase (MCP mutante bloqueado por deny-list).
- Instalar dependencias npm sin preguntar.
- Refactors oportunísticos durante un bug fix.
- Modificar `CLAUDE.md` ni `Docs/FEATURE_SPEC.md` (solo Chat y James los tocan).
- Usar Playwright / DevTools en producción sin permiso.
- Commit ni push a `main` (ver `git-workflow.md`).
- Commitear imágenes al repo.
