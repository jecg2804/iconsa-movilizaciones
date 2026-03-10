'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import {
  SelectWithFallback,
  type SelectWithFallbackValue,
} from '@/components/ui/SelectWithFallback'
import { DuplicateWarning, type DuplicateMatch } from '@/components/ui/DuplicateWarning'
import type { LineInput } from '@/hooks/useSolicitudes'

interface LineEditorProps {
  /** Opciones de equipos para el dropdown */
  equipment: SelectOption[]
  /** Opciones de ubicaciones para el dropdown */
  locations: SelectOption[]
  /** Opciones de unidades para el dropdown */
  units: SelectOption[]
  /** Opciones de codigos de costo filtrados por proyecto (fallback si no hay projectId) */
  costCodes: SelectOption[]
  /** ID del proyecto seleccionado — habilita cascada Extra → Fase */
  projectId?: string | null

  /** Datos iniciales si se esta editando una linea existente */
  initialData?: LineInput
  /** Indica si se esta editando (true) o creando (false) */
  isEditing: boolean

  /** Callback al guardar la linea */
  onSave: (line: LineInput) => void
  /** Callback al cancelar */
  onCancel: () => void
  /** Verificacion de duplicados — solo disponible en Borrador */
  onCheckDuplicates?: (line: LineInput) => Promise<DuplicateMatch[]>
}

/** Crea un SelectWithFallbackValue vacio */
function emptyFallbackValue(): SelectWithFallbackValue {
  return { id: null, text: null }
}

/** Crea un SelectWithFallbackValue desde un par id/text */
function toFallbackValue(
  id: string | null,
  text: string | null,
): SelectWithFallbackValue {
  return { id: id ?? null, text: text ?? null }
}

