# Discovery 2026-06 — índice y estado

> **Qué es esta carpeta:** los documentos de ENTENDIMIENTO producidos por el
> discovery multi-agente de junio 2026 (fase: discovery/audit/research — cero
> implementación). Son insumo de discusión y diseño, NO decisiones.
> Regla de oro vigente: **código + BD viva = source of truth; estos docs son
> fotos con fecha** — verificar antes de usar como hecho.

## Documentos

| Doc | Qué contiene | Estado |
|---|---|---|
| `2026-06-10-movimientos-canonico.md` | El app como ES (código jaime/dev + BD staging/prod): modelo de dominio real, máquina de estados real, madurez de los 3 fulfillment types, tabla de 20 contradicciones docs-vs-código-vs-BD, uso real en prod | ✅ v1 (pendiente addendum del cierre de huecos) |
| `2026-06-10-norte-vision-iconsa.md` | Visión consolidada (BD centralizada + ERP extraction + apps), inventario de features futuros por grupos [D/M/SOP], implicaciones para el diseño de datos, mapa conceptual de procesos | ✅ v1 |
| `2026-06-10-harness-blueprint-v0.md` | Estado verificado de ambos harnesses, tabla a-la-carta por necesidad, conflictos C1-C8, 4 piezas propias justificadas, secuencia de dependencia | ✅ v0 — **input de discusión** |
| `2026-06-10-transformacion-digital-construccion.md` | Research aplicado: por qué falla la adopción en construcción + playbook de recuperación (conductores/Charris/sponsor), AI/data con ROI real vs hype, bus factor, implicaciones para fases | ⚠️ v1 — **leer CON los caveats del crítico embebidos al final: varios stats insignia del body fueron refutados o degradados (47% AGC inexistente, 73% RICS de otra población, benchmark CFMA = blog de vendor, WhatsApp Groups API restringida a 100K+ conv/mes). Las TESIS sobreviven; los números específicos del body NO usar ante gerencia sin ver la corrección.** |

## Fuentes y metodología

- 2 workflows multi-agente (2026-06-10): discovery 360° (17 agentes, ~3.6M tokens, 467 tool uses) + cierre de huecos (en curso). Antecedentes: comparación harness HumanOS + scorecard de madurez vs gold-standard (20 agentes).
- Inventarios verificados contra: código jaime/dev, BD staging (`vonwkciosksqspyljzfy`) y prod (`bzeoszympkkicwlfdtcn`) vía MCP read-only, corpus local de visión, SOPs (solo conceptos), carpeta Drive de 25-506, research web de líderes (Tenna/Hilti/HCSS/Procore/P6) y ecosistema de harness.
- **Crítico adversarial** verificó ~25 claims load-bearing en vivo: la tabla de contradicciones del canónico confirmó match exacto en todos los items testeados.

## Caveats del crítico (leer antes de citar los docs)

**Disputes (claims corregidos o degradados):**

1. Conteos de scaffolding "16/22 tablas" no reproducibles con exactitud (el concepto sí: ~21-23 tablas en 0 filas sin refs en código).
2. "Policies rol-only con USING(true)" — plausible vía CHANGELOG pero **pg_policies nunca se leyó** (execute_sql denegado). NO verificado en vivo.
3. "handleParada único handler no idempotente" — matiz sin soporte completo (depende de EventModal→eventIdRef, no verificado; lo cubre el cierre de huecos).
4. CHANGELOG 2026-05-13 (audit_trigger a 19 tablas): **NO existe migración en ningún ledger** — tratar como NO aplicado hasta confirmación de James.
5. Claims documentales del Norte (bitácoras, "7 meses sin facturar", PayDay DW) = confianza menor; James corrigió: la bitácora Excel VIVE para todos los proyectos y NO llega a Drive (va directo a quien digitaliza en Spectrum).
6. "43 security WARNs staging" → el conteo vivo es 41.
7. Detalles menores: 63 'use client' = 63 ocurrencias en 62 archivos.

**Blind spots (cerrándose en el workflow de cierre + SQL pack):**

- Cuerpos SQL vivos de funciones/triggers y pg_policies completo (requieren SQL pack ejecutado por James/Chat).
- main branch nunca auditado (el código que PROD corre) — en curso.
- ~30% de src/ sin leer (components/, EventModal, tests/, .husky/) — en curso.
- Schema `backup` de prod: recreado FUERA del ledger post-migración 040 (patrón de dumps sin registro); exposición PostgREST sin resolver.
- Edge functions sdx-* (ya documentadas después en `ICONSA_SDX_Spectrum_documentacion.md` de James), carpetas EQUIPO/LOGISTICA del SG (en curso — James: lectura 100% obligatoria), estado Vercel de prod.

## Decisiones de James registradas (2026-06-10)

- **Harness-first:** "Sin un buen harness ni quiero tocar nada del código." Secuencia: cerrar discovery → harness/foundation → diseño/código (referencia = líderes del mercado; proceso actual = constraints de adopción, no destino).
- **D1 (restart vs continuar): ABIERTA** — pendiente de discovery completo (incl. auditoría de main).
- **Supabase write para Code:** se adopta el modelo HumanOS (Code read/write + hooks/guards; Chat fuera del workflow). Diseño de boundaries en la fase harness.
- Data de prod = parcialmente ficción (correcciones manuales de James) — el SQL pack incluye forensics para cuantificarlo.

## Pendiente

1. Workflow "cierre de huecos" (corriendo): main, src restante 100%, funciones BD reconstruidas, corpus EQUIPO/LOGÍSTICA, coverage ledger global, **SQL diagnostic pack**.
2. James/Chat corren el SQL pack en staging+prod → cierra los no-verificables.
3. Lectura 100% de carpetas EQUIPO y LOGISTICA del SG (verificación post-cierre).
4. Research: transformación digital / AI / data engineering aplicados al sector construcción (en curso).
5. Addendum al canónico + decisiones de harness (C1-C8) → arranque fase harness.
