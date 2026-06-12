# Ciclo de vida de spec files

Regla explícita para manejar specs en `Docs/superpowers/specs/` sin acumular
ruido ni perder contexto arquitectónico histórico. Contraparte de
`plan-lifecycle.md` (que cubre plans) — specs tienen lifecycle distinto
porque capturan decisiones arquitectónicas, no operación.

## Qué es un spec

Documento que captura **por qué** un feature está diseñado así:

- Contexto del problema
- Decisiones arquitectónicas (con razón documentada)
- Scope IN/OUT
- Riesgos y mitigaciones
- Alternativas consideradas y descartadas

Los specs viven en `Docs/superpowers/specs/` y se generan vía el flow
`brainstorming → writing-plans` de Superpowers.

**Diferencia con plans:** los plans dicen **cómo ejecutar** (secuencia de
tasks); los specs dicen **qué se decidió y por qué**. Plans son
operativos y efímeros; specs son arquitectónicos y persistentes.

## Frontmatter obligatorio

Todo spec debe abrir con frontmatter YAML declarando su estado:

```yaml
---
status: draft | in-progress | shipped | deprecated
feature: 
shipped_commits: 
deprecated_reason: 
---
```

**Valores de `status`:**

- **`draft`**: brainstorming cerrado, spec en redacción, no aprobado aún por James.
- **`in-progress`**: aprobado por James, feature en implementación activa.
- **`shipped`**: feature commiteado y verificado. Campo `shipped_commits` obligatorio con hash o rango (ej. `186e7b0..2aed66b`).
- **`deprecated`**: feature revertido, reescrito, o abandonado. Campo `deprecated_reason` obligatorio con razón breve.

**Por qué frontmatter y no subfolders:** mover archivos entre folders
`archived/` y `active/` requiere disciplina continua que se olvida (mismo
bug de disciplina que TRAIL tuvo pre-audit). Frontmatter vive en el file,
nadie lo tiene que mover, repomix lo indexa, humanos lo ven al abrir.

## Criterio de persistencia post-shipping

Al shippear un feature, decidir si el spec persiste o se borra:

**Mantener (flip `status: shipped`) si:**
- Spec tiene sección §Arquitectura con 2+ decisiones documentadas.
- Contiene análisis de alternativas descartadas.
- Captura contexto de negocio o de dominio no obvio desde el código.
- Es útil como referencia histórica para features derivados o debugging
  futuro.

**Borrar si:**
- Spec es solo scope list + criterios de aceptación (sin razonamiento).
- El código + CHANGELOG + tests documentan todo lo relevante.
- El feature es trivial (bugfix puntual, UI micro-ajuste).

En caso de duda, **mantener**. Costo de mantener un spec obsoleto es bajo
(markdown en folder); costo de perder contexto arquitectónico es alto.

## Qué hacer al shippear

1. Verificar que el feature está en CHANGELOG con entry `[feat]`.
2. Editar frontmatter del spec:
   - `status: shipped`
   - Agregar `shipped_commits: <hash o rango>` con los commits que shippearon el feature.
3. Commitear el cambio del frontmatter junto con el `[feat]` entry del
   CHANGELOG (mismo commit), o inmediatamente después.

Si el spec califica para borrado per el criterio de arriba, borrarlo en
lugar de flipear status.

## Qué hacer cuando un spec queda obsoleto

Si el feature fue revertido, reescrito desde cero, o abandonado:

1. NO borrar inmediatamente — la historia del diseño puede ser valiosa.
2. Flipear `status: deprecated`.
3. Agregar `deprecated_reason` con texto breve (ej. "feature abandonado
   tras decisión de X", "reemplazado por Y en spec Z").
4. **Criterio de delete eventual:** solo cuando el feature fue
   completamente removido del código Y pasaron 90+ días sin reactivación.

## Cuándo crear un spec

- Feature nuevo o rediseño con 3+ commits esperados (mismo umbral que
  plans).
- Para features triviales (1 archivo, obvio), saltear el spec — va
  directo a plan si aplica, o implementación directa.
- El flow es `brainstorming → writing-plans`: `brainstorming` produce el
  spec, `writing-plans` genera el plan ejecutable.

## Qué contiene un spec (y qué NO)

**Sí:**
- Contexto del problema (por qué existe el feature)
- Decisiones arquitectónicas con razón
- Alternativas consideradas y descartadas
- Scope IN/OUT explícito
- Riesgos identificados y mitigaciones
- Referencias a otros specs o docs relevantes

**NO:**
- Secuencia de tasks con pasos concretos (eso es el plan)
- Código de implementación (salvo pseudocódigo para ilustrar decisiones)
- Historia de ejecución o debugging (eso vive en CHANGELOG)

## Integración con el workflow

- Al cerrar un feature, actualizar en el mismo commit: frontmatter del
  spec (status: shipped) + CHANGELOG entry + TRAIL si cambia posición.
- Plans del mismo feature se borran al shippear (ver `plan-lifecycle.md`).
  Specs NO — siguen el criterio de arriba.
- Repomix indexa specs con frontmatter. Status `shipped` y `deprecated`
  son filtrables visualmente para humans.

## Qué NO hacer nunca

- Nunca borrar un spec sin flipear antes a `deprecated` con razón.
- Nunca dejar un spec shipped con `status: draft` o `in-progress` — es
  mentira sobre el estado.
- Nunca usar el spec como to-do list o plan — mezclar specs con plans
  acumula ruido en ambos artefactos.
- Nunca dejar `shipped_commits` vacío cuando `status: shipped`.
