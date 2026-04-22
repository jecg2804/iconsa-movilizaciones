---
name: fix-bug
description: Arreglar un bug acotado (1-2 archivos). Para bugs de 3+ archivos, usar systematic-debugging de Superpowers.
---

Diagnosticar y arreglar el siguiente bug: $ARGUMENTS

## Cuándo usar este comando

Bug reproducible, scope acotado (1-2 archivos). Root cause probable es obvio o se identifica rápido.

**Si el scope crece a 3+ archivos durante el diagnóstico**: escalar a `systematic-debugging` de Superpowers (ver `.claude/rules/tool-usage.md`).

## Workflow

1. Entender el bug: leer la descripción, reproducir mentalmente el flujo.
2. Localizar los archivos relevantes (Grep / Glob).
3. Si el bug toca BD, verificar schema/data vía Supabase MCP.
4. Identificar root cause — no asumir, verificar.
5. Implementar el fix mínimo — sin refactors oportunísticos.
6. `npm run build` (o esperar que el post-commit hook lo corra en background).
7. Commit: `fix: bug #N — descripción breve` o `fix: descripción breve`.
8. Entry en `Docs/CHANGELOG.md` en el mismo commit.
9. Si el bug revela patrón o items pendientes, agregar a `Docs/BACKLOG.md`.

## Reglas

- Si el mismo patrón de bug afecta otros puntos del app, mencionarlo en el commit y en BACKLOG.
- Si el fix requiere cambio de BD → entry `[bd-pending]` en CHANGELOG + PARAR (ver `.claude/rules/supabase-readonly.md`).
- Si descubrís bugs adicionales durante el fix, **no los arregles en el mismo commit** — documentá en BACKLOG y resolve después.
- El fix no puede introducir regresión en `npm run build`.
