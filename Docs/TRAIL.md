# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-06-11 (DISCOVERY CERRADO. Directiva del
jefe: finalizar Events V2 + GPS y MERGE = lo más crítico → D1 RESUELTA
(continuar en jaime/dev). Secuencia: harness mínimo → merge track →
harness completo. Doc system juzgado adversarialmente: 4/6 piezas
sobreviven, taxonomía enmendada en juicio-doc-system.md)

## Root task

Llevar movimientOS a producción estable (merge v2) y luego a L5 de
madurez de ingeniería. Documento rector: `Docs/plan-maestro-2026-06.md`
(las fases se re-secuenciaron 2026-06-11: ver Position; el plan se
reescribe en el paquete H1).

## Position actual

```text
HARNESS MÍNIMO → MERGE TRACK → POST-MERGE (harness completo + cola)
 ├─ [✅] DISCOVERY CERRADO (Docs/discovery/ — 7 docs):
 │       canónico + norte + blueprint + transformación digital +
 │       cierre/coverage-ledger + juicio doc-system + cola rediseño
 ├─ [✅] D1 RESUELTA: continuar en jaime/dev (directiva jefe 2026-06-11:
 │       "finalizar Events V2 + GPS y merge" — incompatible con restart)
 ├─ [✅] Doc system validado: 5 tipos + verificación ejecutable como
 │       pieza #0; cola→BACKLOG (fusionar); CHANGELOG a reformar
 ├─ [ ] JAMES: correr SQL pack (39 queries, Docs/sql-diagnostic-pack)
 │       — único prerequisito de su lado para el merge track
 ├─ [ ] S1 — PAQUETE H1: Code prepara doc de decisiones con
 │       recomendación por punto (taxonomía enmendada, C1-C5 scope
 │       mínimo, boundaries Supabase write, poda plugins, fusión cola)
 │       → James ratifica → primeros ADRs
 ├─ [ ] S2-S3 — HARNESS MÍNIMO: (0) verify+typecheck+docs-lint →
 │       (1) CLAUDE.md reescrito vs canónico + AGENTS.md + CHANGELOG
 │       reformado → (2) hooks + reviewers + Supabase write staging +
 │       migrations-as-files. DIFERIDO: plugin interno, evals, CI full
 ├─ [ ] S4+ — MERGE TRACK. DoD del jefe (2026-06-11, verbatim):
 │       Events V2 perfeccionado + lógica del app correcta (cálculos
 │       qty despachadas/entregadas/parciales; estados de solicitud/
 │       movilización correctos en TODO edge case; 4 fulfillment types
 │       funcionales como MVP — INTERNOS falta del todo [diseñar+
 │       construir], pickup, externo; GPS; backlog recibe lo que debe
 │       en el momento adecuado). Vía: script BD consolidado (gates =
 │       SQL pack) → Cambio 6.6 → MVP internos → GPS vs API nueva →
 │       Q15/J6 → smoke matrix por fulfillment → prod → MERGE v2 → tag
 └─ [ ] POST-MERGE (con harness robusto): refinar/refactorizar/features
        nuevos — triage + cola Q1-Q15/M1-M7 + skill GPS (Q14) +
        reportes F3 (el Excel de Charris vive AQUÍ, no en el merge)
```

## Contexto mínimo

- **Estado real del código:** modelo fulfillment = Cambio 5 (tablas
  `pickup_orders`/`external_orders` + `*_order_lines`). El modelo
  Cambio 3 (flag `pickup_by_project`) fue ELIMINADO — referencias a él
  en CLAUDE.md regla #15 y skills están stale (HAR-01, fix en Fase 2).
- **Cisma prod/staging:** prod (44 tablas) corre ledger `humanos_v2_*`;
  staging (51) corre Cambios 2→6.5. Irreconciliables por diff —
  jaime/dev NO es deployable hasta cerrar Fase 0. 266 commits ahead
  de main.
- **Producción hoy:** main en `v2026.04.15-2`, operando (50 SM,
  48 trips, 159 eventos reales).
- **GPS:** MVP construido sobre SkyData (aislado en `/api/gps`);
  ICONSA migra a proveedor nuevo — API aún no disponible (bloqueante
  externo, no gatea el merge per D6).
- **HumanOS:** en pausa consciente. Su roadmap vive en plan §6.

## Reglas de este doc

- Actualizarlo **cada vez que cambio de dirección**.
- Nunca más de 1 página — si crece, comprimir.
- Si este doc y el plan file discrepan, este doc gana.

## Links

- **Plan rector:** `Docs/plan-maestro-2026-06.md`
- **Canon de hallazgos:** `Docs/auditoria-integral-2026-06.md`
- **Canon de bugs:** `Docs/bug-registry-pre-merge.md`
- **BACKLOG:** `Docs/BACKLOG.md` · **CHANGELOG:** `Docs/CHANGELOG.md`
- **Regla de lifecycle:** `.claude/rules/plan-lifecycle.md`
