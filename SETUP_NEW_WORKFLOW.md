# Setup: Nuevo workflow con commands, agents, y tasks

Crear los siguientes archivos y directorios. Esto establece un nuevo flujo de trabajo donde Chat genera task files y tú los ejecutas con `/project:implement-task`.

## Paso 1: Crear directorios

```bash
mkdir -p .claude/commands .claude/agents Docs/TASKS
```

## Paso 2: Crear `.claude/commands/implement-task.md`

```markdown
---
name: implement-task
description: Implementar una tarea desde un archivo de task en Docs/TASKS/. Leer el archivo, entender el plan completo, y ejecutar paso a paso.
---

Implementar la tarea descrita en: $ARGUMENTS

## Workflow

1. Lee el archivo de tarea indicado (ej: `Docs/TASKS/password-recovery.md`)
2. Lee `CLAUDE.md` y `Docs/SYNC_LOG.md` para contexto actual
3. Verifica el schema de BD relevante via Supabase MCP
4. Lee las secciones relevantes de `Docs/FEATURE_SPEC.md` si la tarea lo requiere
5. Implementa cada paso del plan en orden
6. Después de cada paso: `npm run build` para verificar compilación
7. Commit después de cada paso exitoso con mensaje descriptivo
8. Al terminar todos los pasos, actualiza `Docs/SYNC_LOG.md` con resumen
9. Si encontraste bugs, documenta en `Docs/BUGS.md`

## Reglas

- NO modificar BD — si necesitas un cambio de schema, escribe en SYNC_LOG y PARA
- NO modificar CLAUDE.md ni FEATURE_SPEC.md (Tier 1)
- Usar `useSubmitGuard` pattern en todo handler async nuevo (ver `.claude/skills/form-submit-guard.md`)
- Un commit por paso, no acumular cambios
- Si el plan tiene ambigüedad, haz tu mejor interpretación y documenta la decisión en SYNC_LOG
```

## Paso 3: Crear `.claude/commands/fix-bug.md`

```markdown
---
name: fix-bug
description: Diagnosticar y arreglar un bug. Puede recibir descripción del error, screenshot context, o un número de bug de BUGS.md.
---

Diagnosticar y arreglar el siguiente bug: $ARGUMENTS

## Workflow

1. Entender el bug: leer la descripción, reproducir mentalmente el flujo
2. Buscar archivos relevantes en el codebase (grep, glob)
3. Si el bug involucra BD, verificar schema/data via Supabase MCP
4. Identificar root cause — no asumir, verificar
5. Implementar el fix mínimo necesario (no refactors oportunísticos)
6. `npm run build` para verificar compilación
7. Commit: `fix: bug #N — descripción breve` o `fix: descripción breve`
8. Agregar/actualizar en `Docs/BUGS.md`
9. Actualizar `Docs/SYNC_LOG.md` si el fix es significativo

## Reglas

- Buscar si el bug afecta otros puntos del app (mismo patrón)
- Si el fix requiere cambio de BD → SYNC_LOG + PARAR
- Si descubres bugs adicionales, documentar en BUGS.md como abiertos
- Verificar que el fix no introduce regresión en `npm run build`
```

## Paso 4: Crear `.claude/commands/review.md`

```markdown
---
name: review
description: Revisar el código actual contra FEATURE_SPEC y detectar discrepancias, bugs potenciales, o deuda técnica.
---

Revisar: $ARGUMENTS

## Workflow

1. Identificar los archivos relevantes al área indicada
2. Leer `Docs/FEATURE_SPEC.md` secciones correspondientes
3. Comparar implementación actual vs spec
4. Verificar schema via Supabase MCP si hay dudas
5. Reportar hallazgos:
   - ✅ Correcto
   - ⚠️ Discrepancia: spec dice X, código hace Y
   - 🐛 Bug potencial
   - 💡 Mejora sugerida

## NO hacer

