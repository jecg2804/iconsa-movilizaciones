'use client'

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const guard = useSubmitGuard()

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 8 && password === confirm

  const handleSubmit = guard(async () => {
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Navegación completa para refrescar sesión
      window.location.assign('/dashboard')
    } catch {
      setError('Error inesperado. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    handleSubmit()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-navy">
            Movimient<span className="text-gold">OS</span>
          </h1>
          <p className="mt-1 text-sm text-iconsa-gray">
            Cambiar contraseña
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
        >
          <div className="space-y-4">
            {/* Nueva contraseña */}
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                />
                <button
                  type="button"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-iconsa-gray hover:text-gray-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {tooShort && (
                <p className="mt-1 text-xs text-amber-600">Mínimo 8 caracteres</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetir contraseña"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
              />
              {mismatch && (
                <p className="mt-1 text-xs text-iconsa-red">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-iconsa-red">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            fullWidth
            className="mt-6"
          >
            Cambiar Contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
