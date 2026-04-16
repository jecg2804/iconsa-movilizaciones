# Ciclo de vida de plan files

Regla explícita para manejar plan files (`~/.claude/plans/*.md`) sin
acumular ruido. Motivación: durante el audit de abril-2026, el plan file
activo llegó a 1778 líneas porque mezclaba audit history, tareas
diferidas, y plan activo — se perdió la visibilidad de qué estábamos
haciendo.

## Cuándo crear un plan file

- Al entrar a **plan mode** para una tarea no-trivial (aproximadamente
  3+ commits esperados, o scope que requiere varios bloques).
- El harness escribe el plan en `~/.claude/plans/<nombre-auto>.md`.
- Si ya existe un plan file activo y **la tarea nueva es distinta**,
  **sobrescribir** el contenido completo (no acumular múltiples planes
  en el mismo file).
- Si la tarea actual es **continuación directa** del plan existente,
  editar incrementalmente.

## Qué contiene un plan file (y qué NO)

**Sí:**

- Contexto mínimo de por qué se hace el cambio
- Bloques/fases con pasos concretos
- Archivos tocados
- Verificación
- Fuera de scope

**NO:**

- Historia de commits pasados (eso vive en CHANGELOG)
- Features diferidos o ideas futuras (eso vive en BACKLOG)
- Audit findings o bugs detectados (esos viven en CHANGELOG como
  entries `[audit]` / `[fix]`)
- Aprendizajes técnicos duraderos (esos viven en skills)

## Cuándo limpiar / recortar

- **Tras cada bloque commiteado**: marcar el bloque como ✅ o eliminarlo
  del plan file. No acumular detalles de ejecución pasada.
- **Si el plan file supera 300 líneas**: PARAR y limpiar antes de
  continuar. 300 líneas es ruido estructural, no plan.
- **Al cerrar el último bloque de un plan**: mover aprendizajes
  duraderos a CHANGELOG o skills, y sobrescribir el plan con un stub
  tipo "task cerrada, esperando próxima dirección" (~5 líneas).

## Cuándo borrar

- **Tras cerrar una tarea completa**: borrar el plan file en la
  siguiente sesión si ya no queda contenido útil (ej. plans de fixes
  aplicados semanas atrás).
- **Plans con >30 días sin edit**: candidatos a revisión automática.
- **Plans cuyo contenido está reflejado en CHANGELOG/BACKLOG**: borrar,
  no duplicar.

## Qué NO hacer nunca

- Nunca acumular **1000+ líneas** en un plan — eso es un log histórico
  disfrazado de plan.
- Nunca dejar **5+ plans históricos** sin limpiar. Al inicio de cada
  sesión nueva, revisar `~/.claude/plans/` y borrar lo obsoleto.
- Nunca **mezclar tarea activa con tareas diferidas** en el mismo plan.
  Si algo se difiere, moverlo a `Docs/BACKLOG.md` y eliminarlo del plan.
- Nunca usar el plan file como "memoria a largo plazo" del proyecto.
  La memoria vive en CHANGELOG (qué pasó), BACKLOG (qué falta),
  CLAUDE.md (convenciones), y skills (patrones).

## Integración con el workflow

- Al inicio de cada sesión, leer `Docs/TRAIL.md` para ver dónde estoy
  en el árbol de tareas. Si el plan file activo no matchea el trail,
  el trail es la fuente de verdad — corregir el plan.
- Al cerrar cualquier task (completa o parcial), actualizar
  `Docs/TRAIL.md` con la nueva position.
- Al hacer un commit de un bloque del plan, eliminar ese bloque del
  plan file en el mismo commit (o en el siguiente inmediato).

## Sincronización con el repo (para Claude Chat)

Claude Chat necesita acceso a los plan files para poder analizar y
mejorar el workflow de Claude Code. Los plans viven en
`~/.claude/plans/` (global, fuera del repo) pero deben sincronizarse
al repo en `.claude/plans/`.

**Regla:** cada vez que se crea, edita, o borra un plan file en
`~/.claude/plans/`, copiar el cambio a `.claude/plans/` en el repo
e incluirlo en el mismo commit (o en el siguiente inmediato).

```bash
# Al crear/editar:
cp ~/.claude/plans/<nombre>.md .claude/plans/<nombre>.md
git add .claude/plans/<nombre>.md

# Al borrar:
rm .claude/plans/<nombre>.md
git add .claude/plans/<nombre>.md
```

Esto asegura que Chat siempre ve el plan file activo y puede dar
feedback sobre estructura, scope, o approach.
