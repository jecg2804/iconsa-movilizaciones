'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Correo o contraseña incorrectos')
        return
      }

      // Forzar navegación completa para evitar estados colgados del router cliente.
      window.location.assign('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado'
      setError(`No se pudo iniciar sesión. ${message}`)
    } finally {
      setLoading(false)
    }
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
            Sistema de Movilizaciones — ICONSA
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
        >
          <div className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@iconsa.com"
              required
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-iconsa-red">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            fullWidth
            className="mt-6"
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  )
}
