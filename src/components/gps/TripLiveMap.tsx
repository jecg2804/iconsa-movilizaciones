'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Crosshair } from 'lucide-react'
// Type-only import: no afecta el bundle ni el dynamic import, solo tipado.
import type { MapRef } from 'react-map-gl/maplibre'
import type { GpsTripPosition, VehiclePosition } from '@/lib/gps/types'

// MapLibre touches `window`. Dynamic import + ssr:false avoids the SSR break.
const Map = dynamic(
  () => import('react-map-gl/maplibre').then((m) => m.default),
  { ssr: false },
)
const Marker = dynamic(
  () => import('react-map-gl/maplibre').then((m) => m.Marker),
  { ssr: false },
)

const TILE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const POLL_INTERVAL_MS = 30_000
const MAX_CONSECUTIVE_ERRORS = 3

interface TripLiveMapProps {
  tripId: string
  variant: 'full' | 'compact'
}

interface FetchState {
  data: GpsTripPosition | null
  error: string | null
  consecutiveErrors: number
  lastFetchedAt: number | null
}

function formatAgoSeconds(epochSec: number): string {
  const ageSec = Math.max(0, Math.floor(Date.now() / 1000 - epochSec))
  if (ageSec < 60) return `hace ${ageSec} seg`
  const ageMin = Math.floor(ageSec / 60)
  if (ageMin < 60) return `hace ${ageMin} min`
  const ageH = Math.floor(ageMin / 60)
  return `hace ${ageH} h`
}

function formatHoursAgo(epochSec: number): string {
  const ageH = Math.max(1, Math.floor((Date.now() / 1000 - epochSec) / 3600))
  return `${ageH} h`
}

function isValidPosition(p: VehiclePosition): boolean {
  // SkyData puede devolver 0/0 para devices sin fix GPS o recién instalados.
  // Panamá está aproximadamente en lat 7-10, lon -83 a -77.
  // Filtro amplio pero descarta los 0/0 y cualquier valor obviamente inválido.
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false
  if (p.lat === 0 && p.lon === 0) return false
  if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return false
  return true
}

