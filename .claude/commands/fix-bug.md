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
