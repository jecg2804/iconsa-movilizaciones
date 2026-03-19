# Task: Password Recovery + First Login Force Change

**Prioridad:** Urgente — usuarios activos diariamente necesitan poder cambiar/recuperar contraseña
**Complejidad:** Media — 5 archivos nuevos, 1 modificado, 0 cambios de BD
**Prerequisito de BD:** Ninguno (usa `user_metadata` de Supabase Auth, no campos nuevos en `people`)

---

## Contexto

Hoy James crea usuarios en Supabase Dashboard con una contraseña default y se la dice verbalmente. Los usuarios no pueden cambiar su contraseña ni recuperarla si la olvidan. Este task implementa:

1. **Force change on first login:** Usuario entra con password default → middleware detecta flag → redirect a `/change-password` → usuario escoge su password → flag se limpia → accede al dashboard
2. **Forgot password:** Link en login → ingresa email → recibe email con link → click → llega a `/change-password` → escoge nuevo password
3. Ambos flujos usan la misma página `/change-password`

## Diseño técnico

### Cómo funciona el flag `must_change_password`

Supabase Auth permite guardar metadata en el usuario: `user_metadata.must_change_password = true`. Cuando James crea un usuario nuevo (por ahora via Dashboard), también seteará este flag. El middleware lo lee de `getUser()` sin queries extra a BD.

Cuando el usuario cambia su password, el client llama `supabase.auth.updateUser({ password: newPassword, data: { must_change_password: false } })` — esto actualiza el password Y limpia el flag en una sola llamada.

### Flujo del email de recovery

1. Usuario llama `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/confirm?next=/change-password' })`
2. Supabase envía email con link que contiene `token_hash` y `type=recovery`
3. Usuario clickea link → llega a `/auth/confirm` route handler
4. Route handler llama `supabase.auth.verifyOtp({ type, token_hash })` → crea sesión
5. Redirect a `/change-password` con sesión activa
6. Usuario escoge nuevo password → `updateUser({ password })`

---

## Pasos de implementación

### Paso 1: Página `/forgot-password`

**Archivo nuevo:** `src/app/(auth)/forgot-password/page.tsx`

Componente client con:
- Input de email
- Botón "Enviar enlace de recuperación"
- Estado loading/success/error
- Al submit: `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/confirm?next=/change-password' })`
- Success: mostrar mensaje "Revisa tu correo electrónico" (no revelar si el email existe)
- Link "Volver al login" abajo
- Mismo estilo visual que login (card centrada, branding MovimientOS)

### Paso 2: Route handler `/auth/confirm`

**Archivo nuevo:** `src/app/auth/confirm/route.ts`

```typescript
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next')! : '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect(next)
  }
  redirect('/login?error=invalid_token')
}
```

### Paso 3: Página `/change-password`

**Archivo nuevo:** `src/app/(auth)/change-password/page.tsx`

Componente client con:
- Input "Nueva contraseña" (tipo password con toggle visibility)
- Input "Confirmar contraseña"
- Validación: mínimo 8 caracteres, ambas coinciden
- Botón "Cambiar Contraseña" con loading state (usar useSubmitGuard)
- Al submit: `supabase.auth.updateUser({ password: newPassword, data: { must_change_password: false } })`
- Success: `window.location.assign('/dashboard')` (navegación completa, no router.push)
- Error: mostrar mensaje
- Mismo estilo visual que login

**Importante:** NO mostrar link "Volver al login" — el usuario tiene sesión activa (llegó via recovery link o via login con flag). Si navega away, el middleware lo redirige de vuelta aquí.

### Paso 4: Modificar middleware

**Archivo modificado:** `src/proxy.ts` (o `src/middleware.ts` — verificar cuál existe)

Cambios:
1. Agregar rutas públicas: `/forgot-password`, `/auth/confirm`
2. Agregar check de `must_change_password` DESPUÉS del check de autenticación:

```typescript
// Rutas públicas (no requieren auth)
const publicRoutes = ['/login', '/forgot-password', '/auth/confirm']
if (publicRoutes.some(route => path.startsWith(route))) return supabaseResponse

// Sin sesión → login
if (!user) { redirect to /login }

// Con sesión pero must_change_password → /change-password
if (user.user_metadata?.must_change_password === true && path !== '/change-password') {
  redirect to /change-password
}

// /change-password sin el flag → dashboard (ya cambió su password)
if (path === '/change-password' && user.user_metadata?.must_change_password !== true) {
  // Solo redirigir si NO viene de recovery (verificar si tiene sesión reciente)
  // Dejar pasar — el usuario puede estar cambiando su password voluntariamente via recovery
}
```

**Cuidado con loops:** `/change-password` DEBE pasar sin redirect aunque no tenga el flag, porque el usuario puede llegar via recovery email (no tiene el flag, pero sí necesita cambiar password).

### Paso 5: Link "Olvidé mi contraseña" en login

**Archivo modificado:** `src/app/(auth)/login/page.tsx`

Agregar debajo del botón "Iniciar Sesión":

```tsx
<div className="mt-4 text-center">
  <a href="/forgot-password" className="text-sm text-navy hover:underline">
    ¿Olvidaste tu contraseña?
  </a>
</div>
```

---

## Configuración de Supabase (James debe hacer esto en el Dashboard)

1. **Site URL:** Ir a Authentication → URL Configuration → Site URL = `https://rein-eisenwerk.com`
2. **Redirect URLs:** Agregar `https://rein-eisenwerk.com/**` y `http://localhost:3000/**`
3. **Email template (Recovery):** Authentication → Email Templates → "Reset Password":
   - Subject: `Restablecer contraseña — MovimientOS`
   - Body: usar template con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/change-password`
4. **SMTP personalizado:** Project Settings → Authentication → SMTP Settings → configurar Resend (el default de Supabase solo permite 2 emails/hora)

---

## Verificación

- [ ] Login con password default → redirect a `/change-password` (cuando user tiene `must_change_password: true`)
- [ ] Cambiar password en `/change-password` → redirect a dashboard → login futuro usa nueva password
- [ ] "Olvidé mi contraseña" en login → email llega → click link → `/change-password` → funciona
- [ ] Double-click en "Cambiar Contraseña" → solo se ejecuta una vez
- [ ] `npm run build` sin errores
- [ ] Rutas `/forgot-password` y `/auth/confirm` accesibles sin login
- [ ] Ruta `/change-password` accesible con sesión (no redirige a login)

---

## Notas para Claude Code

- El middleware actual está en `src/proxy.ts` (Next.js 16 pattern). Verificar antes de editar.
- `createClient` de `@/lib/supabase/server` para route handlers, `@/lib/supabase/client` para client components.
- El email template de Supabase usa `{{ .TokenHash }}` no `{{ .Token }}`. Esto es crítico para PKCE flow.
- NO crear campos nuevos en la tabla `people` — todo vive en `auth.users.user_metadata`.
