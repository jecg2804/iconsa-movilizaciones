# Ciclo de vida de plan files

Regla para manejar plan files generados por Superpowers sin acumular
ruido. Motivación: durante el audit de abril-2026, un plan activo llegó
a 1778 líneas porque mezclaba audit history, tareas diferidas, y plan
activo — se perdió la visibilidad de qué estábamos haciendo.

## Dónde viven

Path canónico: `Docs/superpowers/plans/<slug>.md` dentro del repo. Cada
plan puede tener además `<slug>.md.tasks.json` para el tracking de tasks
por `executing-plans` / `subagent-driven-development`.

Git-tracked: los plans son revisables en PRs, consultables via `repomix`,
y viven con el código. No requieren sincronización externa — el file
está en el repo desde el momento en que `writing-plans` lo crea.

## Cuándo crear un plan file

- Tras `brainstorming` acordado con James, invocar `writing-plans` para
  tareas no-triviales (~3+ commits esperados, o scope que toca varios
  bloques).
- Si ya existe un plan activo y la tarea nueva es **distinta**, crear un
  plan nuevo en lugar de sobreescribir. Un file por tarea.
- Si la tarea actual es **continuación directa** del plan existente,
  editar in-place.

## Qué contiene un plan (y qué NO)

**Sí:**

- Contexto mínimo de por qué se hace el cambio.
- Bloques / fases con pasos concretos.
- Archivos tocados + verificación.
- Fuera de scope explícito.

**NO:**

- Historia de commits ejecutados — vive en `Docs/CHANGELOG.md`.
- Features diferidos o ideas futuras — viven en `Docs/BACKLOG.md`.
- Audit findings / bugs abiertos — viven en CHANGELOG como entries
  `[audit]` / `[fix]`.
- Aprendizajes técnicos duraderos — viven en skills.

## Cuándo limpiar / recortar

- **Tras cada bloque commiteado:** marcar el bloque como ✅ o eliminarlo
  del plan. No acumular detalles de ejecución pasada.
- **Si el plan supera 300 líneas:** PARAR y limpiar antes de continuar.
  300 líneas es ruido estructural, no plan.
- **Hard cap de 1000 líneas:** nunca. Si llegás ahí, es un log histórico
  disfrazado de plan — recortar agresivamente o borrar y recrear.

## Cuándo borrar

- **Al cerrar una tarea completa:** borrar el plan file. No archivar. El
  valor histórico está en CHANGELOG; el plan cumplió su función.
- **Plans sin edit por >30 días:** candidatos a revisión. Si la tarea ya
  se cerró o se descartó, borrar.
- **Plans cuyo contenido está reflejado en CHANGELOG / BACKLOG:** borrar.
  No duplicar.

## Spec files (fuera de scope de esta rule)

Los spec files producto de `brainstorming` (pre-plan) viven en
`Docs/superpowers/specs/`. Su ciclo de vida es distinto al de los plans
y se definirá en una rule separada (`spec-lifecycle.md` pendiente —
Tanda 3). Esta rule solo cubre plans.

## Qué NO hacer nunca

- Mezclar tarea activa con tareas diferidas en el mismo plan. Si algo se
  difiere, moverlo a `Docs/BACKLOG.md` y eliminarlo del plan.
- Usar el plan como "memoria a largo plazo" del proyecto. La memoria
  vive en CHANGELOG (qué pasó), BACKLOG (qué falta), CLAUDE.md
  (convenciones), skills (patrones), TRAIL (posición actual).
- Dejar 5+ plans históricos sin limpiar. Al inicio de cada sesión,
  `ls Docs/superpowers/plans/` y borrar lo obsoleto.

## Integración con el workflow

- Al inicio de cada sesión, leer `Docs/TRAIL.md` para ubicación en el
  árbol de tareas. Si el plan activo no matchea el trail, TRAIL es la
  fuente de verdad — corregir el plan.
- Al cerrar cualquier task (completa o parcial), actualizar
  `Docs/TRAIL.md` con la nueva posición.
- Al commitear un bloque del plan, eliminar ese bloque del plan file en
  el mismo commit (o en el siguiente inmediato).
