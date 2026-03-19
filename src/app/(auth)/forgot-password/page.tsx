'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/confirm?next=/change-password',
      })

      if (resetError) {
        setError('No se pudo enviar el enlace. Intente de nuevo.')
        return
      }

      setSent(true)
    } catch {
      setError('Error inesperado. Intente de nuevo.')
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
            Recuperar contraseña
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-700">
                Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="text-xs text-iconsa-gray">
                Revisa tu bandeja de entrada y carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@iconsa.com"
                required
                autoComplete="email"
              />

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-iconsa-red">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} fullWidth>
                Enviar enlace de recuperación
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-navy hover:underline">
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
