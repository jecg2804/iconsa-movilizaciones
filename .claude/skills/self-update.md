---
name: self-update
description: Cómo mantener CHANGELOG.md actualizado después de cada commit.
---

# Skill: Self-Update — Mantener CHANGELOG actualizado

## Después de cada commit

Agregar entry en `Docs/CHANGELOG.md` con formato:
```
- [feat|fix|docs|chore] Descripción breve (hash)
```

Bajo la fecha de hoy. Si no existe sección para hoy, crearla.

## Si necesitas un cambio de BD

1. Agregar en CHANGELOG.md: `- [bd-pending] {descripción}. Razón: {por qué}.`
2. James lo verá y delegará a Chat para ejecutar
3. Cuando esté hecho, cambiar tag a `[bd]`

## Si encuentras una discrepancia con FEATURE_SPEC

NO modificar el spec. Agregar en CHANGELOG.md:
```
- [discrepancia] FEATURE_SPEC dice X, código hace Y. Razón: Z.
```
