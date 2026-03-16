# Rule: Document Tiers

Los documentos del proyecto tienen niveles de acceso para Claude Code.

## Tier 1 — Solo Chat modifica
- `Docs/FEATURE_SPEC.md` — Reglas de negocio, pantallas, validaciones
- `Docs/SPEC.md` — Schema, triggers, funciones, decisiones técnicas

Si encuentras una discrepancia entre estos docs y la realidad (BD o código), **no los modifiques**. En su lugar:
1. Escribe en `.claude/suggestions.md` con formato:
   ```
   Fecha: YYYY-MM-DD
   Archivo: Docs/FEATURE_SPEC.md (o SPEC.md)
   Dice: {lo que dice actualmente}
   Debería decir: {lo correcto}
   Razón: {por qué}
   ```
2. James lo revisará con Chat.

## Tier 2 — Code puede actualizar
- `Docs/SYNC_LOG.md` — Escribir después de cada paso implementado
- `Docs/BUGS.md` — Documentar bugs encontrados y resueltos
- `Docs/ROADMAP.md` — Marcar items completados (no cambiar prioridades ni agregar items nuevos)

## Tier 3 — Code puede crear/editar libremente
- `.claude/suggestions.md` — Sugerencias a Tier 1
- `.claude/skills/*.md` — Patrones de implementación
- Código fuente (`src/`)
- Archivos de configuración del proyecto
