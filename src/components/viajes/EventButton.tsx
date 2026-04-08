'use client'

import { Loader2, Truck, MapPin, CheckCircle, Home, AlertTriangle, ClipboardCheck, Car, CircleDot } from 'lucide-react'
import type { TripEventType } from '@/hooks/useTripEvents'

interface EventButtonProps {
  eventType: TripEventType
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

const EVENT_CONFIG: Record<
  TripEventType,
  { label: string; icon: React.ReactNode; colorClass: string }
> = {
  Salida: {
    label: 'Registrar Salida',
    icon: <Truck className="h-6 w-6" />,
    colorClass: 'bg-navy hover:bg-navy/90 text-white',
  },
  Llegada: {
    label: 'Registrar Llegada',
    icon: <MapPin className="h-6 w-6" />,
    colorClass: 'bg-iconsa-blue hover:bg-iconsa-blue/90 text-white',
  },
  Entrega: {
    label: 'Registrar Entrega',
    icon: <CheckCircle className="h-6 w-6" />,
    colorClass: 'bg-iconsa-green hover:bg-iconsa-green/90 text-white',
  },
  Retorno: {
    label: 'Registrar Retorno',
    icon: <Home className="h-6 w-6" />,
    colorClass: 'bg-gray-600 hover:bg-gray-700 text-white',
  },
  Incidencia: {
    label: 'Registrar Incidencia',
    icon: <AlertTriangle className="h-6 w-6" />,
    colorClass: 'bg-iconsa-orange hover:bg-iconsa-orange/90 text-white',
  },
  Preparacion: {
    label: 'Registrar Preparación',
    icon: <ClipboardCheck className="h-6 w-6" />,
    colorClass: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  Retiro: {
    label: 'Confirmar Retiro',
    icon: <Car className="h-6 w-6" />,
    colorClass: 'bg-iconsa-green hover:bg-iconsa-green/90 text-white',
  },
  Parada: {
    label: 'Registrar Parada',
    icon: <CircleDot className="h-6 w-6" />,
    colorClass: 'bg-cyan-600 hover:bg-cyan-700 text-white',
  },
}

export function EventButton({ eventType, disabled = false, loading = false, onClick }: EventButtonProps) {
  const config = EVENT_CONFIG[eventType]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-semibold shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${config.colorClass}`}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        config.icon
      )}
      {loading ? 'Registrando...' : config.label}
    </button>
  )
}
