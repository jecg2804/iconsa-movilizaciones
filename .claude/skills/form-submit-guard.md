---
name: form-submit-guard
description: Patrón anti doble-submit para formularios. SIEMPRE usar useSubmitGuard en handlers async que crean/mutan datos. disabled={saving} NO es suficiente.
---

# Form Submit Guard

## El problema

`disabled={saving}` usa estado de React. El re-render es asíncrono — un segundo click entra ANTES de que el botón se deshabilite. Resultado: datos duplicados en BD.

## La solución: `useSubmitGuard`

Hook en `src/hooks/useSubmitGuard.ts` que usa `useRef` (síncrono, sin esperar re-render).

### Uso

```tsx
import { useSubmitGuard } from '@/hooks/useSubmitGuard'

const guard = useSubmitGuard()

// Sin args
const handleSave = guard(async () => {
  await saveSolicitud(...)
})

// Con args
const handleSave = guard(async (formData: Record<string, unknown>) => {
  await saveRecord(formData)
})
```

### Regla obligatoria

TODO handler async que crea o muta datos en Supabase DEBE estar envuelto con `guard()`.
`disabled={saving}` se MANTIENE para UX visual (spinner), pero NO es protección real.

### Checklist para nuevos formularios

1. Importar `useSubmitGuard`
2. Crear `const guard = useSubmitGuard()` en el componente
3. Envolver cada handler de submit/save/send/cancel con `guard(async () => { ... })`
4. Mantener `disabled={saving}` en botones para UX
5. NO usar `useCallback` — `guard()` ya retorna función estable
