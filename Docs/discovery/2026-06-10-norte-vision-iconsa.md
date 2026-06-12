<!-- Generado del discovery 360 (workflow wf_7e3ade5d-588, 17 agentes, 2026-06-10). -->
<!-- STATUS: discovery — entendimiento, no decisiones. Caveats del critico adversarial en Docs/discovery/README.md -->

# EL NORTE — Visión y destino de la suite ICONSA

> Síntesis de discovery 2026-06-10. Fuentes: corpus de visión de James (HANDOFF mayo-2026, data-architecture-recomendaciones, Vision Roadmap, REPORTS_VISION, GPS_Future_Opportunities, quality-engineering-roadmap), SOPs del SG (solo como conceptos), proyecto real 25-506 en Drive, research de líderes (Tenna/Hilti/HCSS/Procore/P6), y la BD VIVA de prod/staging verificada vía MCP. Donde docs y BD discrepan, gana la BD.

---

## 1. La visión consolidada — en concreto

**La frase canónica de James (HANDOFF mayo-2026 §6):** "MovimientOS y los demás apps son medios, no fines. El fin real es construir la base de datos y las capacidades analíticas." La aspiración de calidad es explícita (quality-engineering-roadmap §0): "producir un sistema al nivel de Procore, Sage 300 CRE, Tenna, Fleetio en el dominio que cubrimos."

El norte tiene **tres flujos de datos hacia un solo lugar** (una Supabase, hoy `bzeoszympkkicwlfdtcn`):

### Flujo A — Ingesta read-only desde ERPs (lo que ICONSA ya tiene)
| Fuente | Qué da | Estado verificado |
|---|---|---|
| **Spectrum SDX** (SOAP, `iconsanet.dexterchaney.com:8482`) | Master data: empleados, jobs, phases, equipment, vendors, customers, inventory (14–21 servicios Get; NO transacciones históricas) | **VIVO en prod**: edge functions `sdx-sync` v4 + `sdx-people-sync` v1 ACTIVE; `core.equipment` 421, `core.phases` 296, `core.jobs` 52 rows |
| **PayDay** (planilla bisemanal) | Salarios, horas — vía addon DataWarehouse (~$600/año, replica nightly) | Cotizado (Cot0000141), compra **sin confirmar**; cap 150 empleados vs ~200 reales |
| **GPS** (SkyData → proveedor nuevo) | Posición, horas motor, geofences | SkyData integrado en MovimientOS (`equipment.gps_vehicle_id`, 13/13 vehículos); migración a proveedor nuevo en curso, identidad desconocida |
| **ProjectSight** (Trimble) | RFIs/QC de proyectos ACP | REST+OAuth2; registro de app pendiente. Evidencia de uso real en 25-506 ("Informe Project Sight.docx", dic-2025) |
| **Traqspera / B2W** | — | Traqspera sin API (se lee vía Spectrum); B2W paywalled |

Política dura declarada: **NUNCA escribir a Spectrum/Trimble** desde las apps.

### Flujo B — Creación de datos con apps propias (digitalizar lo que hoy es papel/Excel/nada)
- **MovimientOS** (EN PROD, `public`, 44 tablas en prod / 51 en staging): digitaliza IC-LOG-PO-06. Uso real modesto pero genuino: 53 solicitudes, 51 trips, 166 eventos, 1,742 emails. Ya genera el primer "actual nacido digital": costo de movilización por trip con tarifa + cost code de Spectrum.
- **HumanOS** (pre-prod de UI, pero su BD YA VIVE en prod): 10+ schemas (`hr` 21 tablas, `requests`, `docs`, `payroll`, `performance`, `learning`, `workflows`...) construidos directo sobre prod abril–junio 2026 (ledger humanos_v2 001→095). `hr.people` 370 rows pobladas por ETL Spectrum. Digitaliza formularios RRHH; NO calcula nómina (PayDay) pero captura planilla como insumo.
- **Apps futuras**: inventario/herramientas QR (Inventario Stack Research: assets/movements/checkout-checkin, PWA con cámara, metodología "nada sale sin escanear"), taller/mantenimiento, compras.

