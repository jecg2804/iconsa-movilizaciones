# MovimientOS — Master Backlog

**Última actualización:** 2026-03-17 (sesión completa)
**Fuentes:** Auditoría de código/BD, Feature Spec v3, feedback Charris/PMs, investigación 10 herramientas profesionales (Tenna, HCSS, Clue, B2W, Fleetio, ShareMyToolbox, Contractor Foreman, Connecteam, Procore, Visual Dispatch), SOPs ICONSA, sesiones Mar 13-17.

---

## 🔴 URGENTE — Hacer antes de seguir con features

| # | Item | Detalle |
|---|------|---------|
| U1 | ~~**Reestructurar docs del repo**~~ | ✅ Completado Mar 18. CLAUDE.md fijo, skills con frontmatter, refs actualizadas, archivos obsoletos archivados. |
| U2 | **User guide** | Scribe (Chrome ext) para screenshots anotados paso a paso. 4 flujos: crear solicitud, programar viaje, ver mis viajes, admin. PDF por rol. |
| U3 | **Feedback intake** | Google Form por rol/pantalla ya diseñado. Implementar. |

---

## ✅ COMPLETADOS — Críticos/bloqueantes resueltos

| # | Item | Fecha |
|---|------|-------|
| C1 | RLS sequences (SECURITY DEFINER) | Mar 15 |
| C2 | File attachments (solicitudes, viajes, eventos) | Mar 15 |
| C3 | Email notifications (11 templates via Resend) | Mar 15 |
| C4 | Correos reales para usuarios | Mar 15 |
| C5 | Env vars en Vercel | Mar 15 |
| C6 | Qty management — 3 capas (frontend clamp + save validation + DB trigger) | Mar 17 |
| C7 | DB expansion — 22 → 44 tablas (branch + producción) | Mar 17 |
| C8 | Supabase branching persistente | Mar 17 |
| C9 | Paginación server-side + client-side | Mar 17 |
| C10 | Filtros contextuales por sección | Mar 17 |
| C11 | Calendar click-to-filter + date range | Mar 17 |
| C12 | Time picker 12h, collapsibles, line cards | Mar 17 |
| C13 | Auto-tags IC-0001→IC-0377 + trigger | Mar 17 |
| C14 | Equipment categories seeded (10) | Mar 17 |
| C15 | MCPs instalados (Context7, Sequential Thinking) | Mar 17 |

---

## 🟠 FEATURES POR DESARROLLAR — En orden de impacto operacional

### Tier 1: Perfeccionar movilizaciones (lo que Charris/PMs necesitan YA)

| # | Feature | Detalle |
|---|---------|---------|
| F1 | **Sistema de eventos rediseñado** | Todo editable en salida (conductor, vehículo, líneas, cantidades). Entrega registrada por receptor en proyecto, no por conductor. Mejores popups. Retorno por almacenista/Charris. IC-LOG-F-06-04 digital. |
| F2 | **Inspección de equipo obligatoria (IC-EQ-F-01-02)** | 6 tablas ya existen. Falta: cargar template 42 items, UI walkthrough móvil con secciones, foto en fail, firma digital. `is_blocking=false` al inicio (warning), luego true. |
| F3 | **Reporte facturación mensual** | Auto-generado con @react-pdf/renderer. Caveat: no todas las tarifas son viaje×tarifa. Algunas son tarifa del equipo movilizado (grúa) agrupando múltiples viajes. `mobilization_campaigns` tabla ya existe. Human-in-the-loop: Charris valida → Astrid aprueba. |
| F4 | **Informe Valderrama semanal** | Qué equipo está en qué proyecto, movilizados pendientes. Auto-generado lunes 7AM. Formato del PDF `Equipos_4ta__Sem_Enero_2026.pdf` como referencia. |
| F5 | **Dashboards por rol** | Custom con Tremor/Recharts. PM: costo por proyecto, estado de solicitudes. Charris: dispatch board, pendientes, flota. Gerencia: KPIs empresa, tendencias. |

### Tier 2: Gestión de equipos (lo que el jefe está pidiendo)

| # | Feature | Detalle |
|---|---------|---------|
| F6 | **Assemblies/accesorios** | Tablas ya existen. UI para configurar sets (Grúa + Boom + contrapesos). Al movilizar equipo principal, sugerir accesorios. Requiere colaboración con personal de Chilibre para definir qué es accesorio de qué. Many-to-many confirmado. |
| F7 | **Onboarding equipos menores + QR** | Auto-tags IC-####. Jornada de campo: agregar equipo al sistema (foto, categoría, descripción) + imprimir QR + pegar. Llenar orgánicamente cuando equipos salen de Chilibre. |
| F8 | **Catálogo visual de equipos** | Fotos en equipment (photo_url ya existe). Para personal no familiarizado con los equipos (outsourced workers, etc.). |
| F9 | **Órdenes de compra digitalizadas** | Tablas `purchase_orders` + `purchase_order_lines` ya existen. OC se sube como PDF → se digitaliza → líneas vinculables a solicitudes → cantidades vivas. |
| F10 | **Admin mejorada** | PMs manejan personal de su proyecto. Charris maneja flota/conductores. Equipment detail page con historial completo. |

### Tier 3: Taller y workshop (futuro cercano)

