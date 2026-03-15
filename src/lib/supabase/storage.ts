import { createClient } from './client'

const BUCKET = 'attachments'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export interface Attachment {
  name: string        // "OC-24950.pdf"
  path: string        // "requests/uuid/1710000000-OC-24950.pdf"
  size: number        // bytes
  type: string        // MIME type
  uploaded_at: string // ISO timestamp
  uploaded_by: string // person UUID
}

export function isAllowedType(type: string): boolean {
  return ALLOWED_TYPES.includes(type)
}

export function isWithinSizeLimit(size: number): boolean {
  return size <= MAX_SIZE
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageType(type: string): boolean {
  return type.startsWith('image/')
}

/**
 * Sube un archivo a Supabase Storage.
 * Retorna metadata del attachment o null si falla.
 */
export async function uploadFile(
  file: File,
  folder: string,
  userId: string,
): Promise<{ attachment: Attachment | null; error: string | null }> {
  if (!isAllowedType(file.type)) {
    return { attachment: null, error: `Tipo de archivo no permitido. Use PDF, JPG, PNG o WEBP` }
  }
  if (!isWithinSizeLimit(file.size)) {
    return { attachment: null, error: `El archivo "${file.name}" excede el límite de 10MB` }
  }

  const supabase = createClient()
  // Timestamp para evitar colisiones de nombre
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${folder}/${Date.now()}-${safeName}`

  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })

  console.log('[Storage] upload response:', { path, uploadData, error })

  if (error) {
    console.error('[Storage] upload error:', error)
    return { attachment: null, error: 'Error al subir archivo. Intente de nuevo' }
  }

  // Verificar que el archivo realmente existe en storage
  const { data: check } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60)

  if (!check?.signedUrl) {
    console.error('[Storage] upload reported success but file not found:', path)
    return { attachment: null, error: 'Error al subir archivo. Verifique permisos.' }
  }

  return {
    attachment: {
      name: file.name,
      path,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
    },
    error: null,
  }
}

/**
 * Obtiene URL firmada para ver un archivo (1 hora de expiración).
 */
export async function getFileUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)

  if (error) {
    console.error('Signed URL error:', error)
    return null
  }
  return data.signedUrl
}

/**
 * Elimina un archivo de Supabase Storage.
 */
export async function deleteFile(path: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error('Delete error:', error)
    return false
  }
  return true
}