### Flujo C — La capa analítica (el "para qué")
Trabajo de ingeniería industrial/data science sobre la BD unificada: inventarios con safety stock/reorder points/ABC/EOQ, scheduling CPM, optimización de despacho/ruteo, cost tracking real vs presupuesto, mantenimiento RCM, gap analysis (Excel-Charris vs app, ghost trips vía GPS), y el sistema de reportes en 5 capas de REPORTS_VISION (cron Clean+export Spectrum → gap analysis → tool Astrid → Reports Hub → dashboards).

### La arquitectura de datos deseada (y cuánto ya es real)
Patrón medallion declarado: `raw_<source>` → `core` (golden records + MDM) → schemas de app. **Esto ya pasó de aspiracional a LIVE en prod** para el lado HumanOS: `core.*` (19 tablas), `core.field_authority` (11 rows — autoridad por campo: empleo/org←Spectrum, identidad←onboarding, salario←PayDay), crosswalk `hr.person_sources` (629 rows). Decisión real distinta al doc: `hr.people` es el golden record FÍSICO y `core.persons` es una VIEW security_invoker — no se movieron masters a core como tabla. Sin stack enterprise: NO dbt/Airflow/Snowflake.

**El hecho estructural más importante del discovery:** prod ya NO es "la BD de MovimientOS". Es una BD multi-app de **147 tablas en 13 schemas**, con MovimientOS congelado en `public` (release v2026.04.15-2, código main consistente con su BD) y HumanOS evolucionando al lado. La visión "una BD centralizada" ya ocurrió físicamente — lo que falta es **coserla** (todos los crosswalks `*_external_ids` están en 0 rows; `public.equipment` 377 vs `core.equipment` 421 sin vínculo; `public.people` 182 vs `hr.people` 370 sin vínculo).

---

## 2. Inventario de features/procesos futuros (declarados + implicados por los líderes)

Agrupados por dominio. **[D]** = declarado por James en el corpus; **[M]** = implicado por replicar al mercado (Tenna/Hilti/HCSS/Procore); **[SOP]** = proceso de compañía que existe conceptualmente y hoy no tiene sistema vivo.

### Grupo 0 — Cerrar MovimientOS v2 (prerequisito de todo lo demás)
- Merge jaime/dev → prod: 7 tablas + 11 columnas + constraints + el hardening de seguridad del audit 2026-04-14 que **solo existe en staging** [D — BACKLOG "Merge v2"]. Es el bloqueante #1 (memoria: cisma prod/staging).
- Reportes Capa 1: bitácora IC-LOG-F-06-04 + facturación IC-LOG-06-05 unificadas + export Spectrum Equip Revenue (Batch_ID MV{DDMMAA}, `trips.spectrum_batch_id`) [D]. Urgencia confirmada por la realidad: el reporte manual de facturación de movilizaciones de 25-506 solo se produjo oct+nov 2025 y murió — hay ~7 meses sin facturar movilizaciones en ningún canal.
- GPS fase 2: breadcrumb persistido → POIs → geofences + auto-registro de eventos (killer feature) → ghost trips → KPIs → validación de tarifas con GPS (favoritos del jefe) [D — GPS_Future_Opportunities §12].

### Grupo 1 — Equipos y custodia (réplica Tenna + Hilti ON!Track)
- Inspecciones IC-EQ-F-01-02 con blocking logic "no inspection, no dispatch" + auto-WO desde fail crítico [D, F2]. Tablas listas en 0 rows (`equipment_inspections`, `inspection_templates`, `inspection_responses` — verificado en database.ts y prod).
- Cadena de custodia: activar `custody_transfers` (AD-2, tabla creada, trigger inactivo) — equivalente estructural del Transfer de ON!Track (from/to custodian + location + transfer_type + confirmation_method) [D+M].
- Onboarding equipos menores + tagging QR (F7) + catálogo visual (F8) + página detail con QR scan público [D]. Lección Tenna: escalonar hardware por valor del asset (QR → BLE → GPS); no todo merece GPS.
- Assemblies/accesorios (F6, tablas existen), calificaciones de operadores con vencimientos (`operator_qualifications`, tabla lista) [D].
- Ciclo de vida del activo [SOP IC-EQ-PO-02]: listado maestro, plan de reemplazo trimestral (≤B/.50K Alta Dirección, >B/.50K Junta), alquilar-vs-comprar, baja documentada. Hoy sin sistema (CA5000 en Drive muestra due diligence de compra viviendo en carpeta de proyecto).
- Tarifas de equipo de 2 componentes (base fija ownership + base operativa, revisión semestral, ref. Caterpillar Handbook) [SOP] — el concepto detrás de `mobilization_rates` y de "validación de tarifas con GPS".