| # | Feature | Detalle |
|---|---------|---------|
| F11 | **Work orders de mantenimiento** | Tabla `work_orders` ya existe. Ciclo: draft→open→in_progress→waiting_parts→completed→closed. Inspección fallida → auto-crear WO. |
| F12 | **Fuel tracking** | Tabla `fuel_logs` ya existe. IC-EQ-PO-06 digital. Litros/hora, costo por proyecto, anomalías. |
| F13 | **Operator qualifications** | Tabla ya existe. Quién puede operar qué. Licencias con vencimiento. Compliance. |
| F14 | **Warehouse/inventario básico** | Tablas ya existen. Consumibles por lote (filtros, lubricantes). Se llena orgánicamente. |
| F15 | **Bitácora de movilizaciones** | IC-LOG-F-06-04 completo. Vista tabular histórica exportable. Nueva pantalla /bitacora. |

### Tier 4: Integraciones y automatización

| # | Feature | Detalle |
|---|---------|---------|
| F16 | **Spectrum API** | Read-only si dan acceso. Sync equipos, cost codes. No bloquear nada esperando esto. |
| F17 | **GPS/Skydata** | Tracking de flota en tiempo real. AEMP/ISO 15143-3. |
| F18 | **WhatsApp notifications** | Más efectivo que email para conductores en campo. |
| F19 | **PWA offline** | Service worker para inspecciones sin conexión. |
| F20 | **NestJS backend** | Cron jobs (alertas, reportes programados). Railway/Fly.io. |

---

## 🟡 PENDIENTES MENORES

| # | Item | Detalle |
|---|------|---------|
| Q1 | Andrés Solís y Lourdes Dominguez sin email | 2 PMs — notificaciones se skipean |
| Q2 | BUGS.md desactualizado | Se actualiza con la reestructuración de docs (U1) |
| Q3 | Testing robusto adjuntos + notificaciones | Probar cada flujo con cada rol |
| Q4 | Verificar dominio iconsanet.com en Resend | Para emails de producción |

---

## 📋 PREGUNTAS ABIERTAS / DISCUSIONES PENDIENTES

| # | Tema | Contexto |
|---|------|----------|
| 1 | **Definición de "equipo menor"** | Jefe dice <$10K, otro dice <$5K, Astrid dice tipo EQA. Requiere reunión de 30 min para definir política. James propone, gerencia aprueba. |
| 2 | **Clasificación de equipos para auto-tags** | Tags IC-#### son universales e independientes de categoría. Pero ¿las 10 categorías de Spectrum son las correctas para operaciones? |
| 3 | **Facturación: agrupamiento por equipo movilizado** | Algunas tarifas son basadas en el equipo (grúa), no en el equipo de movilización (volquete). Charris agrupa viajes y asigna tarifa. Discutir lógica exacta. |
| 4 | **Prorrateo de costo multi-proyecto** | Viaje sirve a 2 proyectos → ¿cómo se divide el costo? |
| 5 | **Contenedores de Chilibre** | 10 contenedores desorganizados. 3 son generadores rotos. Inventario inexistente. El app puede facilitar pero alguien tiene que hacer la jornada de clasificación. |
| 6 | **SOPs outdated** | Formularios redundantes, algunos no se usan, almacenistas pasaron de 2 a 1. Los SOPs son guía pero la realidad operativa es diferente. |
| 7 | **Movilizaciones externas** | Checkbox existe pero sin formulario. Necesita: empresa, contacto, placa, costo externo. |
| 8 | **Conductores/vehículos de proyecto** | PM viene a buscar material personalmente. Dropdowns solo muestran flota. ¿Campo texto libre como fallback? |

---

## 📊 ESTADO ACTUAL DEL SISTEMA

### Base de datos: 44 tablas
**Producción** (`bzeoszympkkicwlfdtcn`) y **Branch** (`vonwkciosksqspyljzfy`, persistente) — idénticos.

**Tablas operativas (22 originales):** sm_requests, sm_request_lines, trips, trip_line_assignments, trip_events, equipment (expandida +12 cols), people, projects, project_extras, locations, units, mobilization_rates, cost_codes, cost_categories, cost_code_categories, sequences, suggestions, notification_log, audit_log, feedback, person_projects, user_app_roles

**Tablas nuevas (22, vacías, listas para features):** equipment_categories (10 rows seeded), equipment_assemblies, equipment_assembly_members, inspection_templates, inspection_template_sections, inspection_template_items, equipment_inspections, inspection_responses, inspection_photos, work_orders, work_order_parts, fuel_logs, meter_readings, operator_qualifications, rental_agreements, purchase_orders, purchase_order_lines, mobilization_campaigns, warehouse_items, warehouse_transactions, vendors, equipment_status_log

**17 funciones** | **31 triggers** (incluye auto-tag IC-#### y status_log) | **73 RLS policies** (solo tablas originales)

### App funcional
Login, CRUD solicitudes con líneas, backlog con prioridad visual, crear/editar viajes con qty management robusto, calendario con click-to-filter y date range, eventos (salida/llegada/entrega/retorno/incidencia), entregas parciales, dashboard, admin masters con paginación, file attachments, email notifications, collapsibles, time picker 12h, filtros contextuales, paginación server+client.

### Infraestructura
| Recurso | Referencia |
|---------|------------|
| Supabase producción | `bzeoszympkkicwlfdtcn` (ICONSA org, Pro plan) |
| Supabase branch (persistente) | `vonwkciosksqspyljzfy` |
| Vercel producción | `rein-eisenwerk.com` (team great-manns-projects) |
| Repo privado | ICONSA-Solutions/movimientOS |
| Branch activo | jaime/dev → PR a main para deploy |
| MCPs (Claude Code) | Context7, Supabase (read-only) |

### Docs del repo (✅ Reestructurado Mar 18)
CLAUDE.md actualizado (44 tablas, stack correcto, estados corregidos). 7 skills con frontmatter. Rules actualizados. FEATURE_SPEC.md v4 como spec primario. Archivos obsoletos en Docs/archive/.