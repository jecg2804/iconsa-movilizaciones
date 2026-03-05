import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface DuplicateMatch {
  requestId: string
  lineNumber: number
  description: string
  status: string
  route: string
}

interface DuplicateWarningProps {
  matches: DuplicateMatch[]
  onContinue: () => void
  onCancel: () => void
}

function DuplicateWarning({ matches, onContinue, onCancel }: DuplicateWarningProps) {
  if (matches.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-amber-800">
            Posible duplicado detectado
          </h4>
          <p className="mt-1 text-sm text-amber-700">
            {matches.length === 1
              ? 'Se encontro una linea activa similar en otra solicitud.'
              : `Se encontraron ${matches.length} lineas activas similares en otras solicitudes.`}
          </p>

          <ul className="mt-3 space-y-2">
            {matches.map((match) => (
              <li
                key={`${match.requestId}-${match.lineNumber}`}
                className="rounded border border-amber-200 bg-white px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-amber-900">
                    {match.requestId}
                  </span>
                  <span className="text-amber-500">&middot;</span>
                  <span className="text-amber-700">Linea {match.lineNumber}</span>
                  <span className="text-amber-500">&middot;</span>
                  <span className="text-amber-700">{match.status}</span>
                </div>
                <p className="mt-0.5 text-gray-700">{match.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">{match.route}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onContinue}>
              Continuar de todas formas
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { DuplicateWarning }
export type { DuplicateWarningProps }
