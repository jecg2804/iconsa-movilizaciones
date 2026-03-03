# ICONSA - Sistema de Movilizaciones

Sistema digital para gestión de movilizaciones de equipo pesado y materiales de ICONSA (Ingeniería Continental S.A.).

Reemplaza el proceso actual basado en papel, WhatsApp y Excel con una aplicación web centralizada que cubre desde la solicitud hasta la entrega confirmada.

## Stack Tecnológico

| Componente | Herramienta | Propósito |
|-----------|-------------|-----------|
| Base de Datos | Supabase (PostgreSQL) | Tablas, relaciones, triggers, auth, API automática |
| Autenticación | Supabase Auth | Login email/contraseña, sesiones, JWT |
| Frontend + Backend | Next.js 16 (App Router) | Framework React full-stack con TypeScript |
| Estilos | Tailwind CSS | Framework CSS utility-first, mobile-first |
| Íconos | Lucide React | Librería de íconos SVG |
| Fechas | date-fns | Manejo de fechas en español |
| Control de Versiones | GitHub | Este repositorio |

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- Cuenta en [Supabase](https://supabase.com/) con el proyecto ICONSA creado
- Git configurado con acceso a este repositorio

## Instalación y Setup

### 1. Clonar el repositorio

```bash
git clone https://github.com/jecg2804/iconsa-movilizaciones.git
cd iconsa-movilizaciones
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]
```

Estas credenciales se obtienen en Supabase → Settings → API.

**IMPORTANTE:** `.env.local` está en `.gitignore` y NUNCA se sube al repositorio. Cada desarrollador debe crear el suyo con las credenciales del proyecto.

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000` en el browser.

## Base de Datos

### Schema

La base de datos tiene 3 capas:

**Tablas Maestras** (datos de referencia, cambian poco):
- `projects` — Proyectos activos de ICONSA (ej: Muelle 14, Paraíso)
- `people` — Usuarios del sistema con roles (admin, pm, logistica, campo, almacen)
- `person_projects` — Qué proyectos puede ver cada PM (relación N:N)
- `equipment` — Equipo pesado que se moviliza (grúas, excavadoras, ~392 registros)
- `vehicles` — Vehículos de transporte (cabezales, plataformas, ~56 registros)
- `locations` — Ubicaciones (Taller Chilibre, proyectos, almacenes)
- `mobilization_rates` — Tarifas por tipo de movilización (14 tarifas)
- `units` — Unidades de medida (und, kg, ton, m², etc.)
- `cost_codes` — Códigos de costo por proyecto

**Tablas Transaccionales** (donde ocurre la operación diaria):
- `sm_requests` — Solicitudes de movilización (header)
- `sm_request_lines` — Líneas dentro de cada solicitud (qué mover, de dónde, a dónde)
- `trips` — Viajes programados por logística (con conductor, vehículo, tarifa)
- `trip_line_assignments` — Tabla pivote línea↔viaje (relación N:N)
- `trip_events` — Eventos de ejecución (salida, llegada, entrega, retorno)
- `sequences` — Contadores para auto-generación de IDs
- `suggestions` — Fallback cuando un valor no existe en los dropdowns

### Triggers Automáticos

| Trigger | Tabla | Función |
|---------|-------|---------|
| `trg_request_id` | sm_requests | Auto-genera ID: `{proyecto}-SM-{###}` (ej: 25-506-SM-001) |
| `trg_trip_id` | trips | Auto-genera ID: `MOV-{YYYY}-{###}` + código de confirmación 4 dígitos |
| `trg_priority` | sm_requests | Auto-calcula prioridad (Vencida/Urgente/Próxima/Normal) según fecha |
| `trg_cascade_status` | sm_request_lines | Actualiza estado del header cuando cambian las líneas |

### Setup de la Base de Datos

Si estás seteando la BD desde cero, ejecuta los scripts SQL en Supabase SQL Editor en este orden:

1. **Tablas maestras** — CREATE TABLE para las 10 tablas de referencia
2. **Tablas transaccionales** — CREATE TABLE para las 7 tablas operativas
3. **Triggers y funciones** — 4 funciones PL/pgSQL con sus triggers
4. **Seed data** — Datos iniciales (proyectos, tarifas, unidades, usuarios de prueba)

Los scripts SQL están documentados en el Feature Specification (sección de Data Model).

### Importación de Datos Masivos

Archivos CSV con datos de producción (carpeta `/docs/data/`):
- `Equipment.csv` — ~392 equipos de Spectrum
- `Vehiculos.csv` — 56 vehículos de transporte
- `codcost.csv` — Códigos de costo por proyecto
- `Employee_Listing.csv` — 161 empleados (requiere limpieza)

## Estructura del Proyecto

```
iconsa-movilizaciones/
├── src/
│   ├── app/                    # Rutas (App Router)
│   │   ├── layout.tsx          # Layout principal (nav, header)
│   │   ├── page.tsx            # Página de inicio / redirect
│   │   ├── login/              # Pantalla de login
│   │   ├── dashboard/          # Dashboard con KPIs
│   │   ├── solicitudes/        # CRUD de solicitudes
│   │   │   ├── page.tsx        # Lista de solicitudes
│   │   │   ├── nueva/          # Crear solicitud
│   │   │   └── [id]/           # Ver/editar solicitud
│   │   ├── programacion/       # Backlog + viajes (Charris)
│   │   │   ├── page.tsx        # Backlog de líneas
│   │   │   ├── viaje/          # CRUD de viajes
│   │   │   └── calendario/     # Two-week look-ahead
│   │   ├── mis-viajes/         # Vista del conductor
│   │   │   └── [id]/           # Detalle + eventos
│   │   └── admin/              # Gestión de masters
│   ├── components/             # Componentes reutilizables
│   ├── lib/                    # Utilidades, cliente Supabase, helpers
│   └── types/                  # Tipos TypeScript
├── public/                     # Archivos estáticos (logo, íconos)
├── docs/                       # Documentación del proyecto
│   ├── data/                   # CSVs de datos maestros
│   └── ICONSA_Feature_Specification_v2.docx
├── .env.local                  # Variables de entorno (NO en Git)
├── package.json                # Dependencias
├── tailwind.config.ts          # Configuración de estilos
└── tsconfig.json               # Configuración TypeScript
```

## Roles y Permisos

| Rol | Quién | Puede hacer |
|-----|-------|-------------|
| `admin` | James Cucalón | Todo. Gestión de masters, ver todas las pantallas. |
| `pm` | Ingenieros de proyecto | Crear solicitudes, ver estado de SUS proyectos. |
| `logistica` | Carlos Charris | Ver backlog completo, programar viajes, asignar conductores. |
| `campo` | Conductores (Coco, Bonilla, etc.) | Ver sus viajes asignados, registrar eventos de ejecución. |
| `almacen` | Yoseph Caballero | Confirmar recepciones, ver entregas. |

## Flujo del Sistema

```
Ingeniero crea solicitud → Charris ve en backlog → Programa viaje
→ Conductor ve viaje asignado → Registra salida → Llega a destino
→ Receptor da código 4 dígitos → Entrega confirmada → Ciclo cerrado
→ Dashboard actualizado en tiempo real
```

## Convenciones

- **Idioma de la interfaz:** 100% español
- **IDs de solicitud:** `{código-proyecto}-SM-{###}` (ej: 25-506-SM-001)
- **IDs de viaje:** `MOV-{YYYY}-{###}` (ej: MOV-2026-001)
- **Código de confirmación:** 4 dígitos generados automáticamente por viaje
- **Colores de estado:**
  - Vencida/Cancelada = Rojo (#C0392B)
  - Urgente/En Proceso = Naranja (#B45309)
  - Programada = Morado (#553C9A)
  - Normal/Completada = Verde (#1A7F5A)
  - Enviada = Azul (#0A6EBD)

## Documentos de Referencia

- **Feature Specification v2** — Especificación completa del sistema (en `/docs/`)
- **Sprint Brief MVP** — Documento de contexto para desarrollo (en `/docs/`)
- **IC-LOG-PO-06** — SOP de movilizaciones de ICONSA (proceso papel original)

## Equipo

- **James Cucalón** — Product Owner / Main Builder
- **Andy** — Co-developer (ASP.NET, infraestructura)
- **Claude Code** — AI pair programmer (VS Code)

## Contacto

Para acceso al repositorio o al proyecto de Supabase, contactar a James Cucalón.
