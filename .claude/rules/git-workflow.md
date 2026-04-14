# Git workflow — política y enforcement

Política completa de branches, commits, tags y releases para MovimientOS.
Esta regla documenta lo que está permitido y denegado. El enforcement técnico
está en `.claude/settings.json` (deny patterns para Claude Code), `.husky/`
(hooks para commits manuales desde terminal), y la protección de branch en
GitHub (backstop final, aplica a cualquier actor).

## Branches

- **`main`** — estable, solo código aprobado. Protegida en GitHub. Nunca recibe
  pushes directos. Solo recibe merges via PR aprobado desde `jaime/dev`, o
  cherry-picks específicos para hotfixes. Protected en GitHub: no force push,
  no delete, requiere status check de Vercel en verde.
- **`jaime/dev`** — branch de trabajo de James. Claude Code hace commits y push
  directamente aquí con cada paso completado. Es la fuente de verdad para
  desarrollo activo.

Otras branches (`andy/dev`, feature branches) no existen en el workflow actual.

## Commits

- **Prefijo obligatorio** (español): `feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`, `test:`, `bd:`, `audit:`.
- **Mensaje en español**, imperativo, breve. Multilinea OK cuando hay contexto.
- **Atómicos** — un paso lógico por commit, no acumular 3-4 fixes en uno.
- **Firmados por Claude cuando aplica** — el footer `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` va en los commits que yo ejecuto.
- **NUNCA `--no-verify`** — los hooks de Husky existen para atrapar errores.
  Si un hook falla, investigar y arreglar la causa, no bypasear.
- **NUNCA `--amend` a un commit ya pusheado** — crear commit nuevo. `--amend`
  solo vale en commits locales no-pusheados (rarísimo en este workflow).

## Push

- **`git push origin jaime/dev`** — permitido para Claude Code y James.
- **`git push origin main`** — DENEGADO. Solo GitHub lo acepta via merge de PR.
- **`git push --force`** / **`-f`** — DENEGADO en ambas branches. Si hay que
  corregir historial, se usa `git push --force-with-lease` con confirmación
  explícita de James.

## Tags y releases

- **Formato de tag**: `v{YYYY}.{MM}.{DD}-{N}` — ej. `v2026.04.14-1`. El sufijo
  `-N` se incrementa si hay múltiples releases el mismo día.
- **Cuándo taggear**: solo después de merge a `main` exitoso, con Vercel en
  verde en producción. Nunca taggear en `jaime/dev`.
- **Quién taggea**: Claude Code vía el skill `/release` (ver
  `.claude/skills/git-release.md`). James puede taggear manualmente si
  prefiere.

## Releases — el skill `/release`

`/release` es el flujo automatizado para promover `jaime/dev` a `main`. Ver
`.claude/skills/git-release.md` para el detalle. El flujo resumido:

1. Verificar que `jaime/dev` está limpio (sin cambios sin commit).
2. Verificar que `npm run build` pasa localmente.
3. Verificar que el último deploy de `jaime/dev` en Vercel está en `READY`.
4. Crear PR `jaime/dev → main` con resumen de commits desde el último tag.
5. Esperar aprobación de James en GitHub.
6. Merge (squash, no merge commit).
7. Tag semver en `main` con `v{fecha}-{N}`.
8. Push del tag a origen.
9. Dejar `jaime/dev` limpio para seguir trabajando.

## Hotfixes

- Hotfix de prod = cherry-pick del commit específico desde `jaime/dev` a `main`.
- No crear branches `hotfix/*` temporales a menos que James lo pida.
- El cherry-pick requiere el mismo gate que un release: Vercel verde, PR
  aprobado por James, tag incremental.

## Deny patterns vigentes (Claude Code)

Ver `.claude/settings.json`. Los patrones denegados relevantes a Git:

- `Bash(git push origin main*)` — cualquier push a main
- `Bash(git push --force*)` / `Bash(git push -f*)` — force push
- `Bash(git commit --no-verify*)` — bypass de hooks
- `Bash(git branch -D main*)` — delete main
- `Bash(git reset --hard*)` — hard reset (destructivo)
- `Bash(git rebase -i*)` — rebase interactivo (requiere confirmación humana)

Si alguna de estas se necesita legítimamente, James la ejecuta manualmente en
su terminal — yo no.

## Enforcement layered

| Layer | Cubre | Tool |
|---|---|---|
| Documental | Claude razona | `.claude/rules/git-workflow.md` (este) |
| Tool deny | Claude ejecuta | `.claude/settings.json` |
| Git client | Cualquier commit local | `.husky/pre-commit`, `pre-push`, `post-commit` |
| GitHub server | Cualquier push remoto | Branch protection en `main` |

Sin los 4 layers siempre queda un hueco. Los 4 juntos hacen que sea
imposible romper la política, incluso accidentalmente.
