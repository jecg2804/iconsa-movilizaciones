import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Evita caídas del middleware cuando faltan variables en Vercel.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'config')
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    })

    // Rutas públicas (no requieren auth)
    const publicRoutes = ['/login', '/forgot-password', '/auth/confirm', '/api/cron']
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return supabaseResponse
    }

    // IMPORTANTE: No usar getSession() — getUser() valida contra el servidor de Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Sin sesión → login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Con sesión pero must_change_password → forzar cambio
    if (user.user_metadata?.must_change_password === true && pathname !== '/change-password') {
      const url = request.nextUrl.clone()
      url.pathname = '/change-password'
      return NextResponse.redirect(url)
    }

    // Si hay sesión y está en /login o raíz, redirigir a /dashboard
    if (pathname === '/login' || pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch {
    // Evita MIDDLEWARE_INVOCATION_FAILED por errores runtime en Edge.
    if (pathname === '/login') {
      return NextResponse.next({ request })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'auth')
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Archivos con extensión (imágenes, etc.)
     * - api/cron (cron jobs autenticados por Bearer token, no por session)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
