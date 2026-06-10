# Trail activo — MovimientOS

> **Qué es este doc:** single-page view de dónde estamos en la jerarquía
> de tareas. Se actualiza cada vez que cambiamos de dirección. Lo
> autocargo al inicio de cada sesión para recuperar el hilo sin leer
> todo el plan file.

**Última actualización:** 2026-06-10 PM (fase DISCOVERY en curso —
decisión rectora de James: harness-first, "sin un buen harness ni
quiero tocar nada del código". D1 re-ABIERTA pendiente de discovery)

## Root task

Llevar movimientOS a producción estable (merge v2) y luego a L5 de
madurez de ingeniería. Documento rector: `Docs/plan-maestro-2026-06.md`
(OJO: D1 degradada a pregunta abierta; las fases 0-5 del plan se
re-secuencian POST-discovery con la decisión harness-first).

## Position actual

```text
DISCOVERY → HARNESS → DISEÑO/CÓDIGO  (orden decidido por James 2026-06-10)
 ├─ [✅] Auditoría integral 2026-06-03 + bug-registry (Cambio 6.6)
 ├─ [✅] Comparación harness HumanOS + scorecard madurez 9 dims
 ├─ [✅] Discovery 360° (17 agentes + crítico) → Docs/discovery/
 │       (canónico + norte + harness blueprint v0 + caveats)
 ├─ [✅] Visión de James capturada (memoria): plataforma de taller,
 │       BD centralizada multi-ERP, inventario, usuarios=todos,
 │       data de prod=parcialmente ficción (cirugía SQL manual)
 ├─ [⏳] Cierre de huecos (workflow corriendo): main branch (0%→100%),
 │       src restante, funciones BD reconstruidas + SQL PACK para
 │       James/Chat, corpus EQUIPO/LOGISTICA (lectura 100% obligatoria)
 ├─ [⏳] Research: transformación digital/AI/data eng en construcción
 ├─ [ ] FASE HARNESS: decisiones C1-C8 del blueprint + Supabase
 │       write-access para Code (modelo HumanOS, Chat fuera del
 │       workflow) + hooks + AGENTS.md + verify + docs-lint + CI
 ├─ [ ] Diseño/código con referencia = líderes del mercado
 │       (fulfillment 4 tipos, UX Charris, tarifas, facturación)
 └─ [ ] Merge v2 cuando DoD se cumpla (plan §2, a refinar post-harness)
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
