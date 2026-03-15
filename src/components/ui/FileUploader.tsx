'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  type Attachment,
  uploadFile,
  deleteFile,
  formatFileSize,
  isImageType,
  isAllowedType,
  isWithinSizeLimit,
  inferMimeType,
} from '@/lib/supabase/storage'
import { useAuth } from '@/hooks/useAuth'
import FileDisplay from './FileDisplay'

interface FileUploaderProps {
  attachments: Attachment[]
  folder: string
  onChange: (files: Attachment[]) => void
  maxFiles?: number
  disabled?: boolean
  label?: string
  hint?: string
}

export default function FileUploader({
  attachments,
  folder,
  onChange,
  maxFiles = 10,
  disabled = false,
  label = 'Documentos Adjuntos',
  hint = 'Formatos: PDF, JPG, PNG, WEBP. Máx 10MB',
}: FileUploaderProps) {
  const { person } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [deleting, setDeleting] = useState<Set<number>>(new Set())
  const attachmentsRef = useRef(attachments)
  const timerRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => { attachmentsRef.current = attachments }, [attachments])

  const atLimit = attachments.length >= maxFiles

  const addError = useCallback((msg: string) => {
    setErrors((prev) => [...prev, msg])
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setErrors([]), 5000)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!person?.id) return
      const fileArray = Array.from(files)

      const remaining = maxFiles - attachmentsRef.current.length
      if (remaining <= 0) {
        addError(`Máximo ${maxFiles} archivos`)
        return
      }
      const toUpload = fileArray.slice(0, remaining)

      setUploading(true)
      setErrors([])

      const newAttachments = [...attachmentsRef.current]
      const newErrors: string[] = []

      for (const file of toUpload) {
        const inferredType = inferMimeType(file)
        if (!isAllowedType(inferredType)) {
          newErrors.push(`Tipo no permitido: ${file.name}. Use PDF, JPG, PNG o WEBP`)
          continue
        }
        if (!isWithinSizeLimit(file.size)) {
          newErrors.push(`"${file.name}" excede 10MB`)
          continue
        }

        const result = await uploadFile(file, folder, person.id)
        if (result.error) {
          newErrors.push(result.error)
        } else if (result.attachment) {
          newAttachments.push(result.attachment)
        }
      }

      onChange(newAttachments)
      setUploading(false)
      if (newErrors.length > 0) {
        setErrors(newErrors)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setErrors([]), 5000)
      }
    },
    [folder, maxFiles, onChange, person?.id, addError],
  )

  const handleDelete = useCallback(
    async (index: number) => {
      const current = attachmentsRef.current
      const file = current[index]
      if (!file) return

      setDeleting((prev) => new Set(prev).add(index))

      const ok = await deleteFile(file.path)
      if (ok) {
        const updated = attachmentsRef.current.filter((_, i) => i !== index)
        onChange(updated)
      } else {
        addError('Error al eliminar archivo')
      }

      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    },
    [onChange, addError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled || atLimit || uploading) return
      void handleFiles(e.dataTransfer.files)
    },
    [disabled, atLimit, uploading, handleFiles],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !atLimit) setDragOver(true)
    },
    [disabled, atLimit],
  )

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Lista de archivos subidos */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={file.path}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              {isImageType(file.type) ? (
                <span className="text-sm">🖼️</span>
              ) : (
                <span className="text-sm">📄</span>
              )}
              <span className="max-w-40 truncate text-sm text-gray-700" title={file.name}>
                {file.name}
              </span>
              <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => void handleDelete(idx)}
                  className="ml-1 text-red-400 hover:text-red-600 disabled:opacity-40"
                  title="Eliminar archivo"
                  disabled={deleting.has(idx)}
                >
                  {deleting.has(idx) ? '⏳' : '🗑'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zona de drop / botón de subida */}
      {!disabled && (
        <>
          {atLimit ? (
            <p className="text-xs text-orange-600">Máximo {maxFiles} archivos alcanzado</p>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                  <span className="text-sm text-gray-500">Subiendo...</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Arrastre archivos aquí o haga click para seleccionar
                </p>
              )}
            </div>
          )}

          {/* Inputs ocultos */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            title="Seleccionar archivos"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files)
              e.target.value = ''
            }}
          />

          {/* Botón cámara mobile */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
            disabled={atLimit || uploading}
          >
            📷 Tomar foto
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            title="Tomar foto"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </>
      )}

      {/* Hint */}
      {hint && !disabled && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}

      {/* Error inline */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-700">{err}</p>
          ))}
        </div>
      )}

      {/* Preview inline de archivos existentes */}
      {attachments.length > 0 && (
        <FileDisplay attachments={attachments} label="Vista previa" />
      )}
    </div>
  )
}
