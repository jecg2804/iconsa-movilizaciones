'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Wrench,
  MapPin,
  DollarSign,
  Layers,
  Bell,
  Plus,
  Pencil,
  Power,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'

// ============================================================
// Tipos locales
// ============================================================

interface Project {
  id: string
  code: string
  name: string
  manager: string | null
  status: string | null
  location: string | null
  client: string | null
}

interface Person {
  id: string
  code: string | null
  name: string
  app_role: string | null
  position: string | null
  department: string | null
  email: string | null
  phone: string | null
  status: string | null
}

interface PersonProject {
  id: string
  project_id: string
  role: string | null
  is_active: boolean | null
  projects: { code: string; name: string } | null
}

interface Equipment {
  id: string
  spectrum_code: string | null
  description: string
  type_code: string | null
  equipment_type: string | null
  status: string | null
  brand: string | null
  model: string | null
}

interface Location {
  id: string
  name: string
  location_type: string | null
  project_id: string | null
  is_active: boolean | null
  projects: { code: string; name: string } | null
}

interface Rate {
  id: string
  code: string
  description: string
  rate: number
  is_active: boolean | null
}

interface Extra {
  id: string
  project_id: string
  code: string
  description: string | null
  is_active: boolean
}

interface NotifPerson {
  id: string
  name: string
  email: string | null
  app_role: string | null
  notifications_enabled: boolean
  notification_preferences: Record<string, boolean> | null
}

// ============================================================
// Tabs
// ============================================================

type TabKey = 'proyectos' | 'personas' | 'equipos' | 'ubicaciones' | 'tarifas' | 'extras' | 'notificaciones'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'proyectos', label: 'Proyectos', icon: Building2 },
  { key: 'personas', label: 'Personas', icon: Users },
  { key: 'equipos', label: 'Equipos', icon: Wrench },
  { key: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { key: 'tarifas', label: 'Tarifas', icon: DollarSign },
  { key: 'extras', label: 'Extras', icon: Layers },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
]

// Event types para preferencias de notificación
const NOTIF_EVENT_KEYS = [
  { key: 'solicitud_enviada', label: 'Enviada' },
  { key: 'solicitud_editada', label: 'Editada' },
  { key: 'solicitud_cancelada', label: 'Cancelada' },
  { key: 'solicitud_completada', label: 'Completada' },
  { key: 'lineas_programadas', label: 'Programada' },
  { key: 'viaje_cancelado', label: 'Viaje Can.' },
  { key: 'viaje_reprogramado', label: 'Viaje Rep.' },
  { key: 'viaje_asignado_conductor', label: 'Conductor' },
  { key: 'entrega_confirmada', label: 'Entrega' },
  { key: 'salida_registrada', label: 'Salida' },
  { key: 'sugerencia_fallback', label: 'Sugerencia' },
] as const

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Suspendido', label: 'Suspendido' },
  { value: 'Cerrado', label: 'Cerrado' },
]

const ROLE_OPTIONS: SelectOption[] = [
  { value: '', label: '(Sin acceso)' },
  { value: 'admin', label: 'Administrador' },
  { value: 'pm', label: 'Ingeniero de Proyecto' },
  { value: 'logistica', label: 'Coordinador Logística' },
  { value: 'campo', label: 'Conductor' },
  { value: 'almacen', label: 'Almacenista' },
]

const LOCATION_TYPES: SelectOption[] = [
  { value: 'Taller', label: 'Taller' },
  { value: 'Proyecto', label: 'Proyecto' },
  { value: 'Proveedor', label: 'Proveedor' },
  { value: 'Otro', label: 'Otro' },
]

// ============================================================
// Componente principal
// ============================================================

