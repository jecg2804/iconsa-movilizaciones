---
name: self-update
description: Cómo mantener SYNC_LOG.md y BUGS.md sincronizados después de cada paso implementado.
---

# Skill: Self-Update — Mantener documentación sincronizada

Claude Code debe mantener la documentación actualizada como parte de su flujo normal.

## Después de cada paso completado

1. Escribir en `Docs/SYNC_LOG.md`:
   - Qué se implementó
   - Si se encontró alguna discrepancia con los specs
   - Si se necesita un cambio de BD (para que James lo delegue a Chat)

2. Si encontraste un bug → documentar en `Docs/BUGS.md`

## Cuando descubras una discrepancia

Si el código no coincide con CLAUDE.md o Docs/FEATURE_SPEC.md:
1. NO modifiques el spec
2. Escribe en `Docs/SYNC_LOG.md`: "Code: Discrepancia — {spec} dice X, código hace Y, razón: Z"

## Cuando necesites un cambio de BD

Claude Code puede LEER Supabase (via MCP read-only) pero NO puede escribir.
1. Escribe en `Docs/SYNC_LOG.md`: "Code: SOLICITUD BD — {descripción del cambio}. Razón: {por qué}."
2. James lo verá y delegará a Chat para ejecutar
3. Chat escribirá confirmación en SYNC_LOG.md
4. Tú verificas leyendo Supabase y continúas

## Formato de SYNC_LOG.md

```markdown
## {fecha} — Code: {descripción breve}
- Qué se hizo
- Archivos modificados
- Discrepancias encontradas (si hay)
- Solicitudes de BD (si hay)
```
