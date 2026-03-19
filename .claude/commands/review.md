---
name: review
description: Revisar el código actual contra FEATURE_SPEC y detectar discrepancias, bugs potenciales, o deuda técnica.
---

Revisar: $ARGUMENTS

## Workflow

1. Identificar los archivos relevantes al área indicada
2. Leer `Docs/FEATURE_SPEC.md` secciones correspondientes
3. Comparar implementación actual vs spec
4. Verificar schema via Supabase MCP si hay dudas
5. Reportar hallazgos:
   - ✅ Correcto
   - ⚠️ Discrepancia: spec dice X, código hace Y
   - 🐛 Bug potencial
   - 💡 Mejora sugerida

## NO hacer

- NO modificar código durante la revisión
- NO modificar specs
- Solo reportar hallazgos para que James decida
