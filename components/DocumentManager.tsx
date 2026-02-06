'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Trash2, FileText, Image, File, Download, Loader2, X } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { createDocumentRecord, deleteDocumentRecord } from '@/lib/documents'

interface Document {
  id: string
  name: string
  size: number
  type: string
  url: string
  created_at: string
}

interface DocumentManagerProps {
  leadId: string
  documents: Document[]
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

function getFileIcon(type: string) {
  if (type === 'application/pdf') {
    return <FileText size={18} style={{ color: '#ef4444' }} />
  }
  if (
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return <FileText size={18} style={{ color: '#3b82f6' }} />
  }
  if (
    type === 'application/vnd.ms-excel' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return <FileText size={18} style={{ color: '#22c55e' }} />
  }
  if (type.startsWith('image/')) {
    return <Image size={18} style={{ color: '#a855f7' }} />
  }
  return <File size={18} style={{ color: '#6b7280' }} />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function DocumentManager({ leadId, documents: initialDocuments }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFileName, setUploadFileName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: globalThis.File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Dateityp nicht unterstützt.')
        return
      }

      setUploading(true)
      setUploadProgress(0)
      setUploadFileName(file.name)
      setError(null)

      try {
        const supabase = createSupabaseBrowser()
        const filePath = `leads/${leadId}/${file.name}`

        // Simulate progress since Supabase JS doesn't expose upload progress natively
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 150)

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: true })

        clearInterval(progressInterval)

        if (uploadError) {
          setError(`Upload fehlgeschlagen: ${uploadError.message}`)
          setUploading(false)
          return
        }

        setUploadProgress(95)

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        const url = urlData.publicUrl

        const result = await createDocumentRecord({
          lead_id: leadId,
          name: file.name,
          size: file.size,
          type: file.type,
          url,
        })

        if (!result.success) {
          setError(`Datensatz konnte nicht erstellt werden: ${result.error}`)
          setUploading(false)
          return
        }

        setUploadProgress(100)

        // Optimistically add the document to the list
        const newDoc: Document = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url,
          created_at: new Date().toISOString(),
        }
        setDocuments((prev) => [newDoc, ...prev])

        setTimeout(() => {
          setUploading(false)
          setUploadProgress(0)
          setUploadFileName('')
        }, 500)
      } catch (err) {
        setError('Ein unerwarteter Fehler ist aufgetreten.')
        setUploading(false)
      }
    },
    [leadId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleUpload(file)
    },
    [handleUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleUpload]
  )

  const handleDelete = useCallback(
    async (doc: Document) => {
      setDeletingId(doc.id)
      setError(null)

      try {
        const supabase = createSupabaseBrowser()
        const filePath = `leads/${leadId}/${doc.name}`

        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath])

        if (storageError) {
          setError(`Löschen fehlgeschlagen: ${storageError.message}`)
          setDeletingId(null)
          return
        }

        const result = await deleteDocumentRecord(doc.id, leadId)

        if (!result.success) {
          setError(`Datensatz konnte nicht gelöscht werden: ${result.error}`)
          setDeletingId(null)
          return
        }

        setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      } catch {
        setError('Ein unerwarteter Fehler ist aufgetreten.')
      } finally {
        setDeletingId(null)
      }
    },
    [leadId]
  )

  const handleDownload = useCallback(
    async (doc: Document) => {
      try {
        const supabase = createSupabaseBrowser()
        const filePath = `leads/${leadId}/${doc.name}`

        const { data, error: signError } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 60)

        if (signError || !data?.signedUrl) {
          setError('Download-Link konnte nicht erstellt werden.')
          return
        }

        window.open(data.signedUrl, '_blank')
      } catch {
        setError('Ein unerwarteter Fehler ist aufgetreten.')
      }
    },
    [leadId]
  )

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Dokumente</h3>

      {/* Error message */}
      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorText}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={styles.errorClose}
            aria-label="Fehler schließen"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={styles.progressContainer}>
          <div style={styles.progressInfo}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={styles.progressFileName}>{uploadFileName}</span>
          </div>
          <div style={styles.progressBarTrack}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${uploadProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...styles.dropZone,
          borderColor: isDragOver ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #e5e7eb)',
          backgroundColor: isDragOver
            ? 'var(--color-primary-light, rgba(59, 130, 246, 0.05))'
            : 'transparent',
        }}
      >
        <Upload size={20} style={{ color: 'var(--color-text-tertiary, #9ca3af)' }} />
        <span style={styles.dropZoneText}>
          Dateien hierher ziehen oder klicken
        </span>
        <span style={styles.dropZoneHint}>
          PDF, DOC, XLS, PNG, JPG
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div style={styles.emptyState}>
          <File size={32} style={{ color: 'var(--color-text-tertiary, #9ca3af)' }} />
          <p style={styles.emptyTitle}>Keine Dokumente</p>
          <p style={styles.emptyHint}>
            Laden Sie Dokumente hoch, indem Sie sie in den Bereich oben ziehen.
          </p>
        </div>
      ) : (
        <div style={styles.documentList}>
          {documents.map((doc) => (
            <div key={doc.id} style={styles.documentRow}>
              <div style={styles.documentIcon}>{getFileIcon(doc.type)}</div>
              <div style={styles.documentInfo}>
                <span style={styles.documentName}>{doc.name}</span>
                <span style={styles.documentMeta}>
                  {formatFileSize(doc.size)} &middot; {formatDate(doc.created_at)}
                </span>
              </div>
              <div style={styles.documentActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(doc)
                  }}
                  style={styles.actionButton}
                  title="Herunterladen"
                  aria-label="Herunterladen"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(doc)
                  }}
                  style={styles.deleteButton}
                  title="Löschen"
                  aria-label="Löschen"
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: 12,
    border: '1px solid var(--color-border, #e5e7eb)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text-primary, #111827)',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: 'var(--color-error-light, #fef2f2)',
    borderRadius: 8,
    border: '1px solid var(--color-error-border, #fecaca)',
  },
  errorText: {
    fontSize: 13,
    color: 'var(--color-error, #ef4444)',
    flex: 1,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    color: 'var(--color-error, #ef4444)',
    display: 'flex',
    alignItems: 'center',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--color-text-secondary, #6b7280)',
    fontSize: 13,
  },
  progressFileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'var(--color-bg-tertiary, #f3f4f6)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary, #3b82f6)',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '20px 16px',
    borderRadius: 10,
    border: '2px dashed',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  dropZoneText: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-secondary, #6b7280)',
  },
  dropZoneHint: {
    fontSize: 11,
    color: 'var(--color-text-tertiary, #9ca3af)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '24px 16px',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text-secondary, #6b7280)',
    margin: 0,
  },
  emptyHint: {
    fontSize: 12,
    color: 'var(--color-text-tertiary, #9ca3af)',
    margin: 0,
    textAlign: 'center',
  },
  documentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  documentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    transition: 'background-color 0.1s ease',
  },
  documentIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'var(--color-bg-tertiary, #f3f4f6)',
  },
  documentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary, #111827)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  documentMeta: {
    fontSize: 11,
    color: 'var(--color-text-tertiary, #9ca3af)',
  },
  documentActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    color: 'var(--color-text-tertiary, #9ca3af)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.1s ease, background-color 0.1s ease',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    color: 'var(--color-text-tertiary, #9ca3af)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.1s ease, background-color 0.1s ease',
  },
}