export default function AdminMastersPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { role, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('proyectos')
  const [search, setSearch] = useState('')

  // --- Datos ---
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [locationsList, setLocationsList] = useState<Location[]>([])
  const [rates, setRates] = useState<Rate[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [notifPeople, setNotifPeople] = useState<NotifPerson[]>([])
  const [allProjects, setAllProjects] = useState<SelectOption[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // --- Modal ---
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const guard = useSubmitGuard()

  // --- Personas: proyectos asignados ---
  const [personProjects, setPersonProjects] = useState<PersonProject[]>([])
  const [showPersonProjects, setShowPersonProjects] = useState<string | null>(null)
  const [loadingPersonProjects, setLoadingPersonProjects] = useState(false)

  // --- Extra: filtro por proyecto ---
  const [extrasProjectFilter, setExtrasProjectFilter] = useState<string | null>(null)

  // Guard: solo admin
  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [authLoading, role, router])

  // --- Fetch all projects para dropdowns ---
  useEffect(() => {
    supabase
      .from('projects')
      .select('id, code, name')
      .order('code')
      .then(({ data }) => {
        setAllProjects(
          (data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
        )
      })
  }, [supabase])

  // --- Fetch data por tab ---
  const fetchData = useCallback(async () => {
    setLoadingData(true)
    switch (activeTab) {
      case 'proyectos': {
        const { data } = await supabase
          .from('projects')
          .select('id, code, name, manager, status, location, client')
          .order('code')
        setProjects(data ?? [])
        break
      }
      case 'personas': {
        const { data } = await supabase
          .from('people')
          .select('id, code, name, app_role, position, department, email, phone, status')
          .order('name')
        setPeople(data ?? [])
        break
      }
      case 'equipos': {
        const { data } = await supabase
          .from('equipment')
          .select('id, spectrum_code, description, type_code, equipment_type, status, brand, model')
          .order('spectrum_code')
        setEquipmentList(data ?? [])
        break
      }
      case 'ubicaciones': {
        const { data } = await supabase
          .from('locations')
          .select('id, name, location_type, project_id, is_active, projects(code, name)')
          .order('name')
        setLocationsList((data ?? []) as unknown as Location[])
        break
      }
      case 'tarifas': {
        const { data } = await supabase
          .from('mobilization_rates')
          .select('id, code, description, rate, is_active')
          .order('code')
        setRates(data ?? [])
        break
      }
      case 'extras': {
        const fromAny = supabase.from.bind(supabase) as (t: string) => ReturnType<typeof supabase.from>
        let query = fromAny('project_extras')
          .select('id, project_id, code, description, is_active')
          .order('code')
        if (extrasProjectFilter) {
          query = query.eq('project_id', extrasProjectFilter)
        }
        const { data } = await query
        setExtras((data as unknown as Extra[] | null) ?? [])
        break
      }
      case 'notificaciones': {
        const { data } = await supabase
          .from('people')
          .select('id, name, email, app_role, notifications_enabled, notification_preferences')
          .eq('status', 'Activo')
          .not('email', 'is', null)
          .order('name')
        setNotifPeople((data ?? []) as unknown as NotifPerson[])
        break
      }
    }
    setLoadingData(false)
  }, [activeTab, supabase, extrasProjectFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset search cuando cambia tab
  useEffect(() => {
    setSearch('')
    setShowPersonProjects(null)
  }, [activeTab])

  // --- Fetch person projects ---
  const fetchPersonProjects = useCallback(async (personId: string) => {
    setLoadingPersonProjects(true)
    const { data } = await supabase
      .from('person_projects')
      .select('id, project_id, role, is_active, projects(code, name)')
      .eq('person_id', personId)
      .order('created_at')
    setPersonProjects((data ?? []) as unknown as PersonProject[])
    setLoadingPersonProjects(false)
  }, [supabase])

  // --- Abrir modal ---
  const openCreate = useCallback(() => {
    setEditingItem({})
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((item: Record<string, unknown>) => {
    setEditingItem(item)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingItem(null)
  }, [])

  // --- Toggle status ---
  const toggleStatus = useCallback(async (table: string, id: string, currentStatus: string | boolean | null) => {
    let newStatus: string | boolean
    if (typeof currentStatus === 'boolean' || currentStatus === null) {
      newStatus = !(currentStatus ?? true)
    } else {
      newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo'
    }

    const field = typeof currentStatus === 'boolean' || currentStatus === null ? 'is_active' : 'status'

    const fromAny = supabase.from.bind(supabase) as (t: string) => ReturnType<typeof supabase.from>
    await fromAny(table).update({ [field]: newStatus }).eq('id', id)
    fetchData()
  }, [supabase, fetchData])

  // --- Guardar (crear o editar) ---
  const handleSave = guard(async (formData: Record<string, unknown>) => {
    setSaving(true)
    const isNew = !formData.id
    const table = activeTab === 'proyectos' ? 'projects'
      : activeTab === 'personas' ? 'people'
      : activeTab === 'equipos' ? 'equipment'
      : activeTab === 'ubicaciones' ? 'locations'
      : activeTab === 'tarifas' ? 'mobilization_rates'
      : 'project_extras'

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...payload } = formData
    const fromAny = supabase.from.bind(supabase) as (t: string) => ReturnType<typeof supabase.from>

    if (isNew) {
      await fromAny(table).insert(payload)
    } else {
      await fromAny(table).update(payload).eq('id', formData.id as string)
    }

    setSaving(false)
    closeModal()
    fetchData()
  })

  // --- Agregar/quitar proyecto a persona ---
  const addPersonProject = useCallback(async (personId: string, projectId: string) => {
    await supabase.from('person_projects').insert({
      person_id: personId,
      project_id: projectId,
    })
    fetchPersonProjects(personId)
  }, [supabase, fetchPersonProjects])

  const removePersonProject = useCallback(async (assignmentId: string, personId: string) => {
    await supabase.from('person_projects').delete().eq('id', assignmentId)
    fetchPersonProjects(personId)
  }, [supabase, fetchPersonProjects])

  // ============================================================
  // Render helpers por tab
  // ============================================================

  const renderContent = () => {
    switch (activeTab) {
      case 'proyectos': return <ProjectsTab />
      case 'personas': return <PersonasTab />
      case 'equipos': return <EquiposTab />
      case 'ubicaciones': return <UbicacionesTab />
      case 'tarifas': return <TarifasTab />
      case 'extras': return <ExtrasTab />
      case 'notificaciones': return <NotificacionesTab />
    }
  }

  // --- PROYECTOS ---
  function ProjectsTab() {
    const filtered = projects.filter((p) =>
      !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Project>[] = [
      { key: 'code', header: 'Código', sortable: true, render: (r) => <span className="font-mono font-medium">{r.code}</span> },
      { key: 'name', header: 'Nombre', sortable: true, render: (r) => r.name },
      { key: 'manager', header: 'Gerente', render: (r) => r.manager ?? '—' },
      { key: 'client', header: 'Cliente', render: (r) => r.client ?? '—', className: 'hidden lg:table-cell' },
      { key: 'status', header: 'Estado', render: (r) => (
        <Badge label={r.status ?? 'Activo'} variant="custom"
          bg={r.status === 'Activo' ? 'bg-green-100' : r.status === 'Cerrado' ? 'bg-red-100' : 'bg-gray-100'}
          text={r.status === 'Activo' ? 'text-green-700' : r.status === 'Cerrado' ? 'text-red-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )},
    ]

    return <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
  }

  // --- PERSONAS ---
  function PersonasTab() {
    const filtered = people.filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.email ?? '').toLowerCase().includes(search.toLowerCase()) || (p.code ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Person>[] = [
      { key: 'name', header: 'Nombre', sortable: true, render: (r) => (
        <button onClick={() => {
          if (showPersonProjects === r.id) {
            setShowPersonProjects(null)
          } else {
            setShowPersonProjects(r.id)
            fetchPersonProjects(r.id)
          }
        }} className="text-left font-medium text-iconsa-blue hover:underline">{r.name}</button>
      )},
      { key: 'app_role', header: 'Rol', sortable: true, render: (r) => {
        const roleLabel = ROLE_OPTIONS.find((o) => o.value === (r.app_role ?? ''))?.label ?? r.app_role ?? '—'
        return <Badge label={roleLabel} variant="custom" bg="bg-purple-100" text="text-purple-700" />
      }},
      { key: 'position', header: 'Cargo', render: (r) => r.position ?? '—', className: 'hidden lg:table-cell' },
      { key: 'email', header: 'Email', render: (r) => r.email ?? '—', className: 'hidden md:table-cell' },
      { key: 'status', header: 'Estado', render: (r) => (
        <Badge label={r.status ?? 'Activo'} variant="custom"
          bg={r.status === 'Activo' ? 'bg-green-100' : 'bg-gray-100'}
          text={r.status === 'Activo' ? 'text-green-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleStatus('people', r.id, r.status) }} className="rounded p-1 hover:bg-gray-100" title="Activar/Desactivar">
            <Power className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )},
    ]

    return (
      <>
        <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
        {/* Panel de proyectos asignados */}
        {showPersonProjects && (
          <PersonProjectsPanel
            personId={showPersonProjects}
            personName={people.find((p) => p.id === showPersonProjects)?.name ?? ''}
            assignments={personProjects}
            loading={loadingPersonProjects}
            projectOptions={allProjects}
            onAdd={addPersonProject}
            onRemove={removePersonProject}
            onClose={() => setShowPersonProjects(null)}
          />
        )}
      </>
    )
  }

  // --- EQUIPOS ---
  function EquiposTab() {
    const filtered = equipmentList.filter((e) =>
      !search || (e.spectrum_code ?? '').toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Equipment>[] = [
      { key: 'spectrum_code', header: 'Código', sortable: true, render: (r) => <span className="font-mono text-sm">{r.spectrum_code ?? '—'}</span> },
      { key: 'description', header: 'Descripción', sortable: true, render: (r) => r.description },
      { key: 'type_code', header: 'Tipo', sortable: true, render: (r) => r.type_code ?? '—' },
      { key: 'brand', header: 'Marca', render: (r) => r.brand ?? '—', className: 'hidden lg:table-cell' },
      { key: 'status', header: 'Estado', render: (r) => (
        <Badge label={r.status ?? 'Activo'} variant="custom"
          bg={r.status === 'Activo' ? 'bg-green-100' : 'bg-gray-100'}
          text={r.status === 'Activo' ? 'text-green-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
          <Pencil className="h-4 w-4 text-gray-500" />
        </button>
      )},
    ]

    return <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
  }

  // --- UBICACIONES ---
  function UbicacionesTab() {
    const filtered = locationsList.filter((l) =>
      !search || l.name.toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Location>[] = [
      { key: 'name', header: 'Nombre', sortable: true, render: (r) => r.name },
      { key: 'type', header: 'Tipo', sortable: true, render: (r) => r.location_type ?? '—' },
      { key: 'project', header: 'Proyecto', render: (r) => r.projects ? `${r.projects.code} — ${r.projects.name}` : '—' },
      { key: 'active', header: 'Estado', render: (r) => (
        <Badge label={r.is_active !== false ? 'Activa' : 'Inactiva'} variant="custom"
          bg={r.is_active !== false ? 'bg-green-100' : 'bg-gray-100'}
          text={r.is_active !== false ? 'text-green-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleStatus('locations', r.id, r.is_active) }} className="rounded p-1 hover:bg-gray-100" title="Activar/Desactivar">
            <Power className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )},
    ]

    return <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
  }

  // --- TARIFAS ---
  function TarifasTab() {
    const filtered = rates.filter((r) =>
      !search || r.code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Rate>[] = [
      { key: 'code', header: 'Código', sortable: true, render: (r) => <span className="font-mono font-medium">{r.code}</span> },
      { key: 'description', header: 'Descripción', sortable: true, render: (r) => r.description },
      { key: 'rate', header: 'Tarifa (B/.)', sortable: true, render: (r) => `B/. ${r.rate.toLocaleString('es-PA', { minimumFractionDigits: 2 })}`, sortValue: (r) => r.rate },
      { key: 'active', header: 'Estado', render: (r) => (
        <Badge label={r.is_active !== false ? 'Activa' : 'Inactiva'} variant="custom"
          bg={r.is_active !== false ? 'bg-green-100' : 'bg-gray-100'}
          text={r.is_active !== false ? 'text-green-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleStatus('mobilization_rates', r.id, r.is_active) }} className="rounded p-1 hover:bg-gray-100" title="Activar/Desactivar">
            <Power className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )},
    ]

    return <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
  }

  // --- EXTRAS ---
  function ExtrasTab() {
    const filtered = extras.filter((e) =>
      !search || e.code.toLowerCase().includes(search.toLowerCase()) || (e.description ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    const columns: Column<Extra>[] = [
      { key: 'code', header: 'Código', sortable: true, render: (r) => <span className="font-mono font-medium">{r.code}</span> },
      { key: 'description', header: 'Descripción', sortable: true, render: (r) => r.description ?? '—' },
      { key: 'project', header: 'Proyecto', render: (r) => {
        const proj = allProjects.find((p) => p.value === r.project_id)
        return proj?.label ?? r.project_id
      }},
      { key: 'active', header: 'Estado', render: (r) => (
        <Badge label={r.is_active ? 'Activo' : 'Inactivo'} variant="custom"
          bg={r.is_active ? 'bg-green-100' : 'bg-gray-100'}
          text={r.is_active ? 'text-green-700' : 'text-gray-700'}
        />
      )},
      { key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r as unknown as Record<string, unknown>) }} className="rounded p-1 hover:bg-gray-100" title="Editar">
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleStatus('project_extras', r.id, r.is_active) }} className="rounded p-1 hover:bg-gray-100" title="Activar/Desactivar">
            <Power className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )},
    ]

    return (
      <>
        <div className="mb-4">
          <Select
            label="Filtrar por proyecto"
            placeholder="Todos los proyectos"
            options={allProjects}
            value={extrasProjectFilter}
            onChange={setExtrasProjectFilter}
          />
        </div>
        <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} loading={loadingData} pagination="client" />
      </>
    )
  }

  // --- NOTIFICACIONES ---
  function NotificacionesTab() {
    const filtered = notifPeople.filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.email ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    const toggleEnabled = async (personId: string, currentValue: boolean) => {
      const newValue = !currentValue
      setNotifPeople(prev => prev.map(p => p.id === personId ? { ...p, notifications_enabled: newValue } : p))
      await supabase.from('people').update({ notifications_enabled: newValue }).eq('id', personId)
    }

    const togglePref = async (personId: string, key: string, currentPrefs: Record<string, boolean> | null) => {
      const prefs = { ...(currentPrefs ?? {}) }
      prefs[key] = !prefs[key]
      setNotifPeople(prev => prev.map(p => p.id === personId ? { ...p, notification_preferences: prefs } : p))
      await supabase.from('people').update({ notification_preferences: prefs }).eq('id', personId)
    }

    if (loadingData) {
      return <div className="py-8 text-center text-gray-500">Cargando...</div>
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2">Persona</th>
              <th className="px-2 py-2 text-center" title="Master toggle">Activo</th>
              <th className="px-2 py-2 text-center" title="Recibe todas las notificaciones">Todo</th>
              {NOTIF_EVENT_KEYS.map(e => (
                <th key={e.key} className="px-1.5 py-2 text-center whitespace-nowrap" title={e.key}>{e.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(person => {
              const prefs = person.notification_preferences ?? {}
              const isDisabled = !person.notifications_enabled
              const isReceiveAll = !!prefs.receive_all

              return (
                <tr key={person.id} className={isDisabled ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{person.name}</span>
                      <span className="text-xs text-gray-500">
                        {person.email}
                        {person.app_role && (
                          <span className="ml-1.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                            {person.app_role}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={person.notifications_enabled}
                      onChange={() => toggleEnabled(person.id, person.notifications_enabled)}
                      title={`Notificaciones ${person.notifications_enabled ? 'activas' : 'desactivadas'} para ${person.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-iconsa-blue focus:ring-iconsa-blue"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isReceiveAll}
                      disabled={isDisabled}
                      onChange={() => togglePref(person.id, 'receive_all', prefs)}
                      title={`Recibir todas las notificaciones — ${person.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-iconsa-blue focus:ring-iconsa-blue disabled:opacity-40"
                    />
                  </td>
                  {NOTIF_EVENT_KEYS.map(e => (
                    <td key={e.key} className="px-1.5 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!prefs[e.key]}
                        disabled={isDisabled || isReceiveAll}
                        onChange={() => togglePref(person.id, e.key, prefs)}
                        title={`${e.label} — ${person.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-iconsa-blue focus:ring-iconsa-blue disabled:opacity-40"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-gray-500">No hay personas con email activo</div>
        )}
      </div>
    )
  }

  // ============================================================
  // Modal forms por tab
  // ============================================================

  const renderModalForm = () => {
    if (!editingItem) return null
    const isNew = !editingItem.id

    switch (activeTab) {
      case 'proyectos': return (
        <ProjectForm data={editingItem as Partial<Project>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} />
      )
      case 'personas': return (
        <PersonForm data={editingItem as Partial<Person>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} />
      )
      case 'equipos': return (
        <EquipmentForm data={editingItem as Partial<Equipment>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} />
      )
      case 'ubicaciones': return (
        <LocationForm data={editingItem as Partial<Location>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} projectOptions={allProjects} />
      )
      case 'tarifas': return (
        <RateForm data={editingItem as Partial<Rate>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} />
      )
      case 'extras': return (
        <ExtraForm data={editingItem as Partial<Extra>} isNew={isNew} onSave={handleSave} onCancel={closeModal} saving={saving} projectOptions={allProjects} />
      )
      case 'notificaciones': return null
    }
  }

  if (authLoading) return null
  if (role !== 'admin') return null

  const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Administración</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Barra de busqueda + boton crear (no en notificaciones) */}
      {activeTab !== 'notificaciones' && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder={`Buscar ${tabLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      )}

      {/* Contenido del tab */}
      {renderContent()}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem?.id ? `Editar ${tabLabel.slice(0, -1)}` : `Nuevo ${tabLabel.slice(0, -1)}`}
        maxWidth="lg"
      >
        {renderModalForm()}
      </Modal>
    </div>
  )
}

// ============================================================
// Formularios por tab
// ============================================================

interface FormProps<T> {
  data: Partial<T>
  isNew: boolean
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
  saving: boolean
  projectOptions?: SelectOption[]
}

function ProjectForm({ data, isNew, onSave, onCancel, saving }: FormProps<Project>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    code: data.code ?? '',
    name: data.name ?? '',
    manager: data.manager ?? '',
    status: data.status ?? 'Activo',
    location: data.location ?? '',
    client: data.client ?? '',
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!isNew} />
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Gerente" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
        <Input label="Cliente" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        <Input label="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Select label="Estado" options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm({ ...form, status: v ?? 'Activo' })} />
      </div>
      <FormActions onSave={() => onSave(form)} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function PersonForm({ data, isNew, onSave, onCancel, saving }: FormProps<Person>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    name: data.name ?? '',
    app_role: data.app_role ?? '',
    position: data.position ?? '',
    department: data.department ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    status: data.status ?? 'Activo',
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isNew} />
        <Select label="Rol de Sistema" options={ROLE_OPTIONS} value={form.app_role} onChange={(v) => setForm({ ...form, app_role: v ?? '' })} />
        <Input label="Cargo" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <Input label="Departamento" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <FormActions onSave={() => {
        const payload = { ...form, app_role: form.app_role || null }
        onSave(payload)
      }} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function EquipmentForm({ data, isNew, onSave, onCancel, saving }: FormProps<Equipment>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    spectrum_code: data.spectrum_code ?? '',
    description: data.description ?? '',
    type_code: data.type_code ?? '',
    equipment_type: data.equipment_type ?? '',
    brand: data.brand ?? '',
    model: data.model ?? '',
    status: data.status ?? 'Activo',
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Código Spectrum" value={form.spectrum_code} onChange={(e) => setForm({ ...form, spectrum_code: e.target.value })} disabled={!isNew} />
        <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="Código Tipo" value={form.type_code} onChange={(e) => setForm({ ...form, type_code: e.target.value })} />
        <Input label="Tipo Equipo" value={form.equipment_type} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })} />
        <Input label="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input label="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <Select label="Estado" options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]} value={form.status ?? 'Activo'} onChange={(v) => setForm({ ...form, status: v ?? 'Activo' })} />
      </div>
      <FormActions onSave={() => onSave(form)} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function LocationForm({ data, isNew, onSave, onCancel, saving, projectOptions }: FormProps<Location>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    name: data.name ?? '',
    location_type: data.location_type ?? '',
    project_id: data.project_id ?? '',
    is_active: data.is_active !== false,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isNew} />
        <Select label="Tipo" options={LOCATION_TYPES} value={form.location_type} onChange={(v) => setForm({ ...form, location_type: v ?? '' })} />
        <Select label="Proyecto Asociado" placeholder="(Ninguno)" options={projectOptions ?? []} value={form.project_id || null} onChange={(v) => setForm({ ...form, project_id: v ?? '' })} />
      </div>
      <FormActions onSave={() => {
        const payload = { ...form, project_id: form.project_id || null }
        onSave(payload)
      }} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function RateForm({ data, isNew, onSave, onCancel, saving }: FormProps<Rate>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    code: data.code ?? '',
    description: data.description ?? '',
    rate: data.rate ?? 0,
    is_active: data.is_active !== false,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!isNew} />
        <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="Tarifa (B/.)" type="number" min="0" step="0.01" value={String(form.rate)} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} />
      </div>
      <FormActions onSave={() => onSave(form)} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function ExtraForm({ data, isNew, onSave, onCancel, saving, projectOptions }: FormProps<Extra>) {
  const [form, setForm] = useState({
    id: data.id ?? '',
    project_id: data.project_id ?? '',
    code: data.code ?? '',
    description: data.description ?? '',
    is_active: data.is_active !== false,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Proyecto" options={projectOptions ?? []} value={form.project_id || null} onChange={(v) => setForm({ ...form, project_id: v ?? '' })} disabled={!isNew} />
        <Input label="Código" placeholder="E1, E2..." value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!isNew} />
        <div className="sm:col-span-2">
          <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <FormActions onSave={() => onSave(form)} onCancel={onCancel} saving={saving} />
    </div>
  )
}

// ============================================================
// Componentes auxiliares
// ============================================================

function FormActions({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
      <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
      <Button onClick={onSave} loading={saving}>Guardar</Button>
    </div>
  )
}

function PersonProjectsPanel({
  personId,
  personName,
  assignments,
  loading,
  projectOptions,
  onAdd,
  onRemove,
  onClose,
}: {
  personId: string
  personName: string
  assignments: PersonProject[]
  loading: boolean
  projectOptions: SelectOption[]
  onAdd: (personId: string, projectId: string) => void
  onRemove: (assignmentId: string, personId: string) => void
  onClose: () => void
}) {
  const [newProjectId, setNewProjectId] = useState<string | null>(null)

  // Filtrar proyectos ya asignados
  const assignedIds = new Set(assignments.map((a) => a.project_id))
  const availableProjects = projectOptions.filter((p) => !assignedIds.has(p.value))

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Proyectos de {personName}</h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : (
        <>
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500 mb-3">Sin proyectos asignados</p>
          ) : (
            <div className="space-y-2 mb-3">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                  <span>{a.projects ? `${a.projects.code} — ${a.projects.name}` : a.project_id}</span>
                  <button
                    onClick={() => onRemove(a.id, personId)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar proyecto */}
          {availableProjects.length > 0 && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label="Agregar proyecto"
                  placeholder="Seleccionar..."
                  options={availableProjects}
                  value={newProjectId}
                  onChange={setNewProjectId}
                />
              </div>
              <Button
                size="sm"
                disabled={!newProjectId}
                onClick={() => {
                  if (newProjectId) {
                    onAdd(personId, newProjectId)
                    setNewProjectId(null)
                  }
                }}
              >
                Agregar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