function LineEditor({
  equipment,
  locations,
  units,
  costCodes,
  projectId,
  initialData,
  isEditing,
  onSave,
  onCancel,
  onCheckDuplicates,
}: LineEditorProps) {
  const supabase = useMemo(() => createClient(), [])

  // --- Estado del formulario ---
  const [lineType, setLineType] = useState<'Equipo' | 'Material'>(
    initialData?.line_type ?? 'Equipo',
  )
  const [equipmentValue, setEquipmentValue] = useState<SelectWithFallbackValue>(
    initialData
      ? toFallbackValue(initialData.equipment_id, initialData.equipment_text)
      : emptyFallbackValue(),
  )
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [fromValue, setFromValue] = useState<SelectWithFallbackValue>(
    initialData
      ? toFallbackValue(initialData.from_location_id, initialData.from_text)
      : emptyFallbackValue(),
  )
  const [toValue, setToValue] = useState<SelectWithFallbackValue>(
    initialData
      ? toFallbackValue(initialData.to_location_id, initialData.to_text)
      : emptyFallbackValue(),
  )
  const [quantity, setQuantity] = useState(
    initialData ? String(initialData.quantity) : '1',
  )
  const [unitValue, setUnitValue] = useState<SelectWithFallbackValue>(
    initialData
      ? toFallbackValue(initialData.unit_id, initialData.unit_text)
      : emptyFallbackValue(),
  )
  const [costCodeId, setCostCodeId] = useState<string | null>(
    initialData?.cost_code_id ?? null,
  )
  const [costCategoryId, setCostCategoryId] = useState<string | null>(
    initialData?.cost_category_id ?? null,
  )
  const [materialCategory, setMaterialCategory] = useState<string | null>(
    initialData?.material_category ?? null,
  )
  const [poReference, setPoReference] = useState(initialData?.po_reference ?? '')
  const [lineNotes, setLineNotes] = useState(initialData?.notes ?? '')

  // Extras del proyecto (cascada: Proyecto → Extra → Fase → Categoría)
  const [extraOptions, setExtraOptions] = useState<SelectOption[]>([])
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null)
  const [hasExtras, setHasExtras] = useState(false)
  const [loadingExtras, setLoadingExtras] = useState(false)

  // Cost codes filtrados por extra (fetch interno)
  const [filteredCostCodes, setFilteredCostCodes] = useState<SelectOption[]>([])
  const [loadingCostCodes, setLoadingCostCodes] = useState(false)

  // Categorias de costo dinamicas (desde BD)
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Validacion y duplicados
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  // --- Fetch extras del proyecto ---
  useEffect(() => {
    if (!projectId) {
      setExtraOptions([])
      setHasExtras(false)
      setSelectedExtraId(null)
      return
    }

    let cancelled = false
    setLoadingExtras(true)

    ;(supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>)('project_extras')
      .select('id, code, description')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('code')
      .then(({ data }: { data: Array<{ id: string; code: string; description: string | null }> | null }) => {
        if (cancelled) return
        const extras = data ?? []
        if (extras.length > 0) {
          setExtraOptions(extras.map((e) => ({
            value: e.id,
            label: `${e.code} — ${e.description ?? e.code}`,
          })))
          setHasExtras(true)
          // Si estamos editando y ya hay un costCodeId, no resetear
          if (!initialData?.cost_code_id) {
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
  }, [projectId, supabase, initialData?.cost_code_id])

  // --- Fetch cost codes filtrados por proyecto + extra ---
  useEffect(() => {
    if (!projectId) {
      setFilteredCostCodes([])
      return
    }

    // Si el proyecto tiene extras pero no se ha seleccionado uno, no fetch
    if (hasExtras && selectedExtraId === null && !loadingExtras) {
      setFilteredCostCodes([])
      return
    }

    // Esperar a que se determine si hay extras
    if (loadingExtras) return

    let cancelled = false
    setLoadingCostCodes(true)

    const query = supabase
      .from('cost_codes')
      .select('id, phase_code, phase_description, full_code, extra_id')
      .eq('project_id', projectId)
      .order('full_code')

    // Filtrar por extra: '__base__' = sin extra, otro valor = ese extra_id
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
      setFilteredCostCodes(options)

      // Si el costCodeId actual no esta en las opciones, resetear
      if (costCodeId && !options.some((o) => o.value === costCodeId)) {
        setCostCodeId(null)
        setCostCategoryId(null)
      }
      setLoadingCostCodes(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedExtraId, hasExtras, loadingExtras, supabase])

  // --- Detectar extra del costCode inicial al editar ---
  useEffect(() => {
    if (!initialData?.cost_code_id || !projectId || !hasExtras) return

    let cancelled = false
    supabase
      .from('cost_codes')
      .select('extra_id')
      .eq('id', initialData.cost_code_id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.extra_id) {
          setSelectedExtraId(data.extra_id as string)
        } else {
          setSelectedExtraId('__base__')
        }
      })

    return () => { cancelled = true }
  }, [initialData?.cost_code_id, projectId, hasExtras, supabase])

  // --- Fetch categorias de costo cuando cambia la fase seleccionada ---
  useEffect(() => {
    if (!costCodeId) {
      setCategoryOptions([])
      setCostCategoryId(null)
      return
    }

    let cancelled = false
    setLoadingCategories(true)

    // cost_code_categories y cost_categories no estan en database.ts (tipos no regenerados)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>)('cost_code_categories')
      .select('cost_category_id, cost_categories(id, code, description)')
      .eq('cost_code_id', costCodeId)
      .then(({ data }: { data: Array<{ cost_category_id: string; cost_categories: { id: string; code: string; description: string | null } | null }> | null }) => {
        if (cancelled) return
        const options: SelectOption[] = (data ?? [])
          .map((row) => {
            const cat = row.cost_categories
            if (!cat) return null
            return { value: cat.id, label: `${cat.code} — ${cat.description ?? cat.code}` }
          })
          .filter((opt): opt is SelectOption => opt !== null)
          .sort((a, b) => a.label.localeCompare(b.label))
        setCategoryOptions(options)

        // Si la categoria actual no esta en las opciones validas, resetear
        if (costCategoryId && !options.some((o) => o.value === costCategoryId)) {
          setCostCategoryId(null)
        }
        setLoadingCategories(false)
      })

    return () => { cancelled = true }
    // Solo re-fetch cuando cambia costCodeId, no cuando cambia costCategoryId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCodeId, supabase])

  // --- Auto-rellenar descripcion al seleccionar equipo del dropdown ---
  useEffect(() => {
    if (lineType === 'Equipo' && equipmentValue.id) {
      const selected = equipment.find((opt) => opt.value === equipmentValue.id)
      if (selected) {
        setDescription(selected.label)
      }
    }
  }, [equipmentValue.id, lineType, equipment])

  // --- Cambiar tipo de linea ---
  const handleTypeChange = useCallback(
    (newType: 'Equipo' | 'Material') => {
      if (newType === lineType) return
      setLineType(newType)
      // Resetear campos especificos del tipo
      if (newType === 'Material') {
        setEquipmentValue(emptyFallbackValue())
        setDescription('')
      } else {
        setDescription('')
      }
      setMaterialCategory(null)
      setErrors({})
    },
    [lineType],
  )

  // --- Manejar cambio de extra (resetea fase + categoria) ---
  const handleExtraChange = useCallback((newExtraId: string | null) => {
    setSelectedExtraId(newExtraId)
    setCostCodeId(null)
    setCostCategoryId(null)
  }, [])

  // --- Manejar cambio de fase (resetea categoria) ---
  const handleCostCodeChange = useCallback((newCostCodeId: string | null) => {
    setCostCodeId(newCostCodeId)
    setCostCategoryId(null)
  }, [])

  // --- Construir LineInput desde el estado actual ---
  const buildLineInput = useCallback((): LineInput => {
    return {
      id: initialData?.id,
      line_type: lineType,
      equipment_id: lineType === 'Equipo' ? equipmentValue.id : null,
      equipment_text: lineType === 'Equipo' ? equipmentValue.text : null,
      description: description.trim(),
      from_location_id: fromValue.id,
      from_text: fromValue.text,
      to_location_id: toValue.id,
      to_text: toValue.text,
      quantity: parseFloat(quantity) || 0,
      unit_id: unitValue.id,
      unit_text: unitValue.text,
      cost_code_id: costCodeId,
      cost_category_id: costCategoryId,
      category: null, // LEGACY — no usar
      material_category: lineType === 'Material' ? materialCategory : null,
      po_reference: poReference.trim() || null,
      notes: lineNotes.trim() || null,
    }
  }, [
    initialData?.id,
    lineType,
    equipmentValue,
    description,
    fromValue,
    toValue,
    quantity,
    unitValue,
    costCodeId,
    costCategoryId,
    materialCategory,
    poReference,
    lineNotes,
  ])

  // --- Validacion ---
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Descripcion requerida
    if (!description.trim()) {
      newErrors.description = 'La descripcion es requerida'
    }

    // Cantidad > 0
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a cero'
    }

    // Origen requerido
    if (!fromValue.id && !fromValue.text?.trim()) {
      newErrors.from = 'Indique el origen'
    }

    // Destino requerido
    if (!toValue.id && !toValue.text?.trim()) {
      newErrors.to = 'Indique el destino'
    }

    // Origen != destino
    const fromIsId = !!fromValue.id
    const toIsId = !!toValue.id
    if (fromIsId && toIsId && fromValue.id === toValue.id) {
      newErrors.to = 'El origen y destino no pueden ser iguales'
    } else if (
      !fromIsId &&
      !toIsId &&
      fromValue.text?.trim() &&
      toValue.text?.trim() &&
      fromValue.text.trim().toLowerCase() === toValue.text.trim().toLowerCase()
    ) {
      newErrors.to = 'El origen y destino no pueden ser iguales'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [description, quantity, fromValue, toValue])

  // --- Guardar ---
  const handleSave = useCallback(async () => {
    if (!validate()) return

    const lineInput = buildLineInput()

    // Verificar duplicados si la funcion esta disponible
    if (onCheckDuplicates && !showDuplicateWarning) {
      setCheckingDuplicates(true)
      try {
        const found = await onCheckDuplicates(lineInput)
        if (found.length > 0) {
          setDuplicates(found)
          setShowDuplicateWarning(true)
          return
        }
      } finally {
        setCheckingDuplicates(false)
      }
    }

    onSave(lineInput)
  }, [validate, buildLineInput, onCheckDuplicates, showDuplicateWarning, onSave])

  // --- Continuar despues de warning de duplicados ---
  const handleDuplicateContinue = useCallback(() => {
    setShowDuplicateWarning(false)
    setDuplicates(null)
    const lineInput = buildLineInput()
    onSave(lineInput)
  }, [buildLineInput, onSave])

  const handleDuplicateCancel = useCallback(() => {
    setShowDuplicateWarning(false)
    setDuplicates(null)
  }, [])

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      {/* Titulo */}
      <h3 className="text-sm font-semibold text-gray-900">
        {isEditing ? 'Editar Linea' : 'Agregar Linea'}
      </h3>

      {/* Toggle de tipo de linea */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange('Equipo')}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${
              lineType === 'Equipo'
                ? 'border-navy bg-navy text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <Wrench className="h-4 w-4" />
          Equipo
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('Material')}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${
              lineType === 'Material'
                ? 'border-gold bg-gold text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <Package className="h-4 w-4" />
          Material
        </button>
      </div>

      {/* Campos del formulario */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Campos especificos segun tipo */}
        {lineType === 'Equipo' ? (
          <>
            <SelectWithFallback
              label="Equipo"
              placeholder="Buscar equipo..."
              options={equipment}
              value={equipmentValue}
              onChange={setEquipmentValue}
              fallbackLabel="No esta en la lista"
              fallbackPlaceholder="Escriba el nombre del equipo..."
            />
            <Input
              label="Descripcion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Se rellena al seleccionar equipo"
              error={errors.description}
            />
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Input
                label="Descripcion del material"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describa el material a movilizar..."
                error={errors.description}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Categoria de Material"
                value={materialCategory ?? ''}
                onChange={(e) => setMaterialCategory(e.target.value || null)}
                placeholder="Ej: Agregados, Acero, Electrico, Plomeria..."
              />
            </div>
          </>
        )}

        {/* Campos comunes */}
        <SelectWithFallback
          label="Desde"
          placeholder="Seleccionar origen..."
          options={locations}
          value={fromValue}
          onChange={setFromValue}
          error={errors.from}
          fallbackLabel="No esta en la lista"
          fallbackPlaceholder="Escriba la ubicacion de origen..."
        />

        <SelectWithFallback
          label="Hasta"
          placeholder="Seleccionar destino..."
          options={locations}
          value={toValue}
          onChange={setToValue}
          error={errors.to}
          fallbackLabel="No esta en la lista"
          fallbackPlaceholder="Escriba la ubicacion de destino..."
        />

        <Input
          label="Cantidad"
          type="number"
          min="0.01"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
        />

        <SelectWithFallback
          label="Unidad"
          placeholder="Seleccionar unidad..."
          options={units}
          value={unitValue}
          onChange={setUnitValue}
          fallbackLabel="No esta en la lista"
          fallbackPlaceholder="Escriba la unidad..."
        />

        {/* Dropdown Extra — solo visible si el proyecto tiene extras */}
        {hasExtras && (
          <Select
            label="Extra / Sección"
            placeholder={loadingExtras ? 'Cargando...' : 'Seleccionar extra...'}
            options={[
              { value: '__base__', label: '(Proyecto Base)' },
              ...extraOptions,
            ]}
            value={selectedExtraId}
            onChange={handleExtraChange}
            disabled={loadingExtras}
          />
        )}

        <Select
          label="Fase / Código de Costo"
          placeholder={loadingCostCodes ? 'Cargando...' : (hasExtras && !selectedExtraId) ? 'Seleccione un extra primero' : 'Seleccionar fase...'}
          options={projectId ? filteredCostCodes : costCodes}
          value={costCodeId}
          onChange={handleCostCodeChange}
          searchable
          disabled={loadingCostCodes || (hasExtras && !selectedExtraId)}
        />

        <Select
          label="Categoría de Costo"
          placeholder={loadingCategories ? 'Cargando...' : costCodeId ? 'Seleccionar categoría...' : 'Seleccione una fase primero'}
          options={categoryOptions}
          value={costCategoryId}
          onChange={setCostCategoryId}
          disabled={!costCodeId || loadingCategories}
        />

        <Input
          label="Referencia OC"
          value={poReference}
          onChange={(e) => setPoReference(e.target.value)}
          placeholder="Orden de compra (opcional)"
        />

        <div className="md:col-span-2">
          <label
            htmlFor="line-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Notas de linea
          </label>
          <textarea
            id="line-notes"
            value={lineNotes}
            onChange={(e) => setLineNotes(e.target.value)}
            placeholder="Observaciones sobre esta linea (opcional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>

      {/* Warning de duplicados */}
      {showDuplicateWarning && duplicates && duplicates.length > 0 && (
        <DuplicateWarning
          matches={duplicates}
          onContinue={handleDuplicateContinue}
          onCancel={handleDuplicateCancel}
        />
      )}

      {/* Botones de accion */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={checkingDuplicates}
        >
          {isEditing ? 'Guardar Cambios' : 'Guardar Linea'}
        </Button>
      </div>
    </div>
  )
}

export { LineEditor }
export type { LineEditorProps }
