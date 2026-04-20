'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import 'maplibre-gl/dist/maplibre-gl.css'
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

const TILE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
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

export default function TripLiveMap({ tripId, variant }: TripLiveMapProps) {
  const heightClass = variant === 'full' ? 'h-[400px]' : 'h-[250px]'

  const [state, setState] = useState<FetchState>({
    data: null,
    error: null,
    consecutiveErrors: 0,
    lastFetchedAt: null,
  })
  const isUnmountedRef = useRef(false)

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

  useEffect(() => {
    isUnmountedRef.current = false
    void fetchPosition()
    const id = window.setInterval(() => {
      // Detener polling tras 3 fallos consecutivos — el usuario debe presionar Reintentar.
      setState((prev) => {
        if (prev.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return prev
        void fetchPosition()
        return prev
      })
    }, POLL_INTERVAL_MS)
    return () => {
      isUnmountedRef.current = true
      window.clearInterval(id)
    }
  }, [fetchPosition])

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

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className={`${heightClass} relative`}>
        <Map
          mapLib={import('maplibre-gl')}
          mapStyle={TILE_STYLE_URL}
          initialViewState={{
            longitude: position.lon,
            latitude: position.lat,
            zoom: 13,
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
      </div>
      {isStale ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Último reporte hace {formatHoursAgo(position.epoch)} h — el dispositivo
          puede estar desconectado.
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
