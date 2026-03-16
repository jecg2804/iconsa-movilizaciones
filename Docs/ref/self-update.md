# Skill: Self-Update Documentation

Cuándo y cómo mantener los documentos sincronizados con la realidad.

## Cuándo actualizar

### Después de cada paso implementado
1. **SYNC_LOG.md** — Qué se implementó, discrepancias encontradas, solicitudes de BD
2. **BUGS.md** — Si encontraste un bug, documentarlo con #, descripción, fecha, commit

### Cuando encuentres discrepancias
- Si FEATURE_SPEC.md o SPEC.md dicen algo diferente a lo que hay en BD o código:
  → Escribir en `.claude/suggestions.md` (Tier 1, no modificar directamente)
- Si ROADMAP.md tiene un item ya completado:
  → Marcarlo como completado (Tier 2, puedes editar)

## Formato SYNC_LOG

```markdown
## YYYY-MM-DD — Code: {título breve}

{N} archivos modificados (commit {hash}):
- `archivo1.ts`: {qué cambió}
- `archivo2.tsx`: {qué cambió}

### Discrepancias encontradas
- {lo que dice el doc} vs {lo que hay en realidad}

### SOLICITUD BD (si aplica)
Code: SOLICITUD BD — {descripción}. Razón: {por qué}.
```

## Formato BUGS

```markdown
| # | Bug | Fecha | Commit |
|---|-----|-------|--------|
| {N} | {descripción breve} | YYYY-MM-DD | {hash} |
```

## Formato suggestions.md

```markdown
Fecha: YYYY-MM-DD
Archivo: Docs/{archivo}
Dice: {lo que dice actualmente}
Debería decir: {lo correcto}
Razón: {por qué}
```
