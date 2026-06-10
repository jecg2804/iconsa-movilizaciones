# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-06-10 (Plan Maestro adoptado — secuencia
unificada hacia merge v2; auditorías huérfanas commiteadas)

## Root task

Llevar movimientOS a producción estable (merge v2) y luego a L5 de
madurez de ingeniería. Documento rector: `Docs/plan-maestro-2026-06.md`.

## Position actual

```
Plan Maestro (Docs/plan-maestro-2026-06.md)
 ├─ [✅] Auditoría integral 2026-06-03 (50+ findings, 6 fases)
 ├─ [✅] Bug-registry pre-merge (42 bugs, scope Cambio 6.6 acordado)
 ├─ [✅] Comparación harness HumanOS + scorecard madurez (2026-06-10)
 ├─ [✅] Decisiones D1-D7: NO restart desde main; merge v2 = final del
 │       ciclo con Definition of Done; un repo a la vez; multi-schema
 │       medallion como target (Fase 4); GPS no bloquea merge (recom.)
 ├─ [⏳] Siguiente: spec canónico del state-machine (anti-alucinación,
 │       input de todas las fases)
 ├─ [⏳] FASE 0 — Integridad para el merge (BLOQUEANTE):
 │       migraciones versionadas + script BD consolidado + decisión
 │       James (promover Cambios 2-6.5 a prod vs reconstruir staging)
 │       + credenciales + confirm_delivery RPC + RBAC proxy
 ├─ [ ] FASE 1 — Atomicidad (split trigger/RPC/Action) + Cambio 6.6
 ├─ [ ] FASE 2 — Gates (tsc, pgTAP, CI) + harness [HUM] (hooks,
 │       AGENTS.md, constitution, ADRs, vitest, subagents revisores)
 ├─ [ ] ═══ MERGE v2 (DoD en plan §2) → trunk-based ═══
 ├─ [ ] FASE 3 — SOP IC-LOG-PO-06 + UX quick wins (post-merge)
 ├─ [ ] FASE 4 — Plataforma datos multi-schema + Inspecciones
 └─ [ ] FASE 5 — Expansión de módulos (clusters)
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