- NO modificar código durante la revisión
- NO modificar specs
- Solo reportar hallazgos para que James decida
```

## Paso 5: Crear `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Revisa código antes de commit. Busca bugs, inconsistencias con FEATURE_SPEC, patrones incorrectos, y problemas de UX. Solo lee, nunca modifica.
tools: Read, Grep, Glob
model: sonnet
---

Eres un revisor de código senior para MovimientOS, una app de logística de construcción.

## Qué verificar

### Bugs
- Handlers async sin `useSubmitGuard` o `busyRef` (doble-submit)
- Race conditions en React state
- Queries de Supabase sin error handling
- `'En Tránsito'` con acento (canonical es `'En Transito'` sin acento)
- `Parcial` usado a nivel de solicitud (solo válido a nivel de línea)

### Patrones del proyecto
- Server Components por default, 'use client' solo cuando hay interactividad
- Supabase client correcto (server.ts vs client.ts)
- TypeScript strict (no `any`)
- Tailwind para estilos

### UX
- Botones tienen `disabled` y `loading` durante operaciones async
- Error messages visibles al usuario
- Mobile-friendly (sticky bottom bars, touch targets grandes)

## Formato de respuesta

### 🟢 OK
- [qué está correcto]

### 🔴 Problemas
- [archivo:línea] — [descripción]

### 🟡 Sugerencias
- [mejoras opcionales]
```

## Paso 6: Actualizar workflow en CLAUDE.md

En la sección "## Workflow para Claude Code", reemplazar TODO el contenido con:

```markdown
## Workflow para Claude Code

### Commands disponibles
- `/project:implement-task Docs/TASKS/nombre.md` — Lee un task file y lo implementa paso a paso
- `/project:fix-bug "descripción del problema"` — Diagnostica y arregla un bug
- `/project:review "solicitudes"` — Revisa código contra FEATURE_SPEC

### Subagent disponible
- `code-reviewer` — Revisión read-only de código antes de commit. Invocarlo: "usa el code-reviewer subagent para revisar mis cambios"

### Flujo por tarea
1. Lee `Docs/SYNC_LOG.md` para contexto reciente
2. Lee el task file o entiende el bug
3. Verifica schema via Supabase MCP si es necesario
4. Implementa. `npm run build` después de cada paso.
5. Commit después de cada paso: `feat:`, `fix:`, `docs:` — mensaje descriptivo
6. `/clear` entre tareas no relacionadas. `/compact` al 50% de contexto.
7. Actualizar `Docs/SYNC_LOG.md` al terminar

### CUANDO NECESITES UN CAMBIO DE BD
- STOP. Escribir en `Docs/SYNC_LOG.md`: "Code: SOLICITUD BD — {descripción}. Razón: {por qué}."
- James lo verá y delegará a Chat para ejecutar.

### NUNCA
- No hacer commits ni push a `main`. Solo `jaime/dev`.
- No modificar Feature Spec ni CLAUDE.md (solo Chat los modifica).
- No ESCRIBIR en Supabase. Solo LEER via MCP.
```

## Paso 7: Commit

```
chore: nuevo workflow — commands, agents, y task files

- .claude/commands/: implement-task, fix-bug, review
- .claude/agents/code-reviewer.md: subagent read-only
- Docs/TASKS/: password-recovery.md, fix-dual-button-programacion.md
- CLAUDE.md: workflow section actualizada con commands y subagent
```

---

## Después de este setup, el flujo es:

James dice: `/project:implement-task Docs/TASKS/fix-dual-button-programacion.md`
→ Claude Code lee el task file → ejecuta todos los pasos → commit → done

James dice: `/project:fix-bug "el calendario pierde items cuando filtro por fecha"`
→ Claude Code diagnostica → arregla → commit → done

James dice: `/project:review "programacion"`
→ Claude Code revisa → reporta hallazgos → James decide qué arreglar
