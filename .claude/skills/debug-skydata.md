---
name: debug-skydata
description: Script standalone para inspeccionar el payload crudo de SkyData API. Usar cuando un trip con vehículo GPS no muestra mapa, cuando el mapa se ve gris, o cuando SkyData responde raro.
---

# Skill: debug-skydata

Probe manual de `https://app.skydataglobal.com/api/fleet/status` que imprime
el payload raw, el shape normalizado, y un field-presence report. Creado tras
el bug de 2026-04-20 donde el normalizer asumía nomenclatura `lat`/`lon` pero
SkyData usa `x`/`y` geométrica.

## Cuándo correrlo

- Un trip con `vehicle.gps_vehicle_id` seteado renderiza el placeholder
  "sin coordenadas válidas" o un canvas gris.
- `/api/gps/trip/[tripId]/position` devuelve `{ status: 'stale' }` con
  coords que parecen inválidas.
- Errores intermitentes del upstream.
- Post-update de la plataforma SkyData (field renames, cambios de auth).

## Comando

```bash
npx tsx --env-file=.env.local scripts/debug-skydata.ts
```

Requiere que `.env.local` tenga `SKYDATA_API_KEY` y `SKYDATA_API_PASSWORD`
con valores reales. `npx tsx` descarga tsx en la primera corrida (~100KB).

## Qué imprime

1. **Raw object** del primer vehículo (shape exacto que devuelve SkyData).
2. **Normalized** del mismo vehículo usando el `normalize()` exportado de
   `src/lib/gps/skydata-client.ts` — si el script está desincronizado del
   runtime, este diff lo expone.
3. **Fresh/stale breakdown** con el umbral de 48h (mismo que `isStale()`).
4. **Field presence report** — por cada field esperado, cuántos vehículos
   lo tienen. Si `x: 0/13` aparece después de un update, SkyData renombró
   el field.
5. **Coord sanity** — cuántos vehículos pasarían el guard `isValidPosition`.

## Por qué existe

El discovery original de SkyData documentó nombres de fields basado en
convención cartográfica estándar (`lat`/`lon`). El vendor real usa
convención geométrica (`x`=longitud, `y`=latitud) sin avisarlo en el doc.
El normalizer leía `row.lat` (undefined) y caía al fallback `0` — todos
los vehículos renderizaban en (0,0), el mapa se veía gris uniforme.

**Lección generalizable:** para APIs externas mal documentadas, hacer un
dump raw temprano vale más que confiar en nombres "obvios". Este script
congela ese probe como tool reutilizable, y el field-presence report
detecta drift futuro en un solo comando.

## Lo que NO hace

- **No** se ejecuta en ningún hook, build, o pipeline.
- **No** modifica datos — es GET read-only al endpoint de fleet status.
- **No** usa credenciales fallback — aborta si falta alguna env var.
