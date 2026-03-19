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
