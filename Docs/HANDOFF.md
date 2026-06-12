# HANDOFF — MovimientOS (actualizado 2026-06-12)

> **QUÉ ES:** foto del estado para retomar en una sesión nueva. **ADVERTENCIA
> DURA (James):** NO confíes 100% en este doc ni en ningún doc del repo. Son
> pistas con fecha. **Valida SIEMPRE contra la fuente:** BD viva (Supabase MCP,
> ahora con read/write), código, APIs/SDX/ODBC, GDrive. Esta sesión cazó 3+
> mentiras documentales por validar contra la fuente. Sé escéptico.

## Dónde estamos (orden decidido por James)

```text
DISCOVERY [✅ cerrado] → HARNESS MÍNIMO [siguiente] → MERGE TRACK → POST-MERGE
```

- **D1 RESUELTA:** se continúa en `jaime/dev` (directiva del jefe: finalizar
  Events V2 + GPS y MERGE = lo crítico; restart era incompatible). NO restart.
- **Regla rectora:** "sin un buen harness ni quiero tocar nada del código"
  (James). Por eso: harness MÍNIMO (lo que el merge necesita) → merge →
  harness completo post-merge. No features nuevos pre-merge salvo movimientos
  internos (único feature nuevo del DoD).

## Lo que estas sesiones (2026-06-10 → 12) lograron

- **Discovery 360° cerrado** → `Docs/discovery/` (7 docs: canónico del app,
  norte/visión, harness blueprint v0, transformación digital, cierre/coverage
  ledger, juicio adversarial del doc-system, cola de rediseño). Cada uno con
  caveats del crítico embebidos. Léelos como pistas, no canon.
- **Comparación harness HumanOS + scorecard de madurez 9 dims** (mov L1-L3 vs
  HUM L3-L4 vs gold L5).
- **Modelo de acceso Supabase cambiado:** three-actor model DEPRECADO. Code
  tiene **read/write** vía MCP (Chat fuera del workflow de BD). Escribe SOLO a
  `public.*` (= movimientOS), con GO previo de James + plan comunicado.
  settings.json sin deny de Supabase. Regla: `.claude/rules/supabase-access.md`.
- **GPS migrado** al API nuevo (SkyData Latam, `acceso.skydatalatam.com`):
  adapter reescrito + `equipment.gps_vehicle_id` re-mapeado en staging (15
  vehículos por placa, verificado). FALTA (James): setear `SKYDATA_API_KEY` +
  `SKYDATA_BASE_URL` en Vercel, quitar `SKYDATA_API_PASSWORD`.
- **`npm run typecheck` agregado** (primer check del harness) — verde.
- **Demo data copiada prod→staging** (2026-06-12): staging ahora tiene la data
  REAL de prod (57 SM, 55 trips, 173 eventos, request_ids reales). Masters ya
  compartían UUIDs; solo se copió transaccional con transformación V1→V2.
  Caveat: algunos `description`/`notes` largos se acortaron en la copia; los
  campos load-bearing (ids/estados/cantidades/cost-codes/timestamps) son exactos.

## Lo siguiente: PAQUETE H1 (harness mínimo)

Code prepara un doc de decisiones con **recomendación por punto** para que
James ratifique en una sentada (cada decisión → ADR). Incluye:
- Taxonomía de docs ENMENDADA por el juicio adversarial (5 tipos + verificación
  ejecutable como pieza #0; constitution como reemplazo NETO de las reglas de
  CLAUDE.md, no adición; cola→fusionar en BACKLOG; CHANGELOG a reformar). Ver
  `Docs/discovery/2026-06-11-juicio-doc-system.md`.
- Conflictos C1-C8 del blueprint (debugging owner, ralph-loop off, frontera de
  reviewers, poda de plugins feature-dev/commit-commands, plugin interno vs ports).
- Boundaries del Supabase write (hook PreToolUse que bloquee writes fuera de
  public.*; staging libre vs prod gated).
- AGENTS.md (Codex ya audita el repo sin él), verify/typecheck ya empezado.

Luego: harness mínimo construido (CLAUDE.md reescrito vs canónico, hooks,
reviewers bd/rls, migrations-as-files) → **MERGE TRACK**.

## DoD del merge (James, verbatim 2026-06-11)

jaime/dev debe tener Events V2 perfeccionado y TODA la lógica correcta:
cálculos de cantidades (despachadas/entregadas/parciales), estados de
solicitud/movilización correctos en CUALQUIER edge case, los **4 fulfillment
types** funcionales como MVP (**internos = falta del todo, hay que diseñarlo y
construirlo PRE-merge**; pickup; externo), GPS, y backlog que recibe lo que
debe en el momento adecuado. Vía: script BD consolidado (gates = forensia ya
corrida) → Cambio 6.6 (bugs ya acordados en bug-registry) → MVP internos → GPS
→ Q15/J6 → smoke por fulfillment → prod → merge v2 → tag. Reportes/facturación
= POST-merge (NO confundir con prerequisito).

## Verdades a RE-VALIDAR contra la fuente (no asumir)

- **Cisma prod/staging:** prod 44 tablas / 17 funciones (Events V1) vs staging
  51 / 38 (V2). Delta exacto en `Docs/discovery/2026-06-11-merge-delta-validado.md`
  (validado en vivo). Gates: 1 trip rate NULL + 7 líneas En Transito zombie en prod.
- **Data de prod = ficción parcial:** James corrigió a mano el 69% de eventos
  (timestamps backdated, líneas atascadas). El rediseño debe que James deje de
  hacer cirugía SQL.
- **Código de confirmación:** validado 100% client-side, viaja a todos los roles
  (verificado en pg_policies). No es control de seguridad, es UX.
- **GPS bootstrap del 2026-04-20 = STALE** (IDs viejos); el del merge usa el
  mapeo nuevo (en merge-delta).

## Reglas duras (siempre)

- **Validar contra la fuente, nunca confiar en docs/snippets** (incl. spectrum-tests).
- **Anti-voseo:** Panamá usa tú/usted. NUNCA "tenés/querés/anotá". Riesgo: filtrar
  voseo a strings de UI. Ver memoria `anti-voseo-panama-spanish.md`.
- Code escribe solo `public.*` con GO de James. No commit/push a `main`.
- Toda sesión persiste su trabajo en Docs/ + actualiza TRAIL (handoff).

## Punteros

- **Posición:** `Docs/TRAIL.md` (auto-cargado).
- **Plan rector:** `Docs/plan-maestro-2026-06.md`.
- **Discovery:** `Docs/discovery/` (7 docs + este HANDOFF).
- **Memoria persistente:** `~/.claude/projects/.../memory/MEMORY.md` (visión,
  directivas, realidad operativa, anti-voseo, cisma).
- **Cola de rediseño (post-merge):** `Docs/discovery/cola-de-rediseno.md` (Q1-Q17, M1-M7).
