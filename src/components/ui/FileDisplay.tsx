'use client'

import { useState, useCallback, useEffect } from 'react'
import { type Attachment, getFileUrl, formatFileSize, isImageType } from '@/lib/supabase/storage'

interface FileDisplayProps {
  attachments: Attachment[]
  collapsible?: boolean
  label?: string
}

export default function FileDisplay({
  attachments,
  collapsible = true,
  label = 'Documentos Adjuntos',
}: FileDisplayProps) {
  const [expanded, setExpanded] = useState(!collapsible)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [loadingUrls, setLoadingUrls] = useState(false)

  // Cargar signed URLs cuando se expande la sección
  const loadUrls = useCallback(async () => {
    if (loadingUrls || attachments.length === 0) return
    setLoadingUrls(true)

    const urls: Record<string, string> = {}
    for (const file of attachments) {
      const url = await getFileUrl(file.path)
      if (url) urls[file.path] = url
    }
    setSignedUrls(urls)
    setLoadingUrls(false)
  }, [attachments, loadingUrls])

  useEffect(() => {
    if (expanded && Object.keys(signedUrls).length === 0 && attachments.length > 0) {
      void loadUrls()
    }
  }, [expanded, signedUrls, attachments.length, loadUrls])

  if (attachments.length === 0) return null

  const images = attachments.filter((f) => isImageType(f.type))
  const documents = attachments.filter((f) => !isImageType(f.type))

  return (
    <div className="space-y-2">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        📎 {label} ({attachments.length})
      </button>

      {expanded && (
        <div className="space-y-3 pl-5">
          {loadingUrls && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              Cargando archivos...
            </div>
          )}

          {/* Imágenes — grid de thumbnails */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((file) => {
                const url = signedUrls[file.path]
                return (
                  <div key={file.path} className="group relative">
                    {url ? (
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(url)}
                        className="block overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={file.name}
                          className="h-20 w-20 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                        <span className="text-2xl">🖼️</span>
                      </div>
                    )}
                    <p className="mt-1 max-w-20 truncate text-xs text-gray-500" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Documentos (PDFs) */}
          {documents.map((file) => {
            const url = signedUrls[file.path]
            return (
              <div key={file.path} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span className="text-sm font-medium text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-blue-600 hover:underline"
                      title="Descargar"
                    >
                      ↓ Descargar
                    </a>
                  )}
                </div>
                {/* Render PDF inline */}
                {url && file.type === 'application/pdf' && (
                  <iframe
                    src={url}
                    className="h-100 w-full rounded-lg border border-gray-200"
                    title={file.name}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox para imágenes */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute right-4 top-4 text-2xl text-white hover:text-gray-300"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Vista completa"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