export default function TripLiveMap({ tripId, variant }: TripLiveMapProps) {
  const heightClass = variant === 'full' ? 'h-[400px]' : 'h-[250px]'

  const [state, setState] = useState<FetchState>({
    data: null,
    error: null,
    consecutiveErrors: 0,
    lastFetchedAt: null,
  })
  // Lazy initializer — evaluamos document.visibilityState solo al mount.
  // Default true cubre el SSR/undefined path aunque el componente es 'use client'.
  const [isVisible, setIsVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )
  const isUnmountedRef = useRef(false)

  // Auto-follow: el mapa se recentra en cada fix GPS nuevo hasta que el usuario
  // interactúe (drag, zoom, rotate, pitch). Click en "Seguir vehículo" resetea
  // el flag y retoma el seguimiento automático.
  const [userInteracted, setUserInteracted] = useState(false)
  const mapRef = useRef<MapRef | null>(null)
  // Epoch del último fix que disparó un easeTo — evita re-seguir la misma
  // posición si la API devuelve data con epoch sin cambios.
  const lastFollowedEpochRef = useRef(0)

  const fetchPosition = useCallback(async () => {
    try {
      const resp = await fetch(`/api/gps/trip/${tripId}/position`, {
        cache: 'no-store',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const json = (await resp.json()) as GpsTripPosition
      if (isUnmountedRef.current) return
      setState({
        data: json,
        error: null,
        consecutiveErrors: 0,
        lastFetchedAt: Date.now(),
      })
    } catch (err) {
      if (isUnmountedRef.current) return
      setState((prev) => ({
        data: prev.data,
        error: err instanceof Error ? err.message : 'Error desconocido',
        consecutiveErrors: prev.consecutiveErrors + 1,
        lastFetchedAt: prev.lastFetchedAt,
      }))
    }
  }, [tripId])

  // Derivado: pollear solo si la tab está visible Y el último status no es stale.
  // Un dispositivo stale (>48h) no va a reportar en los próximos 30s por definición;
  // tab oculta significa que nadie consume el dato. Los dos casos pausan requests.
  const isStaleStatus = state.data?.status === 'stale'
  const shouldPoll = isVisible && !isStaleStatus

  // Effect 1: mount/unmount tracking del ref. Corre UNA vez — separado del
  // polling effect porque ese re-corre en cada flip de shouldPoll y setearía
  // isUnmountedRef.current = true en cada pausa, rompiendo los setState de
  // los fetches in-flight.
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  // Effect 2: visibility listener — corre UNA vez.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handler = () => setIsVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Effect 3: polling. Re-corre cuando shouldPoll flippea (visibility o stale).
  // In-flight fetches al cleanup siguen vivos; el setState es idempotente con
  // el isUnmountedRef guard, y si el componente sigue montado el setState es
  // válido y actualiza state.data correctamente.
  useEffect(() => {
    if (!shouldPoll) return
    void fetchPosition()
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return prev
        void fetchPosition()
        return prev
      })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [shouldPoll, fetchPosition])

  // Effect 4: auto-follow. Cada vez que llega un fix nuevo Y el usuario no
  // interactuó con el mapa, pan suave hacia la nueva posición del vehículo.
  useEffect(() => {
    if (!state.data) return
    const pos =
      state.data.status === 'live' ? state.data.position
      : state.data.status === 'stale' ? state.data.lastReport
      : null
    if (!pos) return
    if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lon)) return
    if (pos.lat === 0 && pos.lon === 0) return
    if (pos.epoch === lastFollowedEpochRef.current) return
    lastFollowedEpochRef.current = pos.epoch
    if (userInteracted) return
    mapRef.current?.easeTo({ center: [pos.lon, pos.lat], duration: 500 })
  }, [state.data, userInteracted])

  // Handler del botón "Seguir vehículo". Definido antes de los early returns
  // para respetar las hooks rules (el número de hooks llamados tiene que ser
  // estable entre renders). Extrae la posición de state.data en tiempo del
  // click — no puede depender de `position` que se computa después.
  const handleRecenter = useCallback(() => {
    setUserInteracted(false)
    lastFollowedEpochRef.current = 0
    const data = state.data
    if (!data) return
    const p =
      data.status === 'live' ? data.position
      : data.status === 'stale' ? data.lastReport
      : null
    if (!p) return
    mapRef.current?.easeTo({ center: [p.lon, p.lat], duration: 500 })
  }, [state.data])

  // Condición de carrera — el parent debería haber filtrado estos estados.
  if (state.data?.status === 'not_in_route' || state.data?.status === 'pickup') {
    return null
  }

  // El vehículo no tiene GPS configurado.
  if (state.data?.status === 'no_gps') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-iconsa-gray">
        Este vehículo no tiene GPS configurado.
      </div>
    )
  }

  // Error grave tras fallos consecutivos.
  if (state.error && state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
        <span>No se pudo cargar la ubicación.</span>
        <button
          type="button"
          onClick={() => {
            setState((prev) => ({ ...prev, consecutiveErrors: 0, error: null }))
            void fetchPosition()
          }}
          className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Estado de carga — el primer fetch aún no ha retornado.
  if (!state.data) {
    return (
      <div
        className={`${heightClass} rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-iconsa-gray`}
      >
        Cargando ubicación…
      </div>
    )
  }

  const isStale = state.data.status === 'stale'
  const position: VehiclePosition =
    state.data.status === 'live' ? state.data.position : state.data.lastReport

  // Guard: coordenadas inválidas (0/0, NaN, fuera de rango). Sucede con
  // devices sin fix GPS o recién instalados. No montamos el canvas porque
  // centraría el mapa en (0,0) — el Atlántico sur, gris uniforme. El
  // placeholder conserva la misma altura que el mapa para no colapsar layout.
  if (!isValidPosition(position)) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div
          className={`${heightClass} flex items-center justify-center bg-gray-50 text-sm text-iconsa-gray px-4 text-center`}
        >
          El dispositivo GPS no está reportando coordenadas válidas.
          {isStale && (
            <> Último reporte hace {formatHoursAgo(position.epoch)}.</>
          )}
        </div>
        {isStale && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 flex items-center justify-end">
            <button
              type="button"
              onClick={() => void fetchPosition()}
              className="rounded border border-amber-300 bg-white px-3 py-1 font-medium text-amber-800 hover:bg-amber-100"
            >
              Reactivar
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className={`${heightClass} relative`}>
        <Map
          ref={mapRef}
          mapLib={import('maplibre-gl')}
          mapStyle={TILE_STYLE_URL}
          initialViewState={{
            longitude: position.lon,
            latitude: position.lat,
            zoom: 13,
          }}
          // originalEvent es undefined cuando el movimiento es programático
          // (nuestros easeTo); defined cuando el usuario interactúa (pan/zoom/
          // rotate/pitch en mouse o touch). Usar onMoveStart en vez de
          // onDragStart+onZoomStart para no ensuciar el flag con easeTo propio.
          onMoveStart={(e) => {
            if (e.originalEvent) setUserInteracted(true)
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Marker longitude={position.lon} latitude={position.lat} anchor="center">
            <div
              title={position.place}
              style={{ transform: `rotate(${position.heading}deg)` }}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow ${
                isStale ? 'bg-gray-500' : 'bg-navy'
              }`}
            >
              ▲
            </div>
          </Marker>
        </Map>
        {userInteracted && (
          <button
            type="button"
            onClick={handleRecenter}
            title="Centrar en el vehículo y reanudar seguimiento"
            className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {variant === 'full' && <span>Seguir vehículo</span>}
          </button>
        )}
      </div>
      {isStale ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center justify-between gap-3 flex-wrap">
          <span>
            Último reporte hace {formatHoursAgo(position.epoch)} — el dispositivo
            puede estar desconectado.
          </span>
          <button
            type="button"
            onClick={() => void fetchPosition()}
            className="shrink-0 rounded border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Reactivar
          </button>
        </div>
      ) : (
        <div className="border-t border-gray-100 bg-white px-4 py-2 text-sm text-gray-700 flex items-center justify-between gap-2 flex-wrap">
          <span className="truncate">
            <span className="text-iconsa-gray">Ubicación:</span>{' '}
            {position.place || '—'}
          </span>
          <span className="shrink-0 text-iconsa-gray">
            {Math.round(position.speed)} km/h · {position.event} ·{' '}
            {formatAgoSeconds(position.epoch)}
          </span>
        </div>
      )}
    </div>
  )
}
