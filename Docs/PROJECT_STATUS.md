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

- [ ] RLS (Row Level Security) - habilitar + politicas de desarrollo
- [ ] Importar Equipment.csv (~392 registros)
- [ ] Importar Vehiculos.csv (56 registros)
- [ ] Importar codcost.csv
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

- [ ] Lista completa ubicaciones reales (proveedores con sucursales)
- [ ] Proyectos adicionales activos
- [ ] Quienes crean solicitudes (nombres, correos)
- [ ] Codigos de costo ASTIBAL y Costa Norte
- [ ] Metricas reportes semanales Valderrama


## IDEAS PARA FASES FUTURAS (no MVP)

- OC con OCR: subir PDF de orden de compra, AI extrae datos a Supabase
- WhatsApp: solicitudes por voz via WhatsApp Business API
- Inventario: tracking de stock por ubicacion
- Inspecciones: formularios KoboToolbox sincronizados
- Facturacion: dashboard mensual con exportacion


## REFERENCIA RAPIDA

- Demo: demo_v8.jsx
- Feature Spec: docs/ICONSA_Feature_Specification_v2.docx
- Sprint Brief: docs/ICONSA_MVP_Sprint_Brief.md
- SOP: IC-LOG-PO-06
- Repo: https://github.com/jecg2804/iconsa-movilizaciones
- Supabase: https://bzeoszympkkicwlfdtcn.supabase.co
