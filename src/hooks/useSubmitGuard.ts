import { useRef, useCallback } from 'react'

/**
 * Previene doble-submit usando useRef (inmediato, no espera re-render).
 * Envuelve cualquier handler async para que solo se ejecute una vez a la vez.
 *
 * Uso:
 *   const guard = useSubmitGuard()
 *   const handleSave = guard(async () => { ... })
 */
export function useSubmitGuard() {
  const busyRef = useRef(false)

  const guard = useCallback(
    <Args extends unknown[], T>(fn: (...args: Args) => Promise<T>): ((...args: Args) => Promise<T | undefined>) => {
      return async (...args: Args) => {
        if (busyRef.current) return undefined
        busyRef.current = true
        try {
          return await fn(...args)
        } finally {
          busyRef.current = false
        }
      }
    },
    [],
  )

  return guard
}