### Grupo 2 — Taller y mantenimiento (réplica HCSS Equipment360; hueco dejado por Fleetwise)
- Work orders ciclo completo con costo labor+parts (F11, `work_orders`+`work_order_parts` listas) [D+SOP IC-EQ-PO-01].
- PM disparado por meter readings — el patrón HCSS: telemática alimenta mantenimiento, no solo mapas. `meter_readings` ya es AEMP-shaped (hours/kilometers/source/is_verified) [M].
- Fuel tracking con anomalías (F12, `fuel_logs` lista) [D+SOP IC-EQ-PO-06: camión surtidor, reconciliación diaria].
- Tarjeta de tiempo de mecánico (labor del taller) [SOP IC-EQ-F-01-05] — solapa con HumanOS/planilla.
- Herramientas con check-in/check-out QR (reemplaza el tarjetario físico) [D+SOP IC-EQ-PO-04]; almacén de taller con salida de repuesto trazada AL EQUIPO [SOP IC-EQ-F-05-01].

### Grupo 3 — Almacén e inventario (el "inventario inexistente")
- App de inventario sobre el modelo MOVIMIENTOS+QR [D — Inventario Stack Research]: assets/asset_movements, 10 contenedores de Chilibre, validación contra POs (lo pide Rodrigo, presidente).
- Distinción Hilti que falta modelar: **Asset único (serial) vs Quantity Item (consumible por stock con low-stock alerts)** — `equipment` cubre lo primero; lo segundo requiere entidad nueva [M].
- Warehouse básico (F14, tablas listas) + nota de entrega digital (F-04-04 = documento de custodia universal de los SOPs) [SOP IC-LOG-PO-04].

