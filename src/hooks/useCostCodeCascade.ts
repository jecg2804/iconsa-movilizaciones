'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SelectOption } from '@/components/ui/Select'

export interface UseCostCodeCascadeReturn {
  // Extras
  extraOptions: SelectOption[]
  hasExtras: boolean
  selectedExtraId: string | null
  setSelectedExtraId: (id: string | null) => void
  loadingExtras: boolean
  // Cost codes (filtrados por proyecto + extra)
  costCodeOptions: SelectOption[]
  loadingCostCodes: boolean
  costCodeId: string | null
  setCostCodeId: (id: string | null) => void
  // Cost categories (filtrados via cost_code_categories por costCodeId)
  categoryOptions: SelectOption[]
  loadingCategories: boolean
  costCategoryId: string | null
  setCostCategoryId: (id: string | null) => void
}

/**
 * Cascada Proyecto → [Extra] → Fase → Categoría para selección de cost_code.
 *
 * - Si el proyecto tiene extras (project_extras), `hasExtras=true` y se debe
 *   seleccionar uno antes de listar fases.
 * - Si no, las fases se listan directamente filtrando por `project_id` y
 *   `extra_id IS NULL`.
 * - Categorías se listan desde `cost_code_categories` filtrado por `costCodeId`.
 *
 * Reset behavior:
 * - Cambio de projectId → reset cost_code, category, extra, options
 * - Cambio de costCodeId → reset category
 *
 * Si se provee `initialCostCodeId` y el proyecto tiene extras, detecta el
 * extra correspondiente para hidratar `selectedExtraId` al editar.
 */
export function useCostCodeCascade(
  projectId: string | null,
  initialCostCodeId?: string | null,
  initialCostCategoryId?: string | null,
): UseCostCodeCascadeReturn {
  const supabase = useMemo(() => createClient(), [])

  // --- Estado público ---
  const [extraOptions, setExtraOptions] = useState<SelectOption[]>([])
  const [hasExtras, setHasExtras] = useState(false)
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null)
  const [loadingExtras, setLoadingExtras] = useState(false)

  const [costCodeOptions, setCostCodeOptions] = useState<SelectOption[]>([])
  const [loadingCostCodes, setLoadingCostCodes] = useState(false)
  const [costCodeId, setCostCodeId] = useState<string | null>(initialCostCodeId ?? null)

  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [costCategoryId, setCostCategoryId] = useState<string | null>(initialCostCategoryId ?? null)

  // --- Reset cuando se pierde proyecto ---
  useEffect(() => {
    if (!projectId) {
      setExtraOptions([])
      setHasExtras(false)
      setSelectedExtraId(null)
      setCostCodeOptions([])
      setCostCodeId(null)
      setCategoryOptions([])
      setCostCategoryId(null)
    }
  }, [projectId])

  // --- Fetch extras del proyecto ---
  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    setLoadingExtras(true)

    supabase
      .from('project_extras')
      .select('id, code, description')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('code')
      .then(({ data }) => {
        if (cancelled) return
        const extras = data ?? []
        if (extras.length > 0) {
          setExtraOptions(extras.map((e) => ({
            value: e.id,
            label: `${e.code} — ${e.description ?? e.code}`,
          })))
          setHasExtras(true)
          // Si NO estamos editando (sin initialCostCodeId), reset extra
          if (!initialCostCodeId) {
            setSelectedExtraId(null)
          }
        } else {
          setExtraOptions([])
          setHasExtras(false)
          setSelectedExtraId(null)
        }
        setLoadingExtras(false)
      })

    return () => { cancelled = true }
  }, [projectId, supabase, initialCostCodeId])

  // --- Detectar extra del costCode inicial al editar ---
  useEffect(() => {
    if (!initialCostCodeId || !projectId || !hasExtras) return

    let cancelled = false
    supabase
      .from('cost_codes')
      .select('extra_id')
      .eq('id', initialCostCodeId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.extra_id) {
          setSelectedExtraId(data.extra_id)
        } else {
          setSelectedExtraId('__base__')
        }
      })

    return () => { cancelled = true }
  }, [initialCostCodeId, projectId, hasExtras, supabase])

  // --- Fetch cost codes filtrados por proyecto + extra ---
  useEffect(() => {
    if (!projectId) {
      setCostCodeOptions([])
      return
    }

    if (hasExtras && selectedExtraId === null && !loadingExtras) {
      setCostCodeOptions([])
      return
    }

    if (loadingExtras) return

    let cancelled = false
    setLoadingCostCodes(true)

    const query = supabase
      .from('cost_codes')
      .select('id, phase_code, phase_description, full_code, extra_id')
      .eq('project_id', projectId)
      .order('full_code')

    const extraFilter = selectedExtraId === '__base__' ? null : selectedExtraId
    const finalQuery = extraFilter
      ? query.eq('extra_id', extraFilter)
      : query.is('extra_id', null)

    finalQuery.then(({ data }) => {
      if (cancelled) return
      const options: SelectOption[] = (data ?? []).map((cc) => ({
        value: cc.id,
        label: cc.full_code
          ? `${cc.full_code} — ${cc.phase_description ?? ''}`
          : `${cc.phase_code} — ${cc.phase_description ?? ''}`,
      }))
      setCostCodeOptions(options)

      if (costCodeId && !options.some((o) => o.value === costCodeId)) {
        setCostCodeId(null)
        setCostCategoryId(null)
      }
      setLoadingCostCodes(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedExtraId, hasExtras, loadingExtras, supabase])

  // --- Fetch categorías cuando cambia costCodeId ---
  useEffect(() => {
    if (!costCodeId) {
      setCategoryOptions([])
      setCostCategoryId(null)
      return
    }

    let cancelled = false
    setLoadingCategories(true)

    supabase
      .from('cost_code_categories')
      .select('cost_category_id, cost_categories(id, code, description)')
      .eq('cost_code_id', costCodeId)
      .then(({ data }) => {
        if (cancelled) return
        const options: SelectOption[] = (data ?? [])
          .map((row) => {
            const rawCat = row.cost_categories as { id: string; code: string; description: string | null } | { id: string; code: string; description: string | null }[] | null
            const cat = Array.isArray(rawCat) ? rawCat[0] : rawCat
            if (!cat) return null
            return { value: cat.id, label: `${cat.code} — ${cat.description ?? cat.code}` }
          })
          .filter((opt): opt is SelectOption => opt !== null)
          .sort((a, b) => a.label.localeCompare(b.label))
        setCategoryOptions(options)

        if (costCategoryId && !options.some((o) => o.value === costCategoryId)) {
          setCostCategoryId(null)
        }
        setLoadingCategories(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCodeId, supabase])

  return {
    extraOptions,
    hasExtras,
    selectedExtraId,
    setSelectedExtraId,
    loadingExtras,
    costCodeOptions,
    loadingCostCodes,
    costCodeId,
    setCostCodeId,
    categoryOptions,
    loadingCategories,
    costCategoryId,
    setCostCategoryId,
  }
}
