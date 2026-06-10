# Plan Maestro — MovimientOS hacia L5 (2026-06-10)

> **Qué es este doc:** el documento RECTOR de secuencia. Reconcilia la
> auditoría integral (2026-06-03), el bug-registry pre-merge (Cambio 6.6),
> la comparación de harness con HumanOS y el scorecard de madurez vs
> gold-standard (ambos 2026-06-10), y las decisiones estratégicas de James.
>
> **División de canon:**
> - `Docs/auditoria-integral-2026-06.md` → canon de HALLAZGOS (50+ findings verificados, §1-§18)
> - `Docs/bug-registry-pre-merge.md` → canon de BUGS (42 activos, scope Cambio 6.6)
> - **Este doc** → canon de SECUENCIA y decisiones estratégicas
> - `Docs/TRAIL.md` → posición actual (se actualiza con cada cambio de dirección)

---

## 1. Decisiones estratégicas (sesión 2026-06-10, pendientes de ratificación final de James)

| # | Decisión | Rationale |
|---|---|---|
| D1 | **NO reiniciar desde main.** Se continúa sobre `jaime/dev`. | Los 266 commits contienen meses de descubrimiento de edge cases verificado (Events V2, Cambios 1-6.5, entregas parciales). Un restart no resuelve los bloqueantes reales (diseño fulfillment, GPS, bugs) y staging ya corre el schema de Cambio 6.5 — el código de main ni siquiera corre contra staging. Rebuilds ACOTADOS por subsistema (guiados por spec) sí están permitidos. |
| D2 | **El merge v2 es el FINAL del ciclo, no el inicio.** Gate = Definition of Done (§2). | jaime/dev no está "apto para producción": faltan decisiones de diseño + Cambio 6.6 + GPS. Mergear antes rompería prod (`PGRST204` por el cisma) y violaría la regla de oro de la auditoría (Fase 0 cierra antes de cualquier merge). |
| D3 | **Un repo a la vez.** movimientOS es el paciente; HumanOS queda en pausa consciente (su roadmap en §6). | movimientOS es el sistema en producción y el que está trabado. HumanOS ya cumplió su rol de donante de patrones. |
| D4 | **Arquitectura objetivo = multi-schema medallion** (auditoría §13). Responde la preocupación de James sobre el schema único. | `raw/staging/masterdata/movilizaciones` + `public` como fachada (vistas + RPCs). Probado en la misma BD (`hr.*` ya funciona así). Cierra de raíz SEC-01/02/04. Se ejecuta en Fase 4, NO antes del merge. |
| D5 | **Seguridad = gate de fase, no incidente.** (James 2026-06-10: apps internas, threat model bajo.) | Los items SEC se ejecutan dentro de Fase 0 porque son baratos y van en el mismo script BD — pero sin tratamiento de pánico. Nota: SEC-01 (entrega forjable) es integridad de NEGOCIO ante usuarios internos (regla #15), no solo "seguridad". |
| D6 | **GPS NO bloquea el merge** (recomendación, James decide). | El proveedor nuevo es bloqueante externo sin timeline (GPS-01). El adaptador SkyData actual está bien aislado y funciona. Recomendado: mergear con SkyData, swap del proveedor post-merge detrás de la misma interfaz. |
| D7 | **Meta de largo plazo: ambos repos a L5** del scorecard (§5). | El gap dominante es "documentado-pero-no-enforzado": convertir reglas en gates deterministas (hooks, CI, tests, RPCs). |

## 2. Definition of Done del merge v2 (qué significa "apto para producción")

1. **Fase 0 completa:** migraciones versionadas + script BD consolidado aplicado en prod + credenciales rotadas (password admin, SkyData key) + `confirm_delivery` RPC server-side + RBAC gate en proxy + SEC-13 verificada (policy UPDATE de people, vía Chat) + REVOKE de `recalc_qty_for_line`.
2. **Cambio 6.6 implementado:** los 30+8 findings del bug-registry (incluye recalc 7 ramas que resucita 'Programada' (F#28), `cancel_solicitud_close_short` RPC (F#13), exclusividad fulfillment). Esto ES el "fulfillment bien desarrollado" — las resoluciones ya están acordadas en el registry.
3. **Gates mínimos activos:** `tsc --noEmit` en pre-push + pgTAP cubriendo recalc/cascade/RPCs nuevos + política de lint decidida (los 18 errores actuales).
4. **GPS:** decisión D6 ratificada (mergear con SkyData) o API del proveedor nuevo integrada.
5. **J5 / diseño overarching de eventos:** cerrado o diferido explícitamente a post-merge.
6. **Smoke funcional** de los 3 fulfillment types en staging + advisor de seguridad limpio de los items Fase 0.
7. **Orden estricto:** script BD en prod ANTES del merge de código.

## 3. Secuencia unificada de fases

Adopta las Fases 0-5 de la auditoría integral (§17) como columna vertebral,
enriquecidas con los ports de HumanOS (marcados `[HUM]`) y el scorecard.
Fases 0-2 (núcleo) son pre-merge; el resto post-merge.

### FASE 0 — Integridad para el merge (BLOQUEANTE) — siguiente acción
- Versionar migraciones: extraer cada `[bd]` del CHANGELOG → `supabase/migrations/<ts>_*.sql`; invertir la regla "el proyecto NO usa migraciones" en `supabase-readonly.md`. **Decisión James:** promover Cambios 2-6.5 a prod (script consolidado) vs reconstruir staging.
- Script BD consolidado: Cambios 2→6.5 + GPS bootstrap + RLS pickup/external + `qty_dispatched`/`qty_rejected` + audit-trigger expansion (2026-05-13).
- Credenciales: rotar password admin (en 4 archivos de tests → env vars con skip-when-absent) + SkyData key (+ placeholder en `.env.local.example`); `must_change_password` a `app_metadata`/`people`.
- `confirm_delivery` RPC con validación server-side del código; dejar de SELECTear `confirmation_code` para roles que confirman.
- RBAC server-side en `proxy.ts` (`canAccess`); SEC-13 (Chat lee policy de people); `REVOKE EXECUTE` de las 19 funciones DEFINER.

### FASE 1 — Atomicidad + Cambio 6.6
- Split de 4 capas (auditoría §5.2): **triggers = invariantes (no tocar) / RPC INVOKER = transacción de dominio / Server Action = orquestación + Zod + email / app = UI**. Anti-patrón a evitar: RPCs DEFINER que reimplementan invariantes.
- P1: `cancel_solicitud_close_short`, `confirm_delivery`, `create_pickup_order`/`create_external_order`. P2: dispatch/revert/complete/saveTrip.
- Todo el scope Cambio 6.6 del bug-registry (recalc 7 ramas, error-checks en loops, cancellation_reason a orders, NOTIF-01/02/03).
- Query diagnóstica BL-EXCLUSIVITY en prod → constraint de exclusividad.

### FASE 2 — Quality gates + harness anti-alucinación `[HUM]`
- `tsc --noEmit` en pre-push (2 líneas, ROI máximo) + fix `sol` + política sobre los 18 lint (los 16 de purity re-habilitan React Compiler).
- pgTAP como base (1.3.3 disponible): migrar los 4 specs BD-direct; cobertura RLS con roles reales (no service-role). Resolver BL-E2E-AUTH-BLOCKED (hipótesis: Sentry tunnelRoute — HumanOS sin tunnel funciona headless).
- `[HUM]` Hooks de Claude Code: SessionStart (reinyecta reglas críticas), PostToolUse (tsc debounced — cierra el gap Fase C.4), PreCompact (HANDOFF.json), Stop (verify reminder) + tests de regresión de hooks.
- `[HUM]` AGENTS.md (entry delgado para Codex), CI `verify.yml` en GitHub Actions (post-cisma — antes daría falsa confianza), capa vitest para lógica pura (qty/estados/timezone), subagents revisores read-only (`rls-reviewer`, `bd-change-reviewer` adaptados al workflow [bd]).
- `[HUM]` PROJECT_CONSTITUTION split + ledger ADR (`Docs/adr/` — backfill ~12 decisiones load-bearing: pickup ×3, cost-code, tarifa, código confirmación, D1-D7 de este plan).
- **Spec canónico del state-machine** (extraído de auditoría §4 + bug-registry + código) como doc de referencia cargable — la pieza central anti-alucinación. Refresh de CLAUDE.md/TRAIL/skills al modelo Cambio 5 (HAR-01).
- Type-gen robusto: `database.gen.ts` (generado) + barrel manual; piloto Server Components en `solicitudes`; descomposición god-files EN TÁNDEM con Server Actions (8 archivos >1000 líneas).

### → MERGE v2 (cuando §2 esté completo) → de ahí en adelante trunk-based, branches cortos.

### FASE 3 — SOP IC-LOG-PO-06 + UX (post-merge)
- Quick wins UX (auditoría §7.2: token gold roto, tap-targets 44px, voseo ×3, offset sidebar, truncate, date min, contraste, errores cascade inline).
- Estructurales: toasts (`sonner`), focus-trap/ARIA en 8 modales, LineRow colapsable mobile.
- SOP: Bitácora IC-LOG-F-06-04 exportable con combustible (requiere decisión de librería PDF/Excel), regla devolución §5.21, Two Week Look-Ahead distribuible, gate aprobación Ingeniero.

### FASE 4 — Plataforma de datos (multi-schema medallion) + Inspecciones
- Schemas `raw/staging/masterdata/movilizaciones` + public como fachada; `REVOKE GRANT ALL`; compat layer de vistas (`security_invoker`). UNIQUEs de external-ids (MD-02), `entity_crosswalk`, `person_type`, provenance columns.
- Spectrum a Edge Function + vault + pg_cron (backfill 41 projects / 43 equipment); GPS proveedor nuevo detrás del adaptador actual.
- Módulo 1: **Inspecciones** (cierra R11; las 22 tablas scaffolding reciben sus RLS policies por módulo a medida que se cablean — hoy son deny-all sin exposición práctica).

### FASE 5 — Expansión de módulos
- Combustible → Mantenimiento → Gestión 360° → Equipos menores/Custodia (clusters de auditoría §15). Facturación IC-LOG-06-05. Dominios nuevos como apps separadas.

## 4. Qué bloquea qué (dependencias críticas)

```
Script BD consolidado ──► aplica a prod ──► merge v2 ──► trunk-based
Cambio 6.6 (bugs+RPCs) ──┘                    ▲
Gates mínimos (tsc/pgTAP) ────────────────────┘
Spec canónico state-machine ──► toda implementación posterior alucina menos
CI verify.yml ──► REQUIERE cisma resuelto (si no, falsa confianza)
Multi-schema (Fase 4) ──► REQUIERE migraciones versionadas + RPCs (Fases 0-1)
GPS proveedor nuevo ──► bloqueante EXTERNO; no gatea el merge (D6)
```

## 5. Scorecard de madurez vs gold-standard (2026-06-10, números verificados por crítico adversarial)

| Dimensión | HumanOS | movimientOS | Meta |
|---|:---:|:---:|:---:|
| Harness AI-assisted dev | 4 | 3 | 5 |
| Arquitectura & código | 4 | 2 | 5 |
| BD, RLS & migraciones | 4 | 2 | 5 |
| Seguridad & secretos | 4 | 2 | 5 |
| Testing & QA | 4 | 2 | 5 |
| CI/CD & release | 3 | 1 | 5 |
| Observabilidad & perf | 3 | 3 | 5 |
| Docs, ADR & SDLC | 4 | 3 | 5 |
| Dependencias & config | 3 | 2 | 5 |

Números corregidos clave (el crítico verificó en vivo): advisors prod public = 22 `rls_enabled_no_policy` (scaffolding vacío, deny-all, sin exposición práctica hoy) + 4 `function_search_path_mutable` + 2 `rls_policy_always_true`; 51/62 componentes `'use client'` (no 62/62); 8 god-files >1000 líneas (no 5). El L5 que NINGUNO tiene: eval set de 20-50 tareas derivadas de fallos reales, re-corrido cuando cambian modelo/instrucciones/hooks.

**Donde movimientOS ya es MEJOR que HumanOS (no regresionar):** enforcement git en capas (deny-patterns + Husky cubre cualquier cliente git), skill `/release` con gate Vercel + semver, posture Supabase read-only por deny de tools, entries `[bd]` con rollback + queries de verificación, trio TRAIL/CHANGELOG/BACKLOG con lifecycle rules, React Compiler + versiones pinneadas, tunnelRoute de Sentry.

## 6. HumanOS — roadmap aparcado (ejecutar después, o quick-wins sueltos)

- **Quick wins:** deny-list de tools mutantes de Supabase (copiar las 11 de mov), tunnelRoute Sentry, SHA-pin GitHub Actions, montar speed-insights, resolver los 9 lints payroll.
- **High value:** `.husky/` git net (sus hooks PowerShell solo cubren Claude Code en Windows), **pinnear deps exactas (next/react flotan con caret — su gap #1)**, cablear pgTAP/E2E al CI, salir del branch largo `overnight/*` hacia main deployable, migraciones via pipeline.
- **Estratégico:** Node pin ×3, React Taint API para PII, posture `use cache` Next 16, podar CHANGELOG-como-diario.
- **NO portar hacia mov:** su flujo de Claude-escribe-DDL (mov mantiene read-only), STATUS.md único (mov tiene trio diferenciado), skills-lock vendoring.

## 7. Próximos pasos inmediatos

1. ✅ Commitear los docs huérfanos (auditoría integral, bug-registry, audits C/D) + este plan + TRAIL refresh. *(esta sesión)*
2. Extraer el **spec canónico del state-machine** (Fase 2 adelantada — es input de todas las fases; fuentes: auditoría §4, bug-registry resoluciones, FEATURE_SPEC, código/triggers).
3. Arrancar Fase 0: script BD consolidado + migraciones versionadas (James decide: promover vs reconstruir).
4. Ratificar D1-D7 (James).

## 8. Links

- Auditoría integral: `Docs/auditoria-integral-2026-06.md`
- Bug registry / Cambio 6.6: `Docs/bug-registry-pre-merge.md`
- Audits Codex: `Docs/audit-C-codex-full.md`, `Docs/audit-D-codex-deep.md`
- TRAIL: `Docs/TRAIL.md` · BACKLOG: `Docs/BACKLOG.md`
- Comparación HumanOS + scorecard: producidos en sesión 2026-06-10 (workflows multi-agente); resúmenes integrados en §5-§6 de este doc.
