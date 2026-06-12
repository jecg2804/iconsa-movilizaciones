/**
 * Auth setup project para Playwright (Cambio 6.5).
 *
 * Workaround del bug BL-E2E-AUTH-BLOCKED: el form de login en Playwright headless
 * retorna "Correo o contraseña incorrectos" aunque las credenciales sean correctas
 * y supabase-js Node con las mismas credenciales funcione perfecto. Sospechoso:
 * Sentry tunnel interceptando network calls del browser.
 *
 * Approach: hacer signInWithPassword via @supabase/ssr en Node (capturando las
 * cookies que el SSR client setea con sus nombres exactos), después inyectar
 * esas cookies al browser context y guardar storageState. Los specs Cambio 6.5
 * usan este storageState para arrancar ya autenticados, sin tocar el form de login.
 *
 * Solo aplica a Cambio 6.5 — los 18 tests de Cambio 6 siguen usando el helper
 * login original (con el bug latente). Se resolverá globalmente cuando
 * BL-E2E-AUTH-BLOCKED se aborde fuera del scope del Cambio 6.5.
 */

import { test as setup, expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { config as loadEnv } from 'dotenv'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

loadEnv({ path: '.env.local' })

const AUTH_FILE = 'tests/.auth/user.json'

setup('authenticate admin user', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')

  // Capturar cookies que el SSR client trata de setear durante signIn.
  // Los nombres son los exactos que @supabase/ssr usa (sb-{ref}-auth-token...).
  // Tipo amplio para sameSite — @supabase/ssr usa SerializeOptions de cookie lib que
  // acepta boolean además de los strings 'lax'/'strict'/'none'. Narrowing al consumir.
  const capturedCookies: Array<{
    name: string
    value: string
    options?: {
      maxAge?: number
      httpOnly?: boolean
      secure?: boolean
      sameSite?: boolean | 'lax' | 'strict' | 'none'
      path?: string
    }
  }> = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => {
        for (const c of cookies) capturedCookies.push(c)
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'jcucalon@iconsanet.com',
    password: 'Frijolin31!',
  })
  if (error || !data.session) {
    throw new Error(`signInWithPassword falló: ${error?.message ?? 'session null'}`)
  }
  expect(capturedCookies.length, 'SSR client debe haber capturado cookies de auth').toBeGreaterThan(0)

  // Inyectar las cookies capturadas al browser context con dominio localhost.
  await page.context().addCookies(
    capturedCookies.map((c) => {
      // Narrowing: si options.sameSite es boolean, mapear a default 'Lax'. Solo
      // strings se pasan al toUpperCase() de Playwright.
      const rawSameSite = c.options?.sameSite
      const sameSiteStr: 'lax' | 'strict' | 'none' =
        typeof rawSameSite === 'string' ? rawSameSite : 'lax'
      return {
        name: c.name,
        value: c.value,
        domain: 'localhost',
        path: c.options?.path ?? '/',
        httpOnly: c.options?.httpOnly ?? true,
        secure: c.options?.secure ?? false,
        sameSite: (sameSiteStr.charAt(0).toUpperCase() + sameSiteStr.slice(1)) as 'Lax' | 'Strict' | 'None',
        // expires opcional — sin él la cookie es session-only, suficiente para tests
      }
    }),
  )

  // Verificar autenticación navegando a /dashboard.
  // Si las cookies están bien, el server-side render no redirige a /login.
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

  // Guardar storageState para reutilizar en los specs Cambio 6.5
  mkdirSync(dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
