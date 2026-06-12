# Commits y push en branch de desarrollo

## Política

Claude Code hace commits automáticamente en `jaime/dev` después de cada
step completado. James ejecuta `git push` manualmente cuando decide que
el batch está listo para remote.

**Resumen:**
- ✅ Code commitea (atómico, por step)
- ❌ Code NO pushea — ni `jaime/dev`, ni ninguna branch
- ✅ James pushea cuando decide (checkpoint manual antes de que Vercel/CI vea)

Esta política complementa a `git-workflow.md`, que define la política
permanente de branches, tags, releases, y enforcement layers.

## Razón

- **Commits atómicos** permiten bisect + trazabilidad sin overhead de
  aprobación por commit individual.
- **Push manual por James** es checkpoint natural: James revisa el batch
  completo antes de que el remote (y Vercel) lo vean.
- **Previene push accidental** de trabajo a medio cocinar o con
  regresiones sutiles.

## Después de cada paso completado

1. `git add <archivos>` + `git commit -m "mensaje"` (convenciones en
   `git-workflow.md`).
2. El hook `post-commit` de Husky lanza `npm run build` en background
   automáticamente. Si el build falla, la siguiente operación git te lo
   muestra.
3. Continuar al siguiente paso sin esperar aprobación.
4. **Si el paso involucró cambios en docs vivos** (CHANGELOG, TRAIL,
   BACKLOG), incluir esas actualizaciones en el mismo commit.

## Formato de commits

Ver `git-workflow.md` (prefijos, mensaje, atomicidad).

## Qué puede Code hacer

- ✅ `git add`, `git commit` (con mensaje y atomicidad correctos)
- ✅ `git status`, `git diff`, `git log` (lectura siempre)
- ✅ `git checkout -b <branch>` si necesita aislar trabajo
- ✅ `git branch -d <branch>` (local, branch mergeada)

## Qué NO puede Code hacer

- ❌ `git push` (cualquier branch, cualquier flag) — James lo hace
- ❌ `gh pr create` (es push implícito)
- ❌ Merges que involucren push al remote
- ❌ `--amend` a commits que podrían haber sido pusheados por James
- ❌ `--no-verify` para bypass de hooks
- ❌ Commits a `main` (ver `git-workflow.md`)

## Al terminar una tarea grande (multi-commit)

1. Summary de qué se commiteó (files + commit messages).
2. Output de `git log origin/jaime/dev..HEAD --oneline` para mostrar a
   James qué hay local no pusheado.
3. James ejecuta push cuando decide.

## Enforcement técnico

Los deny patterns en `.claude/settings.json` bloquean `git push origin *`
para Code. Si un patrón falla o se actualizó el settings y permite push,
esta rule es documental — el Git client de Code no debe pushear
independiente del enforcement.
