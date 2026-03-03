# ICONSA — Feature Specification Document
## Sistema Digital de Movilizaciones (IC-LOG-PO-06)

**Versión:** 1.0  
**Fecha:** 24 de febrero de 2026  
**Autor:** James Cucalón — Ingeniero de Transformación Digital  
**Empresa:** Ingeniería Continental, S.A. (ICONSA)  
**Estado:** En revisión — pendiente validación con usuarios clave  

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Problema](#2-contexto-y-problema)
3. [Alcance del Sistema](#3-alcance-del-sistema)
4. [Usuarios y Roles](#4-usuarios-y-roles)
5. [Módulos del Sistema](#5-módulos-del-sistema)
   - 5.1 [Solicitud de Movilización](#51-módulo-solicitud-de-movilización)
   - 5.2 [Programación de Movilizaciones](#52-módulo-programación-de-movilizaciones)
   - 5.3 [Ejecución y Nota de Entrega](#53-módulo-ejecución-y-nota-de-entrega)
   - 5.4 [Inspección de Equipos](#54-módulo-inspección-de-equipos)
   - 5.5 [Facturación de Movilizaciones](#55-módulo-facturación-de-movilizaciones)
   - 5.6 [Dashboard y Reportes](#56-módulo-dashboard-y-reportes)
   - 5.7 [Administración](#57-módulo-administración)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Reglas de Negocio](#7-reglas-de-negocio)
8. [Estados y Transiciones](#8-estados-y-transiciones)
9. [Notificaciones y Automatizaciones](#9-notificaciones-y-automatizaciones)
10. [Requisitos No Funcionales](#10-requisitos-no-funcionales)
11. [Alcance del MVP vs Futuro](#11-alcance-del-mvp-vs-futuro)
12. [Preguntas Abiertas](#12-preguntas-abiertas)
13. [Glosario](#13-glosario)

---

## 1. Resumen Ejecutivo

### 1.1 — Qué es este documento

Este documento define con precisión qué debe hacer el Sistema Digital de Movilizaciones de ICONSA. Es la referencia única para cualquier persona (developer, consultor, IA, o futuro empleado) que necesite entender, construir, modificar o mantener el sistema.

Este documento NO define con qué herramientas se construye el sistema. El toolstack se decide por separado, basándose en los requisitos aquí definidos. Todo lo especificado debe ser implementable en cualquier stack moderno (PostgreSQL + framework web + automatización).

### 1.2 — Qué hace el sistema

Digitaliza el procedimiento IC-LOG-PO-06 (Movilización de Equipos y Materiales) de ICONSA, reemplazando un flujo basado en papel, WhatsApp, llamadas telefónicas y Excel con un sistema digital integrado que provee:

- Creación y seguimiento digital de solicitudes de movilización
- Herramienta de planificación operacional para el coordinador de logística
- Registro de eventos de ejecución en campo
- Generación automática de notas de entrega
- Generación semi-automática de facturación mensual por proyecto
- Visibilidad en tiempo real para todos los actores (proyectos, taller, gerencia)
- Trazabilidad completa de cada equipo y material desde la solicitud hasta la entrega

### 1.3 — Volumen estimado de operación

| Métrica | Estimado |
|---------|----------|
| Solicitudes por semana | 5–15 |
| Líneas por solicitud (promedio) | 2–4 |
| Viajes programados por semana | 8–20 |
| Proyectos activos simultáneos | 3–5 |
| Usuarios concurrentes (pico) | 8–12 |
| Usuarios totales del sistema | ~20–30 |
| Crecimiento esperado de registros/año | ~2,000–4,000 solicitudes |

### 1.4 — Valor esperado

| Para quién | Problema actual | Solución |
|-----------|----------------|----------|
| Gerencia / VP Proyectos | No saben qué está pasando. Dependen de llamadas y reportes manuales atrasados. | Dashboard en tiempo real. Backlogs vivos. Reportes auto-generados. |
| Ingenieros de Proyecto | No saben si su solicitud fue recibida, programada, o cuándo llegará. | Estados en vivo. Notificaciones. Visibilidad de la programación de Charris. |
| Charris (Logística) | Planifica mentalmente de inputs dispersos (WhatsApp, llamadas, papeles). Sin backlog formal. | Backlog digital de todas las solicitudes pendientes. Herramienta de programación. Calendar view. |
| Taller Chilibre / Almacén | Formularios en papel incompletos. Sin trazabilidad de qué salió y qué llegó. | Notas de entrega digitales vinculadas a solicitudes. Registro de eventos. |
| Finanzas | Facturación mensual armada a mano en Excel. | Facturación semi-automática con revisión humana. |

---

## 2. Contexto y Problema

### 2.1 — La empresa

ICONSA (Ingeniería Continental, S.A.) es una constructora mediana en Panamá (~160 empleados), especializada en construcción pesada: muelles, puentes, infraestructura marítima. Opera 3–5 proyectos simultáneos en diferentes ubicaciones geográficas.

El **Taller de Chilibre** es el centro operativo de equipos y logística. Aquí se almacenan equipos y materiales, se hace mantenimiento, y se coordinan todas las movilizaciones hacia los proyectos.

### 2.2 — El proceso actual (IC-LOG-PO-06)

El procedimiento de movilizaciones maneja el movimiento de equipos (grúas, excavadoras, generadores, barcazas, vehículos) y materiales (cemento, tubería, madera, EPP, repuestos) entre ubicaciones: desde el taller, proveedores externos, o entre proyectos.

**Flujo teórico según el SOP:**
1. Ingeniero de proyecto identifica necesidad → Llena solicitud (IC-LOG-F-06-03) con mínimo 1 semana de anticipación
2. Gerente de proyecto aprueba
3. Coordinador de logística (Charris) recibe, planifica, programa recursos
4. Se ejecuta la movilización con inspección de equipos y nota de entrega
5. A fin de mes se genera facturación por proyecto

**Flujo real actual:**
1. Ingeniero llama/envía WhatsApp a Charris directamente, normalmente con ~3 días de anticipación
2. Se formaliza la solicitud en papel después del hecho (si se hace del todo)
3. Charris planifica mentalmente con la información que tiene en la cabeza
4. Las notas de entrega se llenan a mano con datos incompletos
5. La facturación mensual se arma manualmente en Excel, siempre atrasada
6. Nadie más tiene visibilidad de lo que está pasando

### 2.3 — Formularios existentes del SOP

| Código | Nombre | Propósito | Estado actual |
|--------|--------|-----------|--------------|
| IC-LOG-F-06-02 | Two Week Look-Ahead Schedule | Planificación visual de 2 semanas | No se usa |
| IC-LOG-F-06-03 | Solicitud de Movilización | Ingeniero pide mover equipo/material | Se usa retroactivamente, post-facto |
| IC-LOG-F-06-04 | Bitácora de Movilizaciones | Registro histórico de toda la actividad | Se llena a mano, siempre atrasada |
| IC-LOG-04-04 | Nota de Entrega de Material | Documento de entrega firmado | Se usa en papel, sin vínculos |
| IC-LOG-06-05 | Facturación de Movilizaciones | Resumen mensual de costos por proyecto | Manual en Excel |
| IC-EQ-F-01-02 | Reporte Entrada/Salida de Equipo | Inspección de 42 ítems | En papel, no siempre se hace |

### 2.4 — Datos existentes

| Fuente | Datos | Cantidad | Calidad |
|--------|-------|----------|---------|
| Spectrum (ERP) | Equipos | 392 | Media — necesita limpieza de clasificaciones |
| Spectrum | Vehículos de movilización | 56 | Buena — con tarifas |
| Spectrum | Empleados | 161 | Mala — 99% sin departamento ni cargo |
| Spectrum | Códigos de costo por proyecto | ~124 | Buena — estructura clara |
| Reconstrucción manual (PDFs) | Solicitudes históricas | 501 líneas / 174 solicitudes | Media — campos limitados |
| Papel | Notas de entrega | 61 | Mala — sin vínculos a solicitudes |
| Papel | Movilizaciones | 13 | Muy mala — mayoría de campos vacíos |
| Definición interna | Tarifas de movilización | 14 códigos | Buena |
| Definición interna | Proyectos activos | 4 | Completa |

### 2.5 — Sistemas existentes (que NO se reemplazan)

| Sistema | Uso | Relevancia |
|---------|-----|------------|
| Spectrum (Viewpoint/Trimble) | ERP de construcción — contabilidad, job costing, payroll, equipos (parcial) | Fuente maestra de equipos, empleados, códigos de costo. Integración futura (no en MVP). |
| Fleetwise | Gestión de flota, integrado con Spectrum | José Miguel lo opera. Complementario, no se reemplaza. |
| Sage | Contabilidad / facturación | Downstream — recibe datos de facturación. |
| Basecamp | Comunicación entre equipos de proyecto | Se quiere reemplazar con Teams eventualmente. |

---

## 3. Alcance del Sistema

### 3.1 — Dentro del alcance (MVP)

- Creación, edición, envío y seguimiento de solicitudes de movilización con líneas
- Backlog operativo de líneas pendientes para Charris
- Programación de viajes: agrupar líneas, asignar conductor/vehículo/remolque/fecha
- Clasificación automática del tipo de movilización (movilización / desmovilización / movimiento interno)
- Registro de eventos de ejecución (salida, llegada, entrega, retorno)
- Generación de notas de entrega digitales
- Facturación mensual semi-automática con revisión humana
- Dashboard con métricas operativas
- Prioridad auto-calculada por cercanía de fecha requerida
- Notificaciones básicas (email)
- Roles y permisos (quién ve qué)
- Gestión de tablas maestras (CRUD de proyectos, equipos, ubicaciones, personas, tarifas)
- Fallback universal en dropdowns (texto libre + sugerencia a admin)

### 3.2 — Dentro del alcance (Fase 2 — post-MVP)

- Inspección de equipos (IC-EQ-F-01-02) — formulario digital de 42 ítems
- Two-Week Look-Ahead — vista de calendario
- Integración con Órdenes de Compra (vincular línea de solicitud a línea de OC)
- Categorías de materiales
- Rol del conductor con registro de eventos desde móvil
- Notificaciones por WhatsApp
- Exportación a PDF de notas de entrega y facturación
- Códigos QR para equipos/materiales
- Vista offline / PWA para campo

### 3.3 — Fuera del alcance (módulos futuros, otros procedimientos)

- Inventario / Almacén (IC-LOG-PO-04) — módulo #2 en roadmap
- Equipos menores (IC-LOG-PO-05)
- Compras completas (IC-LOG-PO-01)
- Mantenimiento de equipos (IC-EQ-PO-01)
- Gestión de equipos (IC-EQ-PO-02)
- Control de herramientas (IC-EQ-PO-04)
- Almacén de taller (IC-EQ-PO-05)
- Suministro de combustible (IC-EQ-PO-06)
- Vehículos livianos (IC-LOG-PO-09)
- Integración bidireccional con Spectrum
- App nativa (iOS/Android)

NOTA: Aunque estos módulos están fuera del alcance, el modelo de datos DEBE diseñarse para soportarlos sin reestructuración. Las tablas de inventario, mantenimiento, y procurement se crean vacías desde el día 1.

---

## 4. Usuarios y Roles

### 4.1 — Roles del sistema

| Rol | Nombre interno | Usuarios típicos | Cantidad estimada |
|-----|---------------|-------------------|-------------------|
| Ingeniero de Proyecto | `pm` | Edward Rodríguez, Jenniffer Troetsch, Hector Pino, Juan Jácome, David Ríos, Madeleine Lange, Yanelys Sánchez, Lourdes Domingo, César Caballero | ~10 |
| Coordinador de Logística | `logistica` | Carlos Charris | 1 (crítico) |
| Conductor | `campo` | Coco, Bonilla, Monchi, Rafael, + 1–2 más | ~5 |
| Almacenista | `almacen` | Yoseph Caballero | 1 |
| Asistente de Equipos | `equipos` | José Miguel | 1 |
| Gerencia | `gerencia` | Adolfo Valderrama (Ger. Equipos), Gerentes de Proyecto, VP Proyectos | ~5 |
| Administrador | `admin` | James Cucalón (temporal), futuro IT | 1 |

### 4.2 — Matriz de permisos

| Funcionalidad | pm | logistica | campo | almacen | equipos | gerencia | admin |
|--------------|:---:|:---------:|:-----:|:-------:|:-------:|:--------:|:-----:|
| **Crear solicitud** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Ver solicitudes propias** | ✅ | — | — | — | — | — | — |
| **Ver TODAS las solicitudes** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ (solo lectura) | ✅ |
| **Editar solicitud (borrador/enviada)** | ✅ (solo propias) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Cancelar solicitud** | ✅ (solo propias) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Ver backlog de líneas** | ✅ (solo lectura, todos los proyectos) | ✅ | ❌ | ❌ | ❌ | ✅ (solo lectura) | ✅ |
| **Crear/editar viaje** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Asignar recursos a viaje** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Ver viajes programados** | ✅ (solo sus proyectos) | ✅ (todos) | ✅ (solo asignados) | ❌ | ❌ | ✅ (todos) | ✅ |
| **Registrar eventos de viaje** | ❌ | ✅ | ✅ (solo asignados) | ✅ (recepción) | ❌ | ❌ | ✅ |
| **Crear/ver nota de entrega** | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ (solo lectura) | ✅ |
| **Confirmar recepción** | ✅ (en proyecto) | ❌ | ❌ | ✅ (en Chilibre) | ❌ | ❌ | ✅ |
| **Ver facturación** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ (solo lectura) | ✅ |
| **Editar/aprobar facturación** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Ver dashboard** | ✅ (filtrado a sus proyectos) | ✅ (completo) | ❌ | ❌ | ❌ | ✅ (completo) | ✅ |
| **Gestionar tablas maestras** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Aprobar sugerencias de fallback** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Llenar inspección de equipo** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |

### 4.3 — Nota sobre licenciamiento

A diferencia de Power Apps (donde cada usuario necesita licencia), este sistema es una aplicación web propia. **Todos los empleados de ICONSA pueden acceder sin costo adicional por usuario.** Esto elimina la restricción que impedía incluir conductores y personal de campo.

---

## 5. Módulos del Sistema

---

### 5.1 — Módulo: Solicitud de Movilización

**Formulario base:** IC-LOG-F-06-03  
**Usuarios principales:** Ingenieros de Proyecto (rol `pm`)  
**Propósito:** Permitir a los ingenieros de proyecto solicitar digitalmente el movimiento de equipos y/o materiales.

#### 5.1.1 — Pantalla: Mis Solicitudes (Landing Page)

**URL:** `/solicitudes`  
**Acceso:** `pm`, `logistica`, `gerencia`, `admin`

**Comportamiento:**
- Al abrir, muestra una lista de solicitudes filtrada según el rol del usuario:
  - `pm`: solo solicitudes de los proyectos asignados al usuario
  - `logistica`, `gerencia`, `admin`: todas las solicitudes
- Cada fila muestra: ID de solicitud, proyecto (código + nombre), solicitante, fecha creada, fecha requerida, número de líneas, estado, prioridad
- El estado se muestra como badge con color (ver sección 8)
- La prioridad se muestra como badge con color (Vencida=rojo, Urgente=naranja, Próxima=azul, Normal=verde)

**Filtros disponibles:**
- Proyecto (dropdown de proyectos activos)
- Estado (multi-select: Borrador, Enviada, En Proceso, Programada, Completada, Parcial, Cancelada)
- Rango de fechas (fecha creada o fecha requerida)
- Búsqueda por ID de solicitud (texto libre)
- Solicitante (dropdown — solo visible para `logistica`/`admin`/`gerencia`)

**Ordenamiento predeterminado:** Por prioridad descendente (Vencida primero), luego por fecha requerida ascendente (más urgente primero).

**Acciones:**
- Click en una solicitud → navega a pantalla de detalle/edición
- Botón "+ Nueva Solicitud" → navega a pantalla de formulario en blanco (solo `pm` y `admin`)

#### 5.1.2 — Pantalla: Formulario de Solicitud (Crear / Editar / Ver)

**URL:** `/solicitudes/nueva` o `/solicitudes/{id}`  
**Acceso:** `pm` (crear/editar propias), `logistica`/`admin` (editar cualquiera), `gerencia` (solo lectura)

**Concepto de diseño:** Formulario de documento único ("documento vivo"). Una sola pantalla que contiene toda la información de la solicitud. No es un wizard de pasos — es un formulario tipo factura: cabecera arriba, líneas en el medio, acciones abajo. Esto replica la experiencia del formulario en papel pero con capacidades digitales.

**Modos del formulario:**
- **Modo creación:** Formulario en blanco, todos los campos editables
- **Modo edición:** Solicitud existente en estado Borrador o Enviada, campos editables
- **Modo lectura:** Solicitud en cualquier otro estado, campos no editables, se muestra información adicional (quién programó, eventos, etc.)

##### Sección A: Barra de Identificación

| Elemento | Comportamiento |
|----------|---------------|
| ID de Solicitud | Auto-generado al primer guardado. Formato: `{CódigoProyecto}-SM-{###}` donde ### es secuencial por proyecto. Ejemplo: `25-506-SM-024`. Mostrado en formato monoespaciado prominente. En modo creación dice "Se generará al guardar". |
| Badge de Estado | Color según estado actual. Solo lectura. |
| Badge de Prioridad | Color según cálculo automático. Solo lectura. |

##### Sección B: Datos de Cabecera (Header)

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Proyecto | Dropdown (lookup) | ✅ | Lista de proyectos activos. Al seleccionar, filtra los códigos de costo disponibles en las líneas. Para `pm`, solo muestra proyectos asignados al usuario. |
| Solicitante | Dropdown (lookup) | ✅ | Lista de personas. Auto-rellena con el usuario actual, pero se puede cambiar (ej: un asistente crea la solicitud a nombre de otro). |
| Aprobado por | Dropdown (lookup) | ❌ | Lista de personas (típicamente gerentes de proyecto). No es bloqueante. Se puede llenar antes o después de enviar. |
| Fecha Requerida | Selector de fecha | ✅ | Fecha en que se necesita el material/equipo en destino. El sistema calcula prioridad automáticamente basado en la diferencia entre esta fecha y la fecha actual. |
| Fecha Creada | Texto (solo lectura) | — | Se auto-llena con la fecha y hora de creación. No editable. |
| Notas generales | Texto largo | ❌ | Observaciones libres sobre la solicitud completa. |
| Adjuntos | Carga de archivos | ❌ | PDF, imágenes, Word, Excel. Máximo 10MB por archivo. Zona de drag-and-drop o botón para seleccionar. Los archivos se muestran como chips con nombre y opción de eliminar (en modo edición). |

##### Sección C: Líneas de Solicitud

La tabla de líneas es el corazón del formulario. Cada línea representa un ítem (equipo o material) que necesita ser movilizado.

**Vista de la tabla:**

| # | Tipo | Descripción | Desde | Hasta | Cant. | Und. | Código Costo | Estado | Acciones |
|---|------|-------------|-------|-------|-------|------|-------------|--------|----------|
| 1 | 🔧 | Grúa 318 – Liebherr LTM 1060 | Taller Chilibre | Muelle 14 | 1 | und | 25-506-01.7113-EQI | Pendiente | ✏️ 🗑️ |
| 2 | 📦 | Boom 40ft para Grúa 318 | Taller Chilibre | Muelle 14 | 1 | und | 25-506-01.7113-EQI | Pendiente | ✏️ 🗑️ |

- Las filas son clickeables para expandir detalles
- Acciones (editar/eliminar) solo visibles en modo edición
- Badge de tipo: 🔧 Equipo (azul) / 📦 Material (dorado)
- Badge de estado por línea con color

**Botón "+ Agregar Línea":** Abre un panel/overlay dentro de la misma pantalla para agregar una nueva línea.

##### Sección C.1: Panel "Agregar / Editar Línea"

Se abre como panel expandible debajo del botón (o como overlay lateral). No navega a otra pantalla.

**Toggle Tipo de Línea:** Dos opciones visualmente prominentes — "🔧 Equipo" o "📦 Material". Determina qué campos se muestran:

**Si Tipo = Equipo:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Equipo | Dropdown con búsqueda (lookup) | ✅ | Busca en tabla de equipos (392+ registros). Muestra: Código – Descripción. Al seleccionar, auto-rellena la descripción. Incluye Fallback (ver 7.7). |
| Descripción | Texto (auto-rellenado) | ✅ | Se llena automáticamente al seleccionar equipo. Editable si se usa fallback. |

**Si Tipo = Material:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Descripción del material | Texto libre | ✅ | El usuario describe el material. Sin dropdown (no existe catálogo de materiales aún). |
| Categoría de material | Dropdown | ❌ | Fase 2 — campo existe pero no requerido inicialmente. Opciones a definir (EPP, tubería, madera, repuestos, consumibles, etc.). |

**Campos comunes a ambos tipos:**

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| Desde | Dropdown con búsqueda + texto libre | ✅ | Ubicaciones conocidas (Chilibre, proyectos activos) + proveedores. Como hay 47+ proveedores en datos históricos que cambian frecuentemente, este campo permite: seleccionar de dropdown O escribir texto libre (nuevo proveedor/ubicación). Si se escribe texto libre, se crea sugerencia para agregar al master. |
| Hasta | Dropdown con búsqueda + texto libre | ✅ | Mismo comportamiento que "Desde". Históricamente más limitado (~8 destinos). |
| Cantidad | Número positivo | ✅ | Cantidad a movilizar. |
| Unidad | Dropdown | ✅ | Opciones: und, m, m², m³, kg, ton, gal, ft, juegos, pzas, sacos, set, pqt, qq. Incluye Fallback. |
| Fase / Código de Costo | Dropdown filtrado | ✅ | Filtrado por el proyecto seleccionado en la cabecera. Muestra: Código – Descripción (ej: "01-7113 – Movilización"). Datos vienen de la tabla de códigos de costo de Spectrum. |
| Categoría de Costo | Dropdown | ❌ | Opciones: ICS, EQI, EQA, MAT, SAL, OTR, CON, SUB. Complementa el código de costo. Si se llena, el código de costo completo se muestra como: `{Proyecto}-{Fase}-{Categoría}` (ej: `25-506-01.7113-EQI`). |
| Nota de línea | Texto | ❌ | Nota específica para esta línea (ej: "Va en el mismo viaje que la grúa"). |
| Orden de Compra | Texto libre | ❌ | MVP: campo de texto donde el usuario escribe el número de OC si existe. Fase 2: dropdown que busca OC y permite seleccionar línea específica. |

**Al guardar la línea:** Se agrega a la tabla de líneas. El panel se cierra. El usuario puede agregar más líneas o proceder a enviar.

##### Sección D: Acciones

| Botón | Condición | Comportamiento |
|-------|-----------|---------------|
| Guardar Borrador | Modo creación o edición | Guarda la solicitud y todas sus líneas con estado "Borrador". Genera ID si es la primera vez. No notifica a nadie. El usuario puede volver a editar después. |
| Enviar Solicitud | Modo creación o edición, mínimo 1 línea | Guarda todo + cambia estado a "Enviada". Activa notificación a Charris. Calcula prioridad. El usuario ya no puede editar (excepto cancelar). |
| Cancelar Solicitud | Solicitud en estado Borrador o Enviada | Cambia estado a "Cancelada". Pide confirmación. Solicitudes ya programadas no se pueden cancelar por el solicitante. |
| Volver a Mis Solicitudes | Siempre | Navega de vuelta a `/solicitudes`. |

##### Sección E: Información adicional (solo modo lectura)

Cuando la solicitud está en estados avanzados (En Proceso, Programada, Completada), se muestran secciones adicionales debajo de las líneas:

- **Programación:** Qué viajes se asignaron, con qué vehículo/conductor, para qué fecha
- **Eventos:** Timeline de eventos de ejecución (salida, llegada, entrega, retorno)
- **Nota de Entrega:** Link a la nota de entrega generada (si existe)

Esto permite que el ingeniero de proyecto vea todo el ciclo de vida de su solicitud desde una sola pantalla.

---

### 5.2 — Módulo: Programación de Movilizaciones

**Formularios base:** IC-LOG-F-06-02 (Two Week Look-Ahead), IC-LOG-F-06-04 (Bitácora)  
**Usuario principal:** Carlos Charris (rol `logistica`)  
**Propósito:** Dar a Charris una herramienta de planificación operacional donde pueda ver todas las solicitudes pendientes, agrupar líneas en viajes eficientes, y asignar recursos.

#### 5.2.1 — Pantalla: Programación (con tabs)

**URL:** `/programacion`  
**Acceso:** `logistica`, `admin` (lectura/escritura); `pm`, `gerencia` (solo lectura)

La pantalla tiene tres vistas accesibles por tabs:

##### Tab 1: Backlog de Líneas

**Concepto:** Esta es la vista más importante de Charris. Muestra TODAS las líneas de TODAS las solicitudes que necesitan ser atendidas, aplanadas en una lista única, independiente de qué solicitud las generó.

**Contenido:** Cada fila es una LÍNEA de solicitud (no una solicitud completa), mostrando:
- Ícono de tipo (🔧 Equipo / 📦 Material)
- Descripción del ítem
- Badge de prioridad (Vencida / Urgente / Próxima / Normal)
- ID de solicitud de origen (clickeable para ver la solicitud)
- Proyecto (código + nombre)
- Solicitante
- Cantidad y unidad
- Ruta (Desde → Hasta)
- Fecha requerida
- Estado de la línea (Pendiente / Programada)

**Dos secciones:**
1. **"⚠️ Sin Programar"** — líneas con estado "Pendiente", ordenadas por prioridad
2. **"📅 Programadas"** — líneas ya asignadas a un viaje, mostrando a qué viaje fueron asignadas

**Filtros:**
- Proyecto (dropdown, opción "Todos")
- Tipo (Equipo / Material / Todos)
- Ruta (Desde y/o Hasta)
- Rango de fecha requerida

**Acción principal:** Botón "📅 Asignar" en cada línea pendiente → abre la pantalla de creación de viaje.

##### Tab 2: Viajes Programados

**Concepto:** Lista de todos los viajes que Charris ha creado, con su estado.

**Cada viaje muestra:**
- ID de viaje (formato: `MOV-{YYYY}-{###}`, secuencial por año)
- Fecha programada
- Conductor asignado
- Vehículo (cabezal)
- Remolque (si aplica)
- Tarifa asignada (código + monto)
- Número de líneas y de solicitudes distintas que transporta
- Ruta principal (si todas las líneas van al mismo destino) o "Multi-ruta"
- Badges: Permiso ATT (🔒), Escolta (🚨)
- Estado del viaje (Programado / En Ruta / Completado / Cancelado)

**Acciones:**
- Click en viaje → ver/editar detalle del viaje
- Botón "+ Crear Nuevo Viaje" → pantalla de creación de viaje

##### Tab 3: Look-Ahead (Fase 2)

**Concepto:** Vista de calendario de 2 semanas, replica digital del IC-LOG-F-06-02. Muestra los viajes programados día por día.

**MVP:** No incluido. Se prioriza Tab 1 y Tab 2.
**Fase 2:** Grilla de 14 días × viajes. Cada celda muestra los viajes de ese día con información resumida. Posibilidad de drag-and-drop para reprogramar.

#### 5.2.2 — Pantalla: Crear / Editar Viaje

**URL:** `/programacion/viaje/nuevo` o `/programacion/viaje/{id}`  
**Acceso:** `logistica`, `admin`

**Concepto:** Charris crea un viaje seleccionando líneas del backlog y asignando recursos. Un viaje puede incluir líneas de MÚLTIPLES solicitudes (relación many-to-many).

##### Sección A: Datos del Viaje

| Campo | Tipo | Requerido | Comportamiento |
|-------|------|:---------:|---------------|
| ID Viaje | Auto-generado | — | `MOV-{YYYY}-{###}`, secuencial por año. |
| Fecha Programada | Selector de fecha | ✅ | Fecha en que se ejecutará el viaje. |
| Conductor | Dropdown (lookup) | ✅ | Lista de conductores disponibles. |
| Vehículo (Cabezal) | Dropdown (lookup) | ✅ | Lista de vehículos de movilización. Muestra: Código – Descripción. |
| Remolque | Dropdown (lookup) | ❌ | Lista de remolques. Si no aplica (ej: pick-up), se deja vacío o "N/A". |
| Tarifa de Movilización | Dropdown (lookup) | ✅ | Lista de 14 tarifas. Muestra: Código – Descripción – Monto. Al seleccionar, auto-rellena el costo. Charris puede cambiarlo manualmente (ej: para agrupaciones de grúa). |
| Costo | Número / Moneda | ✅ | Auto-rellenado por tarifa, pero editable manualmente. |
| Requiere Permiso ATT | Toggle (Sí/No) | ✅ | Default: No. Si Sí, se muestra badge 🔒 en todas las vistas. |
| Requiere Escolta | Toggle (Sí/No) | ✅ | Default: No. Si Sí, se muestra badge 🚨 en todas las vistas. |
| Notas del viaje | Texto largo | ❌ | Observaciones operativas. |

##### Sección B: Líneas Asignadas al Viaje

**Tabla de asignaciones** — cada fila es una línea de solicitud asignada a este viaje:

| Solicitud | Línea # | Descripción | Cantidad Asignada | Unidad | Desde | Hasta |
|-----------|---------|-------------|-------------------|--------|-------|-------|
| 25-506-SM-023 | 1 | Grúa 318 – Liebherr | 1 | und | Taller Chilibre | Muelle 14 |
| 25-506-SM-023 | 2 | Boom 40ft para Grúa 318 | 1 | und | Taller Chilibre | Muelle 14 |
| 25-506-SM-023 | 3 | Tubos tremi 8m | 5 | und | Taller Chilibre | Muelle 14 |

**Acción "Agregar Líneas":** Abre un selector que muestra todas las líneas pendientes del backlog. Charris puede seleccionar múltiples líneas. Para cada línea, puede ajustar la "Cantidad Asignada" (que puede ser menor que la cantidad solicitada — esto habilita viajes parciales).

**Regla:** Si Cantidad Asignada < Cantidad Solicitada, la línea queda en estado "Parcial" y el remanente sigue visible en el backlog como pendiente.

##### Sección C: Tipo de Movilización (auto-calculado)

El sistema determina automáticamente el tipo basándose en las rutas de las líneas asignadas:

| Lógica | Clasificación |
|--------|--------------|
| Hasta = "Chilibre" o "Taller Chilibre" | **Desmovilización** |
| Desde = "Chilibre" o "Taller Chilibre" y Hasta = un proyecto | **Movilización** |
| Desde = un proyecto y Hasta = otro proyecto | **Movimiento Interno** |
| Desde = proveedor externo y Hasta = proyecto | **Movilización (desde proveedor)** |
| Desde = proveedor externo y Hasta = Chilibre | **Recepción en Taller** |

Si un viaje tiene líneas con rutas mixtas, el tipo se muestra como "Mixto" o se clasifica por la ruta mayoritaria.

##### Sección D: Acciones

| Botón | Comportamiento |
|-------|---------------|
| Guardar Viaje | Guarda el viaje y sus asignaciones. Las líneas asignadas cambian a estado "Programada". Las solicitudes de origen actualizan su estado según reglas de cascada (ver sección 8). Notifica a los solicitantes. |
| Cancelar Viaje | Cambia estado a "Cancelado". Libera las líneas de vuelta al backlog (estado → "Pendiente"). Requiere confirmación. |

---

### 5.3 — Módulo: Ejecución y Nota de Entrega

**Formularios base:** IC-LOG-04-04 (Nota de Entrega), parte de IC-LOG-F-06-04 (Bitácora)  
**Usuarios:** `almacen` (Yoseph), `campo` (conductores — Fase 2), `logistica` (Charris), `pm` (confirmar recepción)  
**Propósito:** Registrar los eventos reales de cada viaje y generar la documentación de entrega.

#### 5.3.1 — Pantalla: Viajes del Día / Viajes Activos

**URL:** `/ejecucion`  
**Acceso:** `logistica`, `almacen`, `campo`, `admin`

**Contenido:** Lista de viajes programados para hoy o en estado activo ("En Ruta").

**Para cada viaje muestra:**
- ID, fecha, conductor, vehículo/remolque
- Líneas que transporta (resumen)
- Estado actual con barra de progreso: Programado → 🚛 Salida → 📍 Llegada → ✅ Entrega → 🏠 Retorno
- Último evento registrado

**Acciones:**
- Click en viaje → pantalla de detalle con timeline de eventos

#### 5.3.2 — Pantalla: Detalle de Viaje / Registro de Eventos

**URL:** `/ejecucion/viaje/{id}`  
**Acceso:** `logistica`, `almacen`, `campo`, `admin`

**Concepto:** Muestra el viaje completo con su información, carga asignada, y una timeline de eventos. Los eventos se registran secuencialmente.

##### Información del viaje (solo lectura)
Misma información que en la pantalla de edición de viaje (conductor, vehículo, remolque, tarifa, permisos).

##### Carga asignada
Tabla de líneas asignadas, agrupadas por solicitud de origen. Muestra ID de solicitud, descripción, cantidad, ruta.

##### Timeline de eventos
Cada evento tiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Tipo de evento | Predefinido | Salida, Llegada, Entrega, Retorno, Incidencia |
| Fecha y hora | Auto (Now) + editable | Se pre-llena con la fecha/hora actual. Editable para correcciones. |
| Registrado por | Auto (usuario actual) | Persona que registra el evento. |
| Ubicación | Dropdown + texto libre | Donde ocurre el evento. |
| Notas | Texto libre | Observaciones sobre el evento. |
| Foto | Carga de imagen | Evidencia fotográfica (opcional pero recomendada). |

**Secuencia de eventos:**

```
1. 🚛 SALIDA — Registrado al partir del origen
   → Viaje cambia de "Programado" a "En Ruta"
   → Si incluye equipos, el sistema alerta si falta inspección de salida (Fase 2)

2. 📍 LLEGADA — Registrado al llegar al destino
   → Informativo, actualiza timeline

3. ✅ ENTREGA — Registrado cuando el receptor confirma que recibió
   → Genera Nota de Entrega automáticamente
   → Actualiza estado de líneas a "Entregada" (o "Parcial" si no se entregó todo)
   → Actualiza estado de solicitudes según cascada

4. 🏠 RETORNO — Registrado cuando el conductor regresa al punto de origen
   → Viaje cambia a "Completado"
   → Registra hora de retorno para cálculo de duración total

5. ⚠️ INCIDENCIA (opcional) — Registrado en cualquier momento
   → Documenta problemas: avería, accidente, material dañado, retraso
   → No cambia estados automáticamente pero queda en el registro
```

**Regla:** Los eventos deben seguir la secuencia. No se puede registrar Entrega sin Salida previa. El sistema habilita los botones progresivamente.

#### 5.3.3 — Nota de Entrega (auto-generada)

**URL:** `/notas-entrega/{id}`  
**Acceso:** `logistica`, `almacen`, `pm`, `gerencia`, `admin`

**Concepto:** Se genera automáticamente cuando se registra el evento de Entrega de un viaje. Replica el formato del IC-LOG-04-04 pero con datos pre-llenados del sistema.

**Contenido de la nota:**

| Sección | Campos |
|---------|--------|
| Cabecera | N° Nota (auto: `NE-{YYYY}-{###}`), Fecha, Hora |
| Personas | Entregado por (almacenista/quien prepara), Transportado por (conductor), Entregar a (persona en destino), Recibido por (quien firma en destino) |
| Destino | Hacia (ubicación destino), Proyecto (código) |
| Equipo de transporte | Vehículo (código, descripción, placa), Remolque, Tarifa |
| Ítems entregados | Tabla: #, Solicitud de origen, Descripción, Cantidad, Unidad, Código de costo |
| Firmas | Entregado por, Transportado por, Recibido por (Fase 2: firma digital) |
| Notas | Observaciones generales |

**Acciones:**
- Ver en pantalla (formato documento)
- Exportar a PDF (Fase 2)
- Imprimir

---

### 5.4 — Módulo: Inspección de Equipos (Fase 2)

**Formulario base:** IC-EQ-F-01-02 (Reporte de Entrada/Salida de Equipo)  
**Usuarios:** `campo`, `equipos`, `admin`  
**Propósito:** Documentar el estado de un equipo al salir y al regresar al taller.

NOTA: Este módulo es Fase 2 pero se documenta aquí para completitud y para asegurar que el modelo de datos lo soporte desde el día 1.

#### 5.4.1 — Cuándo se requiere inspección

| Situación | Tipo de inspección | Requerido |
|-----------|-------------------|-----------|
| Equipo sale de Chilibre hacia proyecto (movilización) | Salida | Sí |
| Equipo regresa a Chilibre desde proyecto (desmovilización) | Entrada | Sí |
| Material (no equipo) se moviliza | — | No aplica |

#### 5.4.2 — Formulario de inspección

**Cabecera:**
- Equipo (código + descripción)
- Tipo de inspección (Salida / Entrada)
- Horómetro / Odómetro
- Clase / Marca
- Proyecto
- Operador / persona que entrega
- Fecha

**42 ítems de inspección, organizados en 7 secciones:**

| Sección | Ítems | Cantidad |
|---------|-------|----------|
| Motor | Nivel aceite, Nivel refrigerante, Correas/bandas, Mangueras, Filtro aire | 5 |
| Sistema Hidráulico | Nivel aceite, Mangueras, Cilindros (fugas), Filtros, Conexiones | 5 |
| Sistema Eléctrico | Batería, Alternador, Luces delanteras, Luces traseras, Alarma retroceso, Bocina | 6 |
| Tren de Rodaje/Llantas | Estado llantas/orugas, Presión de aire, Tensión orugas, Rodillos/ruedas guía | 4 |
| Cabina/Estructura | Espejo retrovisor, Cinturón seguridad, Limpiaparabrisas, Asiento operador, Vidrios, Extinguidor, Botiquín | 7 |
| Implementos | Balde/cucharón, Cables/eslingas, Gancho de carga, Pluma/boom, Estabilizadores | 5 |
| Documentación | Manual operación, Certificados vigentes, Inspección anterior, Horómetro/Odómetro, Nivel combustible, Cambio filtro combustible, Cambio aceite motor, Cambio filtro aire, Suspensión trasera/delantera, Dirección hidráulica | 10 |

**Cada ítem tiene 4 opciones:**
- ✓ (Bien)
- R (Requiere reparación)
- A (Requiere ajuste)
- N/A (No aplica)

**Campos adicionales:**
- Comentarios del operador/persona que entrega
- Comentarios del inspector de taller
- Fotos (opcional)
- Firma del inspector

---

### 5.5 — Módulo: Facturación de Movilizaciones

**Formulario base:** IC-LOG-06-05 (Facturación de Movilizaciones)  
**Usuario principal:** Carlos Charris (rol `logistica`)  
**Propósito:** Generar el resumen mensual de costos de movilización por proyecto para cobro interno.

#### 5.5.1 — Pantalla: Facturación

**URL:** `/facturacion`  
**Acceso:** `logistica` (editar/aprobar), `gerencia` (solo lectura), `admin`

**Concepto:** El sistema genera un borrador de facturación basado en todos los viajes completados en un período. Charris lo revisa, edita, y aprueba.

**Filtros principales:**
- Mes / Año (selector de período)
- Proyecto (dropdown, opción "Todos")

##### Vista 1: Resumen por Proyecto

Tabla auto-generada:

| Proyecto | Nombre | # Viajes | Costo Total |
|----------|--------|----------|-------------|
| 25-506 | Muelle 14 | 8 | $4,200.00 |
| 25-505 | Paraíso | 3 | $1,100.00 |
| 25-504 | ASTIBAL | 5 | $2,800.00 |
| **TOTAL** | | **16** | **$8,100.00** |

##### Vista 2: Detalle por Viaje

Tabla expandible:

| ID Viaje | Fecha | Equipo Movilizado | Equipo Utilizado | Desde | Hasta | Proyecto | Código Tarifa | Costo |
|----------|-------|-------------------|------------------|-------|-------|----------|--------------|-------|

**Campos editables por Charris:**
- Código de tarifa (puede cambiar el código asignado)
- Costo (puede ajustar el monto)
- Notas de facturación

**Caso especial — Grúas:** Cuando se moviliza una grúa, Charris puede agrupar múltiples viajes relacionados (cuerpo de la grúa, boom, contrapesos, etc.) bajo un solo costo de grúa (ej: MVG318 = $3,000). El sistema debe permitir esta agrupación manual.

**Acciones:**
| Botón | Comportamiento |
|-------|---------------|
| Generar Borrador | Crea la facturación del período seleccionado basado en viajes completados. Estado: "Borrador". |
| Aprobar Facturación | Charris confirma que los datos son correctos. Estado: "Aprobada". Ya no se puede editar. |
| Exportar | Genera Excel y/o PDF con el formato IC-LOG-06-05. (Fase 2) |

---

### 5.6 — Módulo: Dashboard y Reportes

**URL:** `/dashboard`  
**Acceso:** Todos los roles (contenido filtrado por rol)

#### 5.6.1 — KPIs principales (tarjetas)

| KPI | Descripción | Visible para |
|-----|-------------|-------------|
| Solicitudes Pendientes | Solicitudes en estado Enviada + En Proceso | `pm` (sus proyectos), `logistica`/`gerencia`/`admin` (todos) |
| Líneas Sin Programar | Total de líneas en estado Pendiente | `logistica`, `admin` |
| Viajes Programados | Viajes para hoy y los próximos 3 días | `logistica`, `campo`, `admin` |
| Completadas Este Mes | Solicitudes completadas en el mes actual | Todos |
| Costo del Mes | Total facturado en el mes actual | `logistica`, `gerencia`, `admin` |

#### 5.6.2 — Vistas adicionales

- **Solicitudes recientes:** Últimas 10 solicitudes con estado y prioridad
- **Viajes del día:** Viajes programados para hoy con estado
- **Actividad reciente:** Timeline de los últimos eventos del sistema
- **Distribución por proyecto:** Gráfico simple de solicitudes/costos por proyecto

#### 5.6.3 — Bitácora de Movilizaciones (reemplaza IC-LOG-F-06-04)

**URL:** `/bitacora`  
**Acceso:** `logistica`, `gerencia`, `admin`

Vista tabular de TODOS los viajes con todos sus datos, filtrable por:
- Rango de fechas
- Proyecto
- Conductor
- Estado
- Tipo de movilización

Esta vista reemplaza la bitácora manual en Excel. Es la versión digital "viva" del IC-LOG-F-06-04. Siempre actualizada, siempre filtrable, exportable a Excel.

---

### 5.7 — Módulo: Administración

**URL:** `/admin`  
**Acceso:** `admin`

#### 5.7.1 — Gestión de Tablas Maestras

CRUD (Crear, Leer, Actualizar, Desactivar) para:

| Tabla Maestra | Campos principales | Fuente inicial |
|--------------|-------------------|----------------|
| Proyectos | Código, Nombre, Gerente, Estado, Fechas | Proyectos.csv (4 registros) |
| Equipos | Código Spectrum, Tipo, Descripción, Marca, Modelo, Serial, Capacidad, Año, Tarifas, Equipo de Inspección, Estado | Equipment.csv (392 registros) |
| Vehículos de Movilización | Código, Tipo, Descripción, Marca, Modelo, Capacidad, Placa, Estado | Vehiculos.csv (56 registros) |
| Personas | Código, Nombre, Departamento, Cargo, Teléfono, Rol del sistema, Estado | Employee_Listing.csv (161 registros) |
| Ubicaciones | Nombre, Tipo (Taller/Proyecto/Proveedor/Almacén/Otro), Proyecto asociado (si aplica) | Derivado de datos históricos |
| Tarifas de Movilización | Código, Descripción, Tarifa (B/.) | TarifasMov.csv (14 registros) |
| Códigos de Costo | Código completo, Fase, Tipo costo, Descripción, Proyecto, Estado | codcost.csv (~124 registros) |
| Unidades de Medida | Código, Descripción | Lista fija (~15 opciones) |
| Categorías de Material | Código, Descripción | A definir (Fase 2) |

NOTA: Los registros no se eliminan — se desactivan (campo `activo: true/false`). Esto preserva integridad referencial con datos históricos.

#### 5.7.2 — Gestión de Sugerencias de Fallback

Cuando un usuario usa el fallback universal (escribe texto libre en un dropdown porque no encontró el valor), se crea una sugerencia en una tabla especial.

**Vista de sugerencias pendientes:**
- Tabla: qué sugirió, quién lo sugirió, cuándo, para qué tabla maestra
- Acciones: Aprobar (crea el registro en la tabla maestra) / Rechazar (descarta) / Editar y Aprobar

#### 5.7.3 — Gestión de Usuarios y Roles

- Asignar rol a personas existentes
- Asignar proyectos a usuarios con rol `pm`
- Activar/desactivar acceso

---

## 6. Modelo de Datos

### 6.1 — Diagrama de Entidades y Relaciones

```
TABLAS MAESTRAS (datos que cambian poco)
═════════════════════════════════════════

projects ──────────────────────────────────────────┐
  id, codigo, nombre, gerente_id→people,           │
  estado, fecha_inicio, fecha_fin, notas            │
                                                    │
people ─────────────────────────────────────────┐   │
  id, codigo_spectrum, nombre, departamento,    │   │
  cargo, telefono, email, rol_sistema,          │   │
  activo, proyectos_asignados[]                 │   │
                                                │   │
locations ──────────────────────────────────────│───│─┐
  id, nombre, tipo(taller|proyecto|proveedor|   │   │ │
  almacen|externo), proyecto_id→projects,       │   │ │
  activo                                        │   │ │
                                                │   │ │
assets (equipos + vehículos) ───────────────────│───│─│─┐
  id, codigo_spectrum, tipo_equipo,             │   │ │ │
  tipo_codigo, descripcion, marca, modelo,      │   │ │ │
  serial, capacidad, año, tarifas,              │   │ │ │
  es_vehiculo_movilizacion, es_remolque,        │   │ │ │
  equipo_inspeccion, estado, activo             │   │ │ │
                                                │   │ │ │
mobilization_rates (tarifas) ───────────────────│───│─│─│─┐
  id, codigo, descripcion, tarifa_monto         │   │ │ │ │
                                                │   │ │ │ │
cost_codes ─────────────────────────────────────│───│─│─│─│─┐
  id, codigo_completo, fase, tipo_costo,        │   │ │ │ │ │
  descripcion, proyecto_id→projects, activo     │   │ │ │ │ │
                                                │   │ │ │ │ │
units_of_measure                                │   │ │ │ │ │
  id, codigo, descripcion                       │   │ │ │ │ │
                                                │   │ │ │ │ │
material_categories (Fase 2)                    │   │ │ │ │ │
  id, codigo, descripcion                       │   │ │ │ │ │
                                                │   │ │ │ │ │
                                                │   │ │ │ │ │
TABLAS TRANSACCIONALES (datos que crecen)       │   │ │ │ │ │
═════════════════════════════════════════        │   │ │ │ │ │
                                                │   │ │ │ │ │
mobilization_requests (solicitudes)             │   │ │ │ │ │
  id                                            │   │ │ │ │ │
  request_id (auto: "25-506-SM-024")            │   │ │ │ │ │
  proyecto_id ──────────────────────────────────│───┘ │ │ │ │
  solicitante_id ───────────────────────────────┘     │ │ │ │
  aprobado_por_id → people                            │ │ │ │
  fecha_creada (auto)                                 │ │ │ │
  fecha_requerida                                     │ │ │ │
  fecha_enviada                                       │ │ │ │
  estado (borrador|enviada|en_proceso|                │ │ │ │
         programada|completada|parcial|cancelada)     │ │ │ │
  prioridad (auto-calc: vencida|urgente|              │ │ │ │
            proxima|normal)                           │ │ │ │
  notas                                               │ │ │ │
  adjuntos[] (links a storage)                        │ │ │ │
      │                                               │ │ │ │
      │ 1:N                                           │ │ │ │
      ▼                                               │ │ │ │
mr_lines (líneas de solicitud)                        │ │ │ │
  id                                                  │ │ │ │
  request_id → mobilization_requests                  │ │ │ │
  linea_numero (secuencial dentro de solicitud)       │ │ │ │
  tipo (equipo|material)                              │ │ │ │
  asset_id → assets (si tipo=equipo) ─────────────────│─│─┘ │
  descripcion                                         │ │   │
  material_category_id (Fase 2)                       │ │   │
  ubicacion_desde_id → locations ─────────────────────┘ │   │
  ubicacion_desde_texto (fallback)                      │   │
  ubicacion_hasta_id → locations ───────────────────────┘   │
  ubicacion_hasta_texto (fallback)                          │
  cantidad                                                  │
  unidad_id → units_of_measure                              │
  cost_code_id → cost_codes                                 │
  categoria_costo (ICS|EQI|EQA|MAT|SAL|OTR|CON|SUB)        │
  oc_referencia (texto libre MVP; FK Fase 2)                │
  nota                                                      │
  estado (pendiente|programada|en_transito|                  │
         entregada|parcial|cancelada)                        │
  cantidad_programada (acumulado de asignaciones)            │
  cantidad_entregada  (acumulado de entregas)                │
  tipo_movilizacion (auto: movilizacion|                     │
                    desmovilizacion|movimiento_interno)      │
      │                                                      │
      │ N:M (via trip_assignments)                           │
      ▼                                                      │
trips (viajes)                                               │
  id                                                         │
  trip_id (auto: "MOV-2026-042")                             │
  fecha_programada                                           │
  conductor_id → people                                      │
  vehiculo_id → assets ──────────────────────────────────────┘
  remolque_id → assets (nullable)
  tarifa_id → mobilization_rates
  costo (default de tarifa, editable)
  requiere_permiso_att (boolean)
  requiere_escolta (boolean)
  estado (programado|en_ruta|completado|cancelado)
  notas
  creado_por → people (Charris)
  fecha_creado
      │
      │ 1:N
      ▼
trip_assignments (tabla puente — many-to-many)
  id
  trip_id → trips
  mr_line_id → mr_lines
  cantidad_asignada (puede ser < cantidad solicitada)
      │
      │
      ▼
trip_events (eventos de ejecución)
  id
  trip_id → trips
  tipo (salida|llegada|entrega|retorno|incidencia)
  fecha_hora
  registrado_por_id → people
  ubicacion_id → locations
  ubicacion_texto (fallback)
  notas
  fotos[] (links a storage)
      │
      │
      ▼
delivery_notes (notas de entrega — auto-generadas)
  id
  note_id (auto: "NE-2026-035")
  trip_id → trips
  fecha
  hora
  entregado_por_id → people
  transportado_por_id → people
  recibido_por_id → people
  recibido_por_texto (si no está en sistema)
  ubicacion_destino_id → locations
  proyecto_id → projects
  vehiculo_info (snapshot del vehículo al momento)
  notas
  estado (generada|confirmada)
      │
      │ 1:N
      ▼
dn_lines (líneas de nota de entrega)
  id
  delivery_note_id → delivery_notes
  mr_line_id → mr_lines (trazabilidad a solicitud original)
  descripcion
  cantidad_entregada
  unidad
  codigo_costo

billing_periods (facturación mensual)
  id
  año
  mes
  proyecto_id → projects
  estado (borrador|aprobada)
  total
  aprobado_por_id → people
  fecha_aprobacion
  notas
      │
      │ 1:N
      ▼
billing_lines (líneas de facturación)
  id
  billing_period_id → billing_periods
  trip_id → trips
  tarifa_id → mobilization_rates
  costo_original (auto del viaje)
  costo_ajustado (editado por Charris)
  notas_ajuste
  grupo_grua_id (para agrupar viajes de grúa — nullable)

TABLAS DE INSPECCIÓN (Fase 2)
═════════════════════════════

inspection_items (catálogo de 42 ítems)
  id, seccion, nombre, orden

inspections (cabecera)
  id
  asset_id → assets
  trip_id → trips (nullable — puede existir sin viaje)
  tipo (salida|entrada)
  horometro_odometro
  operador_id → people
  inspector_id → people
  proyecto_id → projects
  fecha
  comentarios_operador
  comentarios_inspector
  fotos[]
  estado (pendiente|completada)

inspection_details (42 filas por inspección)
  id
  inspection_id → inspections
  item_id → inspection_items
  resultado (bien|reparacion|ajuste|no_aplica)
  nota

TABLAS DE SOPORTE
═════════════════

fallback_suggestions (sugerencias de fallback universal)
  id
  tabla_destino (locations|assets|people|units|etc.)
  valor_sugerido (texto que escribió el usuario)
  sugerido_por_id → people
  fecha
  estado (pendiente|aprobada|rechazada)
  aprobado_por_id → people
  registro_creado_id (ID del registro creado al aprobar)

attachments (archivos adjuntos — genérico)
  id
  entidad_tipo (solicitud|viaje|evento|inspeccion|nota_entrega)
  entidad_id
  nombre_archivo
  url_storage
  tipo_archivo
  tamaño
  subido_por_id → people
  fecha

audit_log (registro de auditoría — automático)
  id
  tabla
  registro_id
  accion (crear|editar|eliminar|cambio_estado)
  campo_modificado
  valor_anterior
  valor_nuevo
  usuario_id → people
  fecha_hora

sequences (contadores para auto-IDs)
  id
  tipo (solicitud|viaje|nota_entrega|inspeccion)
  proyecto_id → projects (nullable — para IDs por proyecto)
  siguiente_numero
```

### 6.2 — Relaciones clave

| Relación | Tipo | Descripción |
|----------|------|-------------|
| Solicitud → Líneas | 1:N | Una solicitud tiene 1 o más líneas |
| Línea → Viaje | N:M | Una línea puede estar en múltiples viajes (entregas parciales). Un viaje puede llevar líneas de múltiples solicitudes. La tabla `trip_assignments` es el puente, con `cantidad_asignada` por asignación. |
| Viaje → Eventos | 1:N | Un viaje tiene múltiples eventos secuenciales |
| Viaje → Nota de Entrega | 1:1 | Un viaje genera una nota de entrega al completarse |
| Nota de Entrega → Líneas | 1:N | La nota lista lo que realmente se entregó |

### 6.3 — Índices recomendados

- `mobilization_requests`: proyecto_id, estado, fecha_requerida, solicitante_id
- `mr_lines`: request_id, estado, ubicacion_desde_id, ubicacion_hasta_id
- `trips`: estado, fecha_programada, conductor_id
- `trip_assignments`: trip_id, mr_line_id
- `trip_events`: trip_id, tipo
- `billing_lines`: billing_period_id, trip_id

---

## 7. Reglas de Negocio

### 7.1 — Auto-generación de IDs

| Entidad | Formato | Ejemplo | Lógica |
|---------|---------|---------|--------|
| Solicitud | `{CódigoProyecto}-SM-{###}` | `25-506-SM-024` | Secuencial por proyecto. Se genera al primer guardado (no al crear borrador vacío). El contador se mantiene en la tabla `sequences`. |
| Viaje | `MOV-{YYYY}-{###}` | `MOV-2026-042` | Secuencial por año. Global (no por proyecto). |
| Nota de Entrega | `NE-{YYYY}-{###}` | `NE-2026-035` | Secuencial por año. Global. |
| Inspección | `INS-{YYYY}-{###}` | `INS-2026-018` | Secuencial por año. Global. |

### 7.2 — Cálculo automático de prioridad

Se calcula comparando la fecha requerida de la solicitud con la fecha actual:

| Condición | Prioridad | Color |
|-----------|-----------|-------|
| Fecha requerida ya pasó | **Vencida** | 🔴 Rojo |
| Faltan 0–3 días | **Urgente** | 🟠 Naranja |
| Faltan 4–7 días | **Próxima** | 🔵 Azul |
| Faltan 8+ días | **Normal** | 🟢 Verde |

Se recalcula automáticamente (diariamente o en cada consulta). No es un campo estático — es un cálculo dinámico.

### 7.3 — Clasificación automática de tipo de movilización

Basado en las ubicaciones "Desde" y "Hasta" de las líneas:

| Desde | Hasta | Tipo |
|-------|-------|------|
| Chilibre / Taller / Almacén | Proyecto | Movilización |
| Proveedor externo | Proyecto | Movilización (desde proveedor) |
| Proveedor externo | Chilibre | Recepción en Taller |
| Proyecto | Chilibre / Taller | Desmovilización |
| Proyecto A | Proyecto B | Movimiento Interno |
| Mismo proyecto | Mismo proyecto | Movimiento Interno |

Las ubicaciones se clasifican por su `tipo` en la tabla `locations`. Un proveedor se identifica por `tipo = 'proveedor'`. Chilibre se identifica por `tipo = 'taller'`. Los proyectos por `tipo = 'proyecto'`.

### 7.4 — Lógica de tarifa para facturación

**Regla general:** La tarifa se asigna por viaje según el vehículo/remolque utilizado.

**Excepción — grúas:** Cuando la carga es una grúa, la tarifa se basa en el tipo de grúa movilizada (MVG108=$2,000, MVG318=$3,000, MVG518=$6,400, MVGSNY=$11,000). Charris agrupa todos los viajes necesarios para mover esa grúa bajo un solo cargo de grúa.

**Implementación:** El sistema sugiere la tarifa automáticamente basada en el vehículo, pero Charris puede cambiarla manualmente en cualquier momento (al crear el viaje o al revisar la facturación). El campo `billing_lines.grupo_grua_id` permite agrupar viajes bajo un costo único.

### 7.5 — Prorrateo de costos entre proyectos

Cuando un viaje transporta líneas de múltiples proyectos, el costo se debe distribuir. **Definición pendiente** — en la primera fase, Charris asigna manualmente el costo a cada proyecto en la facturación. El sistema registra qué proyectos participan en cada viaje para facilitar esta decisión.

### 7.6 — Validaciones del formulario de solicitud

| Validación | Momento | Mensaje |
|-----------|---------|---------|
| Proyecto es requerido | Al enviar | "Seleccione un proyecto" |
| Solicitante es requerido | Al enviar | "Seleccione el solicitante" |
| Fecha requerida es requerida | Al enviar | "Ingrese la fecha requerida" |
| Fecha requerida ≥ hoy | Al enviar | "La fecha requerida no puede ser en el pasado" |
| Mínimo 1 línea | Al enviar | "Agregue al menos una línea a la solicitud" |
| Cada línea tiene descripción | Al agregar línea | "La descripción es requerida" |
| Cada línea tiene cantidad > 0 | Al agregar línea | "La cantidad debe ser mayor a cero" |
| Cada línea tiene Desde y Hasta | Al agregar línea | "Indique origen y destino" |
| Desde ≠ Hasta | Al agregar línea | "El origen y destino no pueden ser iguales" |

### 7.7 — Fallback Universal en Dropdowns

**Problema:** Las tablas maestras están incompletas. Si un usuario no encuentra un equipo, ubicación, o persona en el dropdown, no debe quedarse bloqueado.

**Solución:** Cada dropdown que hace lookup a una tabla maestra tiene una opción "No está en la lista" o un campo de texto libre alternativo.

**Flujo:**
1. Usuario busca en el dropdown → no encuentra el valor
2. Activa el modo fallback (checkbox o botón "No está en lista")
3. Escribe el valor en texto libre
4. Al guardar, el sistema crea un registro en `fallback_suggestions`
5. Un admin revisa las sugerencias y las aprueba (creando el registro en la tabla maestra) o las rechaza
6. Mientras tanto, la solicitud/línea funciona con el texto libre

**Campos con fallback:** Equipo, Ubicación (Desde/Hasta), Persona, Unidad de medida

---

## 8. Estados y Transiciones

### 8.1 — Estados de Solicitud (mobilization_requests)

```
                                    ┌─────────────┐
                              ┌────→│  Cancelada   │
                              │     └─────────────┘
                              │
┌──────────┐    ┌──────────┐  │   ┌─────────────┐    ┌─────────────┐
│ Borrador │───→│ Enviada  │──┼──→│ En Proceso  │───→│ Completada  │
└──────────┘    └──────────┘  │   └─────────────┘    └─────────────┘
     │               │        │         │                    ▲
     │               │        │         │             ┌──────┤
     └──(cancelar)───┘        │         └────────────→│  Parcial   │
                              │                       └────────────┘
                              └─────────(cancelar por logística)
```

| Transición | Trigger | Quién |
|-----------|---------|-------|
| → Borrador | Se crea la solicitud | Sistema (auto) |
| Borrador → Enviada | Usuario hace click en "Enviar" | `pm` |
| Borrador → Cancelada | Usuario cancela | `pm` |
| Enviada → En Proceso | AL MENOS una línea cambia a "Programada" | Sistema (auto) |
| Enviada → Cancelada | Solicitante o Charris cancela | `pm`, `logistica` |
| En Proceso → Completada | TODAS las líneas están en "Entregada" | Sistema (auto) |
| En Proceso → Parcial | ALGUNAS líneas están en "Entregada" y el resto en "Cancelada" o inactivas | Sistema (auto) |
| En Proceso → Cancelada | Charris cancela toda la solicitud | `logistica` |

### 8.2 — Estados de Línea (mr_lines)

```
┌───────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────┐
│ Pendiente │───→│ Programada  │───→│ En Tránsito  │───→│ Entregada │
└───────────┘    └─────────────┘    └──────────────┘    └───────────┘
     │                │                    │                   ▲
     │                │                    │            ┌──────┤
     └──(cancelar)────┴────(cancelar)──────┘           │ Parcial  │
                                                       └──────────┘
```

| Transición | Trigger |
|-----------|---------|
| → Pendiente | Se crea la línea |
| Pendiente → Programada | Charris asigna la línea a un viaje |
| Programada → En Tránsito | Se registra evento de Salida en el viaje |
| En Tránsito → Entregada | Se registra evento de Entrega y cantidad_entregada = cantidad_solicitada |
| En Tránsito → Parcial | Se registra Entrega pero cantidad_entregada < cantidad_solicitada |
| Cualquiera → Cancelada | Cancelación manual |

### 8.3 — Estados de Viaje (trips)

```
┌─────────────┐    ┌──────────┐    ┌─────────────┐
│ Programado  │───→│ En Ruta  │───→│ Completado  │
└─────────────┘    └──────────┘    └─────────────┘
      │                 │
      └──(cancelar)─────┘
      ↓
┌─────────────┐
│  Cancelado  │
└─────────────┘
```

| Transición | Trigger |
|-----------|---------|
| → Programado | Charris crea el viaje |
| Programado → En Ruta | Se registra evento de Salida |
| En Ruta → Completado | Se registra evento de Retorno |
| Programado → Cancelado | Charris cancela el viaje |

### 8.4 — Regla de cascada de estados

Cuando el estado de una línea cambia, el sistema re-evalúa el estado de la solicitud padre:

```
Si TODAS las líneas = Entregada → Solicitud = Completada
Si TODAS las líneas = Cancelada → Solicitud = Cancelada
Si ALGUNA línea = Entregada Y ALGUNA = Pendiente/Programada → Solicitud = En Proceso
Si ALGUNA línea = Entregada Y resto = Cancelada → Solicitud = Parcial
Si ALGUNA línea = Programada Y ninguna Entregada → Solicitud = En Proceso
```

---

## 9. Notificaciones y Automatizaciones

### 9.1 — Notificaciones (MVP: email; Fase 2: WhatsApp)

| Evento | Destinatario | Contenido |
|--------|-------------|-----------|
| Solicitud enviada | Charris (`logistica`) | "Nueva solicitud {ID} de {Solicitante} para {Proyecto}. {N} líneas. Fecha requerida: {Fecha}." |
| Solicitud programada | Solicitante (`pm`) | "Tu solicitud {ID} ha sido programada. Viaje {ViajeID} para el {Fecha}." |
| Solicitud completada | Solicitante (`pm`) | "Tu solicitud {ID} ha sido completada." |
| Solicitud vencida | Charris + Solicitante | "⚠️ La solicitud {ID} tiene fecha requerida {Fecha} y no ha sido programada." |
| Viaje del día | Conductor (`campo`) | "Tienes {N} viajes programados para hoy." (Fase 2) |
| Sugerencia de fallback | Admin | "El usuario {Nombre} sugirió agregar '{Valor}' a la tabla {Tabla}." |

### 9.2 — Automatizaciones

| Automatización | Trigger | Acción |
|---------------|---------|--------|
| Auto-ID solicitud | Primer guardado de solicitud | Genera ID secuencial por proyecto |
| Auto-ID viaje | Creación de viaje | Genera ID secuencial por año |
| Cálculo de prioridad | Cada consulta o diariamente | Recalcula prioridad de todas las solicitudes abiertas |
| Cascada de estados | Cambio de estado en línea | Re-evalúa estado de solicitud padre |
| Clasificación de tipo | Creación de línea / asignación a viaje | Determina movilización/desmovilización/movimiento interno |
| Generación de nota de entrega | Evento de Entrega registrado | Crea nota de entrega con datos del viaje |
| Generación de borrador de facturación | Manual (Charris pide generar) | Agrega todos los viajes completados del período |
| Alerta de vencimiento | Diariamente (scheduled) | Identifica solicitudes con fecha requerida próxima o pasada sin programar |
| Auditoría | Cada cambio en cualquier tabla transaccional | Registra en audit_log |

---

## 10. Requisitos No Funcionales

### 10.1 — Rendimiento
- Tiempo de carga de cualquier pantalla: < 3 segundos
- Tiempo de guardado de solicitud con líneas: < 2 segundos
- El backlog debe poder mostrar 500+ líneas sin degradación

### 10.2 — Disponibilidad
- El sistema debe estar disponible 24/7 (cloud hosting)
- Downtime aceptable: < 4 horas/mes para mantenimiento
- Los datos deben tener backup diario automático

### 10.3 — Seguridad
- Autenticación por email + contraseña (o SSO si se integra M365 después)
- Cada usuario tiene un rol. Los permisos se aplican a nivel de base de datos (RLS), no solo en el frontend
- Los datos no deben ser accesibles sin autenticación
- HTTPS obligatorio

### 10.4 — Usabilidad
- Diseñado para usuarios no técnicos (ingenieros de campo, almacenistas, conductores)
- Debe funcionar en computadoras de escritorio Y en celulares (responsive)
- Los formularios deben ser simples — máximo 2 clicks para llegar a cualquier acción
- Idioma: español
- Los dropdowns deben tener búsqueda (no scroll infinito para 392 equipos)

### 10.5 — Compatibilidad
- Navegadores: Chrome, Edge, Safari (últimas 2 versiones)
- Dispositivos: Desktop (1280px+), Tablet (768px+), Mobile (360px+)
- No requiere instalación de app nativa (web app)

### 10.6 — Escalabilidad
- El esquema de datos debe soportar futuros módulos (inventario, mantenimiento, compras) sin reestructuración
- Las tablas de inventario, procurement y mantenimiento se crean vacías desde el día 1
- El sistema debe poder manejar 10,000+ registros por tabla transaccional sin degradación

### 10.7 — Mantenibilidad
- El código debe ser entendible por un developer de nivel medio con ayuda de IA
- Documentación del esquema de datos y APIs
- Un ingeniero no-developer (como James) debe poder administrar el sistema (gestión de masters, usuarios, roles) sin tocar código

### 10.8 — Offline (Fase 2)
- Las pantallas de ejecución en campo deben funcionar sin internet (PWA con service workers)
- Los datos se sincronizan cuando recupera conexión
- Esto NO es requisito del MVP

---

## 11. Alcance del MVP vs Futuro

### 11.1 — MVP (Mes 1–2)

| Incluido | No incluido |
|----------|------------|
| Crear/editar/enviar solicitudes con líneas | Inspecciones de equipo |
| Backlog de líneas para Charris | Two-Week Look-Ahead (calendario) |
| Programación de viajes (crear, asignar líneas) | Integración OC (lookup a OC/líneas) |
| Registro de eventos (salida, entrega, retorno) | Categorías de materiales |
| Nota de entrega auto-generada | Exportación a PDF |
| Facturación semi-automática | WhatsApp notifications |
| Dashboard con KPIs | Offline / PWA |
| Gestión de tablas maestras | Códigos QR |
| Roles y permisos (RLS) | Firma digital |
| Fallback universal | Integración Spectrum |
| Notificaciones por email | App del conductor |
| Bitácora de movilizaciones (vista filtrable) | |
| Auto-IDs, prioridad auto-calculada | |
| Clasificación automática tipo movilización | |

### 11.2 — Fase 2 (Mes 2–3)

- Inspección de equipos (42 ítems)
- Two-Week Look-Ahead (calendario)
- Integración OC (lookup a OC y selección de línea)
- Categorías de materiales
- Exportación a PDF
- Rol del conductor con registro de eventos móvil
- PWA para uso offline en campo

### 11.3 — Fase 3 (Mes 3–6)

- Módulo de Inventario/Almacén (IC-LOG-PO-04)
- WhatsApp Business API
- Dashboards avanzados (Metabase)
- Integración con Spectrum (lectura)
- Códigos QR para equipos

### 11.4 — Futuro (6+ meses)

- Módulos adicionales: Compras, Mantenimiento, Herramientas, Combustible, Equipos Menores
- Integración bidireccional con Spectrum
- App nativa (si se justifica)
- Analítica predictiva

---

## 12. Preguntas Abiertas

Estas preguntas necesitan respuesta antes o durante la implementación. No bloquean el inicio del desarrollo pero afectan decisiones de diseño.

| # | Pregunta | Impacta | Quién debe responder |
|---|---------|---------|---------------------|
| 1 | ¿Cómo se proratea el costo cuando un viaje sirve a múltiples proyectos? ¿Se divide? ¿Se cobra completo a cada uno? | Facturación | Charris + Finanzas |
| 2 | ¿Cuántos viajes típicamente se necesitan para mover una grúa completa? ¿Siempre es el mismo patrón? | Facturación (agrupación de grúa) | Charris |
| 3 | ¿Las categorías de materiales: quién las define? ¿Cuántas serían inicialmente? | Modelo de datos, UI | James + Yoseph |
| 4 | ¿El conductor necesita registrar algo en la primera fase? ¿O solo Yoseph y Charris? | Roles, UI | Adolfo Valderrama |
| 5 | ¿Hay algún caso donde una solicitud NO viene de un ingeniero de proyecto? ¿Charris puede auto-generar? | Flujo de solicitud | Charris |
| 6 | ¿Qué pasa si Charris necesita hacer una movilización urgente sin solicitud previa? | Flujo, excepciones | Charris |
| 7 | ¿Los reportes de Valderrama (estado semanal de equipos) eventualmente se digitalizan en este sistema? | Alcance futuro | Adolfo Valderrama |
| 8 | ¿Hay movilizaciones que ejecutan terceros (subcontratistas de transporte)? ¿Cómo se manejan? | Modelo de datos | Charris |
| 9 | ¿Los adjuntos de la solicitud son típicamente qué tipo de documentos? ¿Planos, OC en PDF, fotos? | Storage, UI | Ingenieros |
| 10 | ¿La empresa va a adquirir M365? Si sí, ¿se quiere SSO con Microsoft para login? | Auth, integración | Jenniffer Troetsch |

---

## 13. Glosario

| Término | Definición |
|---------|-----------|
| **Solicitud de Movilización** | Pedido formal de un ingeniero de proyecto para mover equipo o material de un punto A a un punto B. Identificada con ID único (ej: 25-506-SM-024). |
| **Línea de Solicitud** | Un ítem individual dentro de una solicitud. Cada línea describe un equipo o material con su origen, destino, cantidad y código de costo. |
| **Viaje (Trip)** | Una salida física de un vehículo de transporte. Puede llevar líneas de múltiples solicitudes. Tiene conductor, vehículo, remolque, fecha, y tarifa asignados. |
| **Backlog** | Lista de todas las líneas pendientes que esperan ser programadas. Vista principal de Charris. |
| **Programar** | Acción de Charris de tomar líneas del backlog y asignarlas a un viaje con recursos específicos. |
| **Nota de Entrega** | Documento que confirma la entrega de material/equipo en destino. Se genera automáticamente del viaje. |
| **Bitácora de Movilizaciones** | Registro histórico de todos los viajes. Versión digital del IC-LOG-F-06-04. |
| **Facturación de Movilizaciones** | Resumen mensual de costos de movilización por proyecto. Versión digital del IC-LOG-06-05. |
| **Tarifa de Movilización** | Costo fijo asociado a un tipo de vehículo o tipo de equipo movilizado. 14 códigos predefinidos (ej: MVCB50 = $500). |
| **Permiso ATT** | Permiso de la Autoridad de Tránsito y Transporte Terrestre requerido para transportar cargas sobre-dimensionadas. |
| **Escolta** | Acompañamiento policial o de tránsito requerido para ciertas cargas sobre-dimensionadas. |
| **Fallback Universal** | Mecanismo que permite al usuario escribir texto libre cuando no encuentra un valor en un dropdown, creando una sugerencia para que un admin lo agregue al catálogo. |
| **Cascada de Estados** | Lógica automática que actualiza el estado de una solicitud basándose en el estado combinado de todas sus líneas. |
| **Código de Costo** | Clasificación contable de Spectrum. Formato: {Proyecto}-{Fase}-{TipoCosto}. Ejemplo: 25-506-01.7113-EQI. |
| **Spectrum** | ERP de construcción (Viewpoint/Trimble) usado por ICONSA para contabilidad, job costing y gestión parcial de equipos. |
| **Chilibre** | Ubicación del taller central de ICONSA donde se almacenan equipos, materiales, y se coordina logística. |
| **Charris** | Carlos Charris — Coordinador de Logística en Chilibre. Usuario principal del módulo de programación. Dueño del procedimiento IC-LOG-PO-06. |
| **MVP** | Minimum Viable Product — la versión más pequeña del sistema que entrega valor real a usuarios reales. |
| **RLS** | Row Level Security — seguridad a nivel de fila en la base de datos que asegura que cada usuario solo vea los datos que le corresponden. |
| **PWA** | Progressive Web App — aplicación web que puede funcionar offline y se puede "instalar" en el celular como si fuera una app nativa. |
| **Fallback** | Mecanismo alternativo cuando el flujo normal no funciona (ej: el valor no está en el dropdown). |
| **Feature Specification** | Este documento. Define con precisión qué hace el sistema, para quién, y bajo qué reglas. |

---

## Control de Versiones de Este Documento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-02-24 | Creación inicial. Cubre el sistema completo de movilizaciones con todo el contexto acumulado de 7 semanas de análisis. |

---

*Este documento es la fuente de verdad para el Sistema Digital de Movilizaciones de ICONSA. Cualquier decisión de implementación que contradiga lo aquí especificado debe ser discutida y este documento debe actualizarse antes de proceder.*