### Grupo 4 — Compras/procurement (réplica parcial Procore Commitments)
- RM → OC digitalizadas (F9, `purchase_orders`+`vendors`+`rental_agreements` listas) [D]. Blueprint real verificado en 25-506: 226+ requisiciones en 13 meses, tracker Excel que decayó (filas 201–280 vacías, #REF!), flujo RM→OC Spectrum→factura [evidencia Drive].
- Vínculo OC→línea de solicitud de movilización [D — Vision Roadmap]; EPP con firma digital (F-07) [D+SOP].

### Grupo 5 — Campo y proyecto (réplica Procore Daily Log + HCSS HeavyJob — implicado, NO declarado aún como app)
- Daily field report digital: el IC-PG-F-01-04 se produce HOY a mano, uno por día (RD-175/176 de jun-2026 verificados en Drive: headcount, inventario manual de ~25 equipos en obra, firmas ICONSA+inspector ACP) [M+realidad]. Es la mayor captura de datos manual recurrente de la compañía.
- Field productivity: cantidades instaladas + horas por cost code, diario → unit cost real vs estimado (la capability definitoria de un heavy civil maduro según HeavyJob) [M].
- Look-ahead 2-3 semanas por proyecto (Last Planner): ya existe embrionario en el backlog+scheduled_date de Charris; el SOP lo exige como Two-Week Look-Ahead Excel (F-06-02); el RGS lo reporta como sí/no [SOP+M]. CPM/P6 completo: solo si contratos lo exigen.
- Reporte Gerencial Semanal generable desde datos (hoy Word con fórmulas Excel rotas pegadas) [realidad 25-506].
- Gate del cliente: formulario ACP 3817-AIC de entrada/salida de materiales — paso real del flujo de movilización en sitios controlados por cliente que MovimientOS no modela [realidad].

### Grupo 6 — Dashboards y budget-vs-actuals (réplica Procore Cost Management)
- 4 dashboards por rol (/pm /logistics /management /workshop) [D, F5].
- La vista canónica del mercado: Original Budget → Revised → Committed → JTD → Forecast → ECAC → Over/Under, por cost code [M]. Requiere: presupuesto por fase desde Spectrum (¿extraíble? SDX no expone transacciones), actuals de las apps, horas de PayDay.
- Equipment TCO, utilización, SOP compliance [D].

### Grupo 7 — Integraciones y plataforma
- Spectrum sync formal (F16) por cross-reference de código — el patrón exacto de Tenna/ON!Track con Spectrum, ya validado por `equipment.spectrum_code` [D+M].
- GPS nuevo: exigir contrato AEMP 2.0 / ISO 15143-3 (posición, horas acumuladas, fuel) [M].
- WhatsApp Business API (10x apertura vs email), PWA offline, capa always-on de automatización (research Hermes — sin decisión) [D].
- Repo `iconsa-knowledge` (LLM Wiki) — recomendado, no creado [D].

### Secuencia que el mercado sugiere (orden observado en los líderes)
1. Inventario/tagging → 2. ubicación → 3. meters/utilización → 4. PM/work orders → 5. inspecciones+fuel → 6. dispatching → 7. safety. Y del lado Procore: daily reports → inspecciones → quantities/horas por cost code → cost views → scheduling formal. **ICONSA ya cumplió "un workflow de campo end-to-end" (movilizaciones); lo que NO conviene hacer es saltar a dashboards financieros sin captura de campo disciplinada** ("bad data" = $1.85T industria, 14% del rework — Autodesk/FMI). No replicar: ELD/IFTA/DVIR, dashcams AI, conectores per-OEM, billing por días-en-sitio v1.

---

## 3. Qué implica el norte para el DISEÑO DE DATOS HOY

Estas son las decisiones de hoy que evitan refactors masivos mañana:

1. **El seam masters es la deuda #1.** Hay 4-5 copias de cada master en la misma BD prod sin vínculo: people (182 public / 370 hr), equipment (377 public / 421 core), projects (6 public / 23 payroll / 52 core.jobs), cost_codes (138 public / 296 core.phases), locations (8 public / 15 hr). Los crosswalks `*_external_ids` existen y están VACÍOS. Toda app nueva que arranque sin materializar este seam agrava el problema. Decisión necesaria: cuál es el golden record por entidad y cuándo se cose (no necesariamente migrar FKs — basta crosswalk poblado + field_authority extendida a equipment/jobs).
2. **Cross-reference por código externo, no API profunda.** Es exactamente cómo Tenna y Hilti integran con Spectrum (Equipment Code ↔ Inventory Number / Data Xchange). `equipment.spectrum_code` ya es ese patrón — formalizarlo: toda entidad sincronizable lleva external ID estable + `source_system` + delta por `updated_at`; soft-delete/archivado, nunca hard-delete de personas/ubicaciones (patrón ON!Track Unite, ya alineado con RLS+audit).
3. **El spine financiero es el cost code y ya existe** (`cost_codes` + `cost_categories` via `cost_code_categories`, full_code `{proyecto}-{fase}-{categoría}` por trigger — equivalente estructural del budget code multi-segmento de Procore, verificado contra el papel real: la solicitud 031 de 25-506 usa `25-506-01-7113-ICS`). Regla de diseño: **todo evento operativo con costo nace etiquetado con cost code de Spectrum** (movilizaciones ya lo hacen post-Cambio 2). Los codes solo nacen en el ERP — las apps los consumen (patrón conector Procore↔Spectrum).
4. **Eventos/proof como primera clase.** El modelo trip_events + reversiones + audit ya separa declarativo de real (REPORTS_VISION: "Proof como primera clase"). Mantenerlo en todo dominio nuevo: el evento (transfer, inspección, lectura, despacho de fuel) es el registro, los agregados son derivados (como `recalc_qty_for_line`).
5. **Modelado pendiente que conviene decidir ANTES de la app de inventario:** (a) Asset único vs Quantity Item como entidades distintas, no flag; (b) "responsible employee" permanente del asset (Hilti lo tiene como atributo del asset, no solo del transfer); (c) locations unificadas cross-app (hoy public.locations ≠ hr.locations).
6. **`meter_readings` debe quedar AEMP-shaped** (ya lo está) y el contrato con el GPS nuevo debe poblarla — convierte GPS de mapa a motor de PM.
7. **Bounded contexts por schema ya es la convención viva** (hr/payroll/requests/core...). Pregunta abierta estructural: ¿MovimientOS migra de `public` a `mov` o `public` queda como legado permanente? El doc de arquitectura lo proponía; la realidad lo dejó intacto y HumanOS lo trata como HARD-prohibido.
8. **Higiene que el norte exige ya:** el cisma prod/staging (ledgers irreconciliables post-2026-04-20; merge de branch Supabase inviable — solo script consolidado) + el hardening de seguridad 2026-04-14 nunca aplicado a prod (4 funciones search_path-mutable, 22 tablas sin policy) + schema `backup` con 11 tablas RLS-disabled incluyendo dump de `auth.users` (48 rows) y PII (370 rows). Una "BD centralizada de la compañía" no puede vivir sobre eso.
9. **Diseño para fricción mínima y 1 actor.** La queja #1 de ON!Track: el sistema vale lo que la disciplina del personal. ICONSA tiene 1 persona de almacén real (ni siquiera almacenista) y 1 Charris. Custodia/inventario deben diseñarse como QR-scan-en-celular y asumir un solo actor, no los 4 roles de los SOPs.

---

## 4. Mapa conceptual de procesos de la compañía (de los SOPs — conceptos, no realidad)

El SG (ISO 9001:2015, dormante desde ~2019, masa documental de 2018) organiza la compañía en: **estratégicos** (Alta Dirección, Calidad, SSOA) → **realización** (Ventas → Operaciones: construcción, administración de proyectos, alquiler de equipos a terceros, mezcla asfáltica, diseño) → **soporte** (RRHH, Logística, Gestión y Mantenimiento de Equipos, Finanzas, TI, Administración).

El cluster que las apps digitalizan (~13 procedimientos LOG/EQ) se articula en **4 documentos pivote** que son los candidatos naturales a entidades centrales:
- **Requisición de Materiales (F-01-01)** → entrada a Compras, Almacén, Equipos Menores, EPP. (≈ futura `material_requisitions`)
- **Nota de Entrega (F-04-04)** → documento de custodia universal. (≈ `custody_transfers`)
- **Reporte Entrada/Salida de Equipo al Taller (IC-EQ-F-01-02)** → inspección universal (taller, movilización, alquiler). (≈ `equipment_inspections`)
- **Solicitud de Movilización (F-06-03)** → la usan proyectos, traspasos de almacén, alquileres y devoluciones. (= `sm_requests`, ya digital)

**Conceptos transversales clave:** tarifa de equipo de 2 componentes con revisión semestral; el uso de equipo como revenue en el módulo EQ del ERP donde **External = movilizaciones** (la movilización ES contablemente un cargo de equipo al job cost, cat. fija 07, día=8h L-S, prorrateo entre cost codes); codificación de activos 5XX-YYY (Fleetwise, numérica) coexistiendo con `spectrum_code` alfanumérico sin mapeo documentado; expediente por equipo; custodia documentada en cada handoff.

**Ciclos de vida conceptuales:** equipo (alta+código+tarifa → uso/revenue → inspección → mantenimiento → reemplazo/baja), material (RM → OC → recepción → almacén → entrega → bitácora en proyecto → devolución), movilización (plan de requerimientos → solicitud → 2WLA → inspección → permiso ATTT → ejecución → recepción firmada → facturación mensual).

**Realidad vs SOP (verificada):** el SG asume 4+ roles de almacén/logística que no existen; el papel siguió vivo EN PARALELO a MovimientOS (36 solicitudes papel en 25-506 hasta mar-2026, numeración propia); los sistemas que los SOPs asumen (Fleetwise, Timberline) tienen estado desconocido; y procesos enteros (inventario, daily reports estructurados, facturación de movilizaciones) simplemente dejaron de ejecutarse o nunca tuvieron sistema. Los SOPs sirven como **diccionario de conceptos y grafo de procesos** — no como spec.

---

## 5. Tensiones que el norte debe resolver (resumen)

1. **Coser antes de crecer:** cada app nueva sin crosswalks poblados multiplica la fragmentación de masters dentro de la misma BD.
2. **Capturar antes de dashboardear:** la secuencia de la industria es captura de campo → costos → dashboards; ICONSA tiene la tentación inversa (la analítica es el "fin") pero su cuello de botella es disciplina de captura (tracker de RM decayó, facturación de movilizaciones murió, daily reports a mano).
3. **El riesgo es organizacional, no técnico:** el software de los líderes falla donde nadie registra movimientos. Headcount real: 1 Charris, 1 cuasi-almacenista. Fricción mínima como requisito de diseño.
4. **La deuda invisible:** prod sin hardening, schema backup expuesto, 3 branches MIGRATIONS_FAILED, docs del repo (CLAUDE.md "47 tablas", TRAIL en Cambio 3) sistemáticamente desfasados de la BD viva — el norte de "BD centralizada confiable" empieza por que la BD actual sea confiable y los docs digan la verdad.

---

## Key points

- El fin declarado y verificado: las apps son medios; el fin es UNA BD centralizada en Supabase con 3 flujos — ingesta read-only de ERPs (Spectrum SDX ya VIVO via edge functions, PayDay DW cotizado sin confirmar, GPS migrando), creación de datos por apps propias (MovimientOS prod + HumanOS), y capa analítica de ingeniería industrial encima.
- La 'BD centralizada' ya ocurrió físicamente: prod tiene 147 tablas en 13 schemas (MovimientOS en public + HumanOS en hr/core/requests/etc., con core.field_authority y medallion live) — pero está DESCOSIDA: todos los crosswalks *_external_ids en 0 rows; 4-5 copias de cada master (people 182/370, equipment 377/421, projects 6/23/52) sin vínculo. Coser el seam de masters es la deuda de diseño #1.
- El scaffold del modelo Tenna/Hilti/HCSS ya existe completo en la BD (verificado en database.ts y prod, 22+ tablas en 0 rows: custody_transfers, meter_readings AEMP-shaped, work_orders, fuel_logs, inspections, operator_qualifications, purchase_orders, vendors) — la pregunta no es qué crear sino en qué orden activar y con qué proceso real.
- El patrón de integración de los líderes con Spectrum es cross-reference por código (no API profunda): equipment.spectrum_code ya ES ese patrón; formalizarlo como regla (external ID + source_system + soft-delete + delta queries) y exigir AEMP 2.0/ISO 15143-3 al proveedor GPS nuevo.
- El spine financiero estilo Procore ya existe (cost_codes+categories con full_code por trigger, idéntico al papel real de 25-506); la regla de oro de diseño: todo evento operativo con costo nace etiquetado con cost code de Spectrum, y los codes solo nacen en el ERP.
- Secuencia que la industria valida para lo que sigue: cerrar merge v2 + reportes/facturación (hay ~7 meses sin facturar movilizaciones en ningún canal) → custodia+QR equipos menores → inspecciones como gate → meter readings via GPS → work orders/PM → daily field reports y quantities por cost code → recién entonces dashboards budget-vs-actuals. NO empezar por dashboards financieros (bad data).
- Riesgo dominante organizacional, no técnico: la queja #1 de ON!Track es que el sistema vale lo que la disciplina de registro; ICONSA tiene 1 Charris y 1 cuasi-almacenista, y el papel corrió en paralelo a MovimientOS hasta mar-2026 — fricción mínima (QR en celular) y cutover explícito son requisitos de diseño.
- Higiene bloqueante del norte: cisma prod/staging irreconciliable por ledger (solo script consolidado), hardening de seguridad 2026-04-14 nunca aplicado a prod, schema backup con 11 tablas RLS-disabled incluyendo dump de auth.users, y docs del repo sistemáticamente desfasados de la BD viva.
- Los SOPs sirven como diccionario conceptual: 4 documentos pivote (Requisición, Nota de Entrega/custodia, Inspección de taller, Solicitud de Movilización) mapean 1:1 a las entidades centrales futuras; conceptos transversales clave: tarifa de 2 componentes, movilización = cargo de equipo al job cost (revenue External, cat 07), doble codificación de activos 5XX-YYY vs spectrum_code sin mapeo.

## Preguntas abiertas para James

1. ¿Fleetwise sigue vivo? Los SOPs lo asumen como sistema central de equipos (registro maestro, OTs, horas, alertas PM, combustible) pero tu stack declarado no lo menciona. Si murió, todo el dominio taller/mantenimiento no tiene sistema vivo hoy — define la urgencia real del Grupo 2 (work orders, meter readings, fuel).
2. ¿Qué ERP corre exactamente hoy — Spectrum o Timberline/Sage 300 CRE — y se puede extraer el PRESUPUESTO por fase (montos), no solo el catálogo? SDX solo expone master data; sin Original Budget no existe budget-vs-actuals y el Grupo 6 queda cojo. ¿El módulo EQ con revenue Internal/External sigue siendo el mecanismo contable de las movilizaciones?
3. Golden records: ¿cuál es la tabla canónica por master (people: hr.people vs public.people; equipment: core.equipment vs public.equipment; projects: core.jobs vs public.projects) y cuándo se materializan los crosswalks *_external_ids (hoy todos en 0)? ¿Quieres extender core.field_authority a equipment/jobs como ya se hizo con personas?
4. ¿MovimientOS migra eventualmente de public a un schema propio (mov) como proponía data-architecture-recomendaciones, o public queda como legado permanente? Define cuánto invertir en refactors de namespace vs solo coser por crosswalk.
5. ¿Quién es el proveedor GPS nuevo que reemplaza a SkyData, y estás dispuesto a exigirle feed AEMP 2.0 / ISO 15143-3 como condición de contrato? Eso decide si meter_readings se puebla sola (GPS → PM automático, patrón HCSS) o sigue manual.
6. ¿Se compró finalmente el PayDay DataWarehouse ($600/año, con el problema del cap de 150 empleados vs ~200)? ¿Y se envió el registro de app a Trimble para ProjectSight? Ambas definen qué fuentes entran al flujo A este año.
7. Operación dual papel+app: 25-506 corrió 36 solicitudes de movilización en papel en paralelo a MovimientOS hasta mar-2026, con numeración propia. ¿Hubo cutover real después de marzo, y quieres una política explícita de 'el papel muere el día X' por proyecto? ¿Las 36 tienen contraparte como sm_requests (queda pendiente verificarlo contra BD)?
8. El gate del cliente (formulario ACP 3817-AIC de entrada/salida de materiales del sitio): ¿lo consideras parte del flujo de movilización a modelar (un evento/aprobación externa más) o queda fuera de scope permanentemente?
9. Para la futura app de inventario: ¿aceptas el modelo Hilti de dos entidades (Asset único serializado vs Quantity Item consumible por stock) y el concepto de 'empleado responsable' permanente por asset, sabiendo que hay 1 solo actor de almacén real? Esto conviene decidirlo ANTES de crear las tablas.
10. Daily field report digital (el IC-PG-F-01-04 que hoy se hace a mano cada día en 25-506): ¿es candidato a próxima app/módulo? ¿Quién sería el dueño del dato — el rol superintendente no existe en los 5 roles actuales del sistema?
11. ¿Tus contratos (ACP u otros) exigen schedules CPM con baselines tipo P6, o el look-ahead de 2-3 semanas (que Charris ya hace embrionariamente para logística) es el techo de scheduling que ICONSA necesita?
12. Prioridad de la higiene de la BD compartida: ¿cuándo se aplica a prod el hardening de seguridad que vive solo en staging, y se elimina/protege el schema backup con dumps de auth.users y PII sin RLS? Ahora que prod aloja HumanOS (datos de RRHH), el riesgo ya no es solo de MovimientOS.
13. ¿Se crea el repo iconsa-knowledge (LLM Wiki empresarial) recomendado por tu framework research, y hay decisión sobre la capa always-on de automatización (research Hermes) o queda parqueado?
