'use client'

import { useState, useRef, useCallback } from 'react'
import {
  type Attachment,
  uploadFile,
  deleteFile,
  formatFileSize,
  isImageType,
  isAllowedType,
  isWithinSizeLimit,
} from '@/lib/supabase/storage'
import { useAuth } from '@/hooks/useAuth'

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
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const atLimit = attachments.length >= maxFiles

  // Auto-clear error after 5 seconds
  const showError = useCallback((msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!person?.id) return
      const fileArray = Array.from(files)

      // Validate count
      const remaining = maxFiles - attachments.length
      if (remaining <= 0) {
        showError(`Máximo ${maxFiles} archivos`)
        return
      }
      const toUpload = fileArray.slice(0, remaining)

      setUploading(true)
      setError(null)

      const newAttachments = [...attachments]

      for (const file of toUpload) {
        // Pre-validate before upload
        if (!isAllowedType(file.type)) {
          showError(`Tipo de archivo no permitido: ${file.name}. Use PDF, JPG, PNG o WEBP`)
          continue
        }
        if (!isWithinSizeLimit(file.size)) {
          showError(`El archivo "${file.name}" excede el límite de 10MB`)
          continue
        }

        const result = await uploadFile(file, folder, person.id)
        if (result.error) {
          showError(result.error)
        } else if (result.attachment) {
          newAttachments.push(result.attachment)
        }
      }

      onChange(newAttachments)
      setUploading(false)
    },
    [attachments, folder, maxFiles, onChange, person?.id, showError],
  )

  const handleDelete = useCallback(
    async (index: number) => {
      const file = attachments[index]
      if (!file) return

      const ok = await deleteFile(file.path)
      if (ok) {
        const updated = attachments.filter((_, i) => i !== index)
        onChange(updated)
      } else {
        showError('Error al eliminar archivo')
      }
    },
    [attachments, onChange, showError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled || atLimit) return
      void handleFiles(e.dataTransfer.files)
    },
    [disabled, atLimit, handleFiles],
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
              <span className="max-w-[160px] truncate text-sm text-gray-700" title={file.name}>
                {file.name}
              </span>
              <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => void handleDelete(idx)}
                  className="ml-1 text-red-400 hover:text-red-600"
                  title="Eliminar archivo"
                >
                  🗑
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
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
