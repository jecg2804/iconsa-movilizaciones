---
name: git-release
description: Promueve jaime/dev a main con validación Vercel, PR squash-merge, tag semver y push. Invocar con /release.
---

# /release — promover jaime/dev a main

Flujo automatizado para sacar un release. No hace cambios destructivos sin
confirmación explícita y siempre deja el repo en estado limpio.

## Precondiciones (chequeos antes de actuar)

Antes de mostrar el plan de release al usuario, verifica:

1. **Working tree limpio** — `git status --porcelain` debe estar vacío.
   Si hay cambios sin commit, mostrar qué falta y parar.
2. **En jaime/dev** — `git rev-parse --abbrev-ref HEAD` debe retornar
   `jaime/dev`. Si no, parar y pedir al usuario que cambie.
3. **Sincronizado con origin** — `git fetch origin jaime/dev` y verificar
   que no hay commits remotos sin pull. Si hay, parar.
4. **Build local verde** — leer `.build-status`. Si dice `fail <HEAD>`,
   parar. Si dice `ok <HEAD>` donde HEAD coincide con `jaime/dev`, OK.
   Si no hay status o es stale, correr `npm run build` sincrónico.
5. **Último deploy Vercel en READY** — usa la tool
   `mcp__claude_ai_Vercel__list_deployments` con `projectId` del proyecto
   MovimientOS y filtra por `githubCommitSha` = HEAD actual de
   `jaime/dev`. El state debe ser `READY`. Si es `BUILDING` o `QUEUED`,
   esperar. Si es `ERROR` o `CANCELED`, parar.

Si alguno falla, **no proceder** — explica el bloqueo al usuario.

## Plan de release (mostrar antes de ejecutar)

Genera un resumen que el usuario pueda aprobar con un "sí":

```
Release plan:
  Source:     jaime/dev @ <SHA corto>
  Target:     main
  Último tag: <last tag desde git tag -l 'v*' | sort -V | tail -1>
  Commits nuevos: <N> (desde último tag)

  Commits a incluir:
    - <hash> <subject>
    - <hash> <subject>
    ...

  Nuevo tag: v2026.MM.DD-N  (N = siguiente número del día)

¿Procedo? (sí / no)
```

Para calcular el nuevo tag: usa fecha de hoy (Panamá timezone), y el
sufijo `-N` es el siguiente número disponible. Ej: si hoy ya hay
`v2026.04.14-1`, el nuevo será `v2026.04.14-2`. Si no hay ninguno de
hoy, empieza en `-1`.

## Ejecución (sólo tras "sí")

1. **Crear PR** con `gh pr create`:
   ```bash
   gh pr create --base main --head jaime/dev \
     --title "Release v{fecha}-{N}" \
     --body "$(cat <<'EOF'
   ## Resumen
   <lista de commits incluidos desde el último tag>

   ## Test plan
   - [ ] Vercel deploy de jaime/dev en READY
   - [ ] Build local verde
   - [ ] Tests E2E relevantes corrieron

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```
   Capturar la URL del PR para mostrársela al usuario.

2. **Pausar para review humano** — mostrar la URL del PR y pedir
   confirmación explícita:
   ```
   PR creado: <url>

   Revísalo en GitHub. Cuando esté listo y aprobado, dime "merge" para
   continuar. Si querés cancelar, dime "cancelar" y cierro el PR.
   ```

3. **Merge squash** — tras "merge":
   ```bash
   gh pr merge <pr-number> --squash --delete-branch=false
   ```
   No borrar jaime/dev — sigue siendo la branch de trabajo.

4. **Tag y push del tag** — NO hace falta checkout main. Fetch el SHA
   actual de origin/main y taggeá ese commit:
   ```bash
   git fetch origin main
   git tag -a v{fecha}-{N} origin/main -m "Release v{fecha}-{N}"
   git push origin v{fecha}-{N}
   ```

5. **Reportar al usuario** — URL del PR mergeado, nombre del tag,
   dashboard de Vercel para monitorear el deploy a producción.

## Qué NO hacer

- **Nunca `git checkout main`** — el flujo entero usa `gh` + `origin/main`
  refs, sin tocar la working tree local.
- **Nunca `git push origin main`** — usa `gh pr merge` para el merge, y
  `git push origin <tag>` solo para el tag.
- **Nunca mergear sin review humano** — siempre pausar tras crear el PR.
- **Nunca taggear antes del merge** — el tag debe apuntar al squash
  commit que creó `gh pr merge`, no al último commit de `jaime/dev`.
- **Nunca reutilizar un tag** — si colisiona con uno existente,
  incrementar el sufijo `-N`.

## Ejemplo de conversación

Usuario: `/release`

Claude:
> Chequeando precondiciones...
> ✅ Working tree limpio
> ✅ En jaime/dev (@989846f)
> ✅ Sincronizado con origin
> ✅ Build local ok
> ✅ Vercel deploy BXQ27J7biHExRZyQfr56Sb5JEFRP en READY
>
> Release plan:
>   Source: jaime/dev @989846f
>   Target: main
>   Último tag: v2026.04.13-2
>   Commits nuevos: 12
>
>   Commits:
>   - 989846f feat: Fase E — audit-gates.spec.ts + CLAUDE.md 47 tablas
>   - 099fe17 fix: alerta_diaria_urgentes referencia 'today' eliminada en C.4
>   - c62a061 docs: Fase C cerrada — 7 sub-fases completas
>   - ...
>
>   Nuevo tag: v2026.04.14-1
>
> ¿Procedo?

Usuario: sí

Claude: (crea PR, muestra URL, pausa)

Usuario: (revisa y aprueba en GitHub) merge

Claude: (mergea, taggea, pushea tag, reporta)
