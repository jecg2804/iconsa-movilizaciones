# ICONSA Movilizaciones - Estado del Proyecto

Ultima actualizacion: 2026-03-03

Actualizar este archivo despues de CADA paso completado.


## INFRAESTRUCTURA

Supabase:
- [x] Proyecto creado (Oregon us-west-2)
- [x] URL: https://bzeoszympkkicwlfdtcn.supabase.co

GitHub:
- [x] Repo: jecg2804/iconsa-movilizaciones (privado)
- [x] Primer push completado

VS Code:
- [x] Next.js 16.1.6 inicializado
- [x] .env.local con credenciales Supabase
- [x] localhost:3000 funcionando (pagina default Next.js)

Documentacion:
- [x] README.md en raiz
- [x] docs/ICONSA_Feature_Specification_v2.docx
- [x] docs/ICONSA_MVP_Sprint_Brief.md
- [x] docs/ICONSA_Guia_Operativa.md
- [x] docs/PROJECT_STATUS.md (este archivo)


## BASE DE DATOS - TABLAS MAESTRAS

- [x] projects - 4 registros (ASTIBAL, Paraiso, Muelle 14, Costa Norte)
- [x] people - 9 registros de prueba
- [x] person_projects - 2 registros (Edward a Muelle 14 y Paraiso)
- [x] equipment - tabla creada, VACIA (pendiente ~392 registros)
- [x] vehicles - tabla creada, VACIA (pendiente ~56 registros)
- [x] locations - 9 registros (6 originales + Gamboa, Melones, Oficina Central)
- [x] mobilization_rates - 14 registros, completo
- [x] units - 11 registros, completo
- [x] cost_codes - tabla creada, VACIA (pendiente codcost.csv)
- [x] sequences - tabla creada para auto-IDs


## BASE DE DATOS - TABLAS TRANSACCIONALES

- [x] sm_requests - creada, vacia (incluye columna attachments JSONB)
- [x] sm_request_lines - creada, vacia (incluye fallbacks: from_text, to_text, equipment_text, unit_text)
- [x] trips - creada, vacia
- [x] trip_line_assignments - creada, vacia
- [x] trip_events - creada, vacia
- [x] suggestions - creada, vacia


## BASE DE DATOS - TRIGGERS

- [x] generate_request_id() - auto-genera 25-506-SM-001
- [x] generate_trip_id() - auto-genera MOV-2026-001 + codigo 4 digitos
- [x] calculate_priority() - Vencida/Urgente/Proxima/Normal
- [x] cascade_line_status() - actualiza header segun lineas


## BASE DE DATOS - COMPLETADO (auditoria 2026-03-03)

- [x] Columnas fallback: from_text, to_text, equipment_text, unit_text
- [x] Columna attachments JSONB en sm_requests
- [x] Fix sequences UNIQUE constraint para NULL en trips
- [x] Ubicaciones adicionales: Gamboa, Melones, Oficina Central
- [x] 10 indices de performance creados


## BASE DE DATOS - PENDIENTE

- [x] RLS (Row Level Security) - habilitado con politicas de desarrollo
- [ ] Importar Equipment.csv (equipos, excluyendo vehiculos que ya estan separados)
- [ ] Importar Vehiculos.csv (56 registros, ya separados del Equipment.csv)
- [ ] Importar codcost.csv (varia por proyecto, empezar con Muelle 14 y Paraiso)
- [ ] Supabase Auth - setup de autenticacion


## APLICACION NEXT.JS - PENDIENTE

- [ ] Cliente Supabase (src/lib/supabase.ts)
- [ ] Tipos TypeScript (src/types/database.ts)
- [ ] Layout con navegacion
- [ ] Login
- [ ] Dashboard
- [ ] Mis Solicitudes (lista filtrable)
- [ ] Nueva/Detalle Solicitud (formulario header + lineas + fallbacks)
- [ ] Programacion/Backlog (vista Charris)
- [ ] Detalle Viaje
- [ ] Mis Viajes (vista conductor)
- [ ] Nota de Entrega


## DECISIONES PENDIENTES (James consultar en ICONSA)

Astrid (clasificacion de equipos):
- [ ] Confirmar: EQA = equipos menores. No mostrar ING ni MOV en dropdown de solicitudes
- [ ] Definir cuales vehiculos son "flota de transporte" (Charris) vs "vehiculos de proyecto"
- [ ] Categorias CSI para materiales (documento ya agregado al proyecto)

Charris (logistica):
- [ ] Confirmar su flota: cuales cabezales, plataformas, remolques usa para movilizaciones
- [ ] Ubicaciones adicionales frecuentes (proveedores con sucursales: Cochez Colon, Cochez Mananitas, etc.)

Ingenieros de proyecto:
- [ ] Quienes exactamente crean solicitudes (nombres, correos)
- [ ] Confirmar: a veces piden vehiculos (pickup, etc.) para uso interno en proyecto

General:
- [ ] Proyectos adicionales activos mas alla de los 4 actuales
- [ ] Codigos de costo para ASTIBAL y Costa Norte
- [ ] Departamentos y roles del Employee_Listing (161 empleados - cuales necesitan acceso)
- [ ] Metricas para reportes semanales de Valderrama


## IDEAS PARA FASES FUTURAS (no MVP)

- Solicitud de vehiculos: agregar vehicle_id a sm_request_lines para cuando proyectos pidan vehiculos (MVP usa fallback texto libre)
- OC con OCR: subir PDF de orden de compra, AI extrae datos a Supabase
- WhatsApp: solicitudes por voz via WhatsApp Business API
- Inventario: tracking de stock por ubicacion
- Inspecciones: formularios KoboToolbox sincronizados
- Facturacion: dashboard mensual con exportacion



## LOGICA DE FILTROS (decisiones tomadas)

Dropdown "Equipo" en solicitud (ingeniero):
- Tabla: equipment
- Excluir: equipment_type = Equipos de Ingenieria (ING)
- Excluir: equipos de movilizacion (cabezales, remolques - esos son flota de Charris)
- EQA = equipos menores (flag importante para reportes)
- Incluir fallback "No esta en lista" siempre

Dropdown "Vehiculo" en programacion (Charris):
- Tabla: vehicles
- Solo flota de transporte (pendiente definir con Astrid cuales exactamente)

Dropdown "Desde/Hasta" en solicitud:
- Tabla: locations
- Incluir todas + fallback "No esta en lista" para proveedores no registrados

Si proyecto pide vehiculo (ej: pickup para uso interno):
- MVP: usa fallback texto libre en equipment_text
- Post-MVP: agregar vehicle_id a sm_request_lines

## REFERENCIA RAPIDA

- Demo: demo_v8.jsx
- Feature Spec: docs/ICONSA_Feature_Specification_v2.docx
- Sprint Brief: docs/ICONSA_MVP_Sprint_Brief.md
- SOP: IC-LOG-PO-06
- Repo: https://github.com/jecg2804/iconsa-movilizaciones
- Supabase: https://bzeoszympkkicwlfdtcn.supabase.co
