'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { importLeadsFromCSV } from '@/lib/actions'
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, X, Loader2 } from 'lucide-react'

interface CSVImportProps {
  onSuccess?: () => void
  onCancel?: () => void
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'result'

const LEAD_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'E-Mail', required: false },
  { key: 'phone', label: 'Telefon', required: false },
  { key: 'company', label: 'Unternehmen', required: false },
  { key: 'headline', label: 'Headline / Position', required: false },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'location', label: 'Standort', required: false },
  { key: 'vertical', label: 'Vertical', required: false },
  { key: 'source', label: 'Quelle', required: false },
  { key: 'stage', label: 'Stage', required: false },
] as const

type LeadFieldKey = typeof LEAD_FIELDS[number]['key']

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)

  return { headers, rows }
}

function guessMapping(headers: string[]): Record<string, LeadFieldKey | ''> {
  const mapping: Record<string, LeadFieldKey | ''> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  const patterns: Record<LeadFieldKey, RegExp[]> = {
    name: [/^name$/i, /^full\s*name$/i, /^kontakt$/i, /^lead$/i, /^vor.*nach.*name$/i],
    email: [/^e?\-?mail$/i, /^email\s*address$/i, /^e-mail-adresse$/i],
    phone: [/^phone$/i, /^telefon$/i, /^tel$/i, /^mobile$/i, /^handy$/i, /^rufnummer$/i],
    company: [/^company$/i, /^unternehmen$/i, /^firma$/i, /^organization$/i, /^organisation$/i],
    headline: [/^headline$/i, /^position$/i, /^titel$/i, /^title$/i, /^job\s*title$/i, /^beruf$/i],
    linkedin_url: [/^linkedin$/i, /^linkedin\s*url$/i, /^linkedin\s*link$/i, /^profil$/i],
    website: [/^website$/i, /^webseite$/i, /^url$/i, /^homepage$/i, /^web$/i],
    location: [/^location$/i, /^standort$/i, /^ort$/i, /^city$/i, /^stadt$/i, /^adresse$/i],
    vertical: [/^vertical$/i, /^branche$/i, /^industry$/i, /^zielgruppe$/i, /^segment$/i],
    source: [/^source$/i, /^quelle$/i, /^herkunft$/i, /^origin$/i, /^kanal$/i],
    stage: [/^stage$/i, /^status$/i, /^phase$/i, /^stufe$/i],
  }

  headers.forEach((header, index) => {
    const lower = lowerHeaders[index]
    for (const [field, regexes] of Object.entries(patterns)) {
      if (regexes.some(r => r.test(lower))) {
        mapping[header] = field as LeadFieldKey
        return
      }
    }
    mapping[header] = ''
  })

  return mapping
}

export function CSVImport({ onSuccess, onCancel }: CSVImportProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, LeadFieldKey | ''>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)

    if (!file.name.endsWith('.csv')) {
      setError('Bitte eine CSV-Datei hochladen.')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text)

      if (parsedHeaders.length === 0) {
        setError('Die Datei scheint leer zu sein.')
        return
      }

      if (parsedRows.length === 0) {
        setError('Keine Datenzeilen gefunden (nur Header).')
        return
      }

      setHeaders(parsedHeaders)
      setRows(parsedRows)
      setMapping(guessMapping(parsedHeaders))
      setStep('mapping')
    }
    reader.onerror = () => {
      setError('Fehler beim Lesen der Datei.')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleMappingChange = (csvHeader: string, leadField: LeadFieldKey | '') => {
    setMapping(prev => ({ ...prev, [csvHeader]: leadField }))
  }

  const isNameMapped = Object.values(mapping).includes('name')

  const getMappedLeads = (): Record<string, string>[] => {
    return rows.map(row => {
      const lead: Record<string, string> = {}
      headers.forEach((header, index) => {
        const field = mapping[header]
        if (field && row[index]) {
          lead[field] = row[index]
        }
      })
      if (!lead.stage) {
        lead.stage = 'new'
      }
      return lead
    }).filter(lead => lead.name && lead.name.trim() !== '')
  }

  const handleStartImport = async () => {
    setStep('importing')
    setError(null)

    try {
      const leads = getMappedLeads()

      if (leads.length === 0) {
        setError('Keine gültigen Leads gefunden. Stelle sicher, dass die Name-Spalte zugeordnet ist und Werte enthält.')
        setStep('mapping')
        return
      }

      const result = await importLeadsFromCSV(leads)
      setImportResult(result)
      setStep('result')

      if (result.success) {
        router.refresh()
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.')
      setStep('mapping')
    }
  }

  const previewRows = rows.slice(0, 5)
  const mappedFields = Object.entries(mapping).filter(([, v]) => v !== '')
  const totalValidLeads = rows.filter(row => {
    const nameIndex = headers.findIndex(h => mapping[h] === 'name')
    return nameIndex >= 0 && row[nameIndex] && row[nameIndex].trim() !== ''
  }).length

  // ── Upload Step ──
  if (step === 'upload') {
    return (
      <div style={{ padding: '8px 0' }}>
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '14px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#EF4444'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '48px 32px',
            border: `2px dashed ${isDragOver ? '#4F46E5' : 'var(--color-border)'}`,
            borderRadius: '20px',
            background: isDragOver ? 'rgba(79, 70, 229, 0.04)' : 'var(--color-bg-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDragOver ? 'rgba(79, 70, 229, 0.12)' : 'rgba(79, 70, 229, 0.08)',
            transition: 'all 0.2s ease',
          }}>
            <Upload size={28} style={{ color: '#4F46E5' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '6px'
            }}>
              CSV-Datei hierher ziehen
            </p>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-tertiary)'
            }}>
              oder klicken zum Auswählen
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--color-text-tertiary)'
          }}>
            <FileSpreadsheet size={14} />
            .csv mit Kopfzeile
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {onCancel && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={onCancel} className="btn btn-secondary">
              Abbrechen
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Mapping Step ──
  if (step === 'mapping') {
    return (
      <div style={{ padding: '8px 0' }}>
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '14px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#EF4444'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* File info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '14px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(16, 185, 129, 0.1)',
          }}>
            <FileSpreadsheet size={22} style={{ color: '#10B981' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{fileName}</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              {rows.length} Zeilen &middot; {headers.length} Spalten
            </p>
          </div>
          <button
            onClick={() => {
              setStep('upload')
              setHeaders([])
              setRows([])
              setMapping({})
              setFileName('')
              setError(null)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              background: 'var(--color-bg)',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              transition: 'all 0.2s',
            }}
            title="Andere Datei wählen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mapping title */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '4px'
          }}>
            Felder zuordnen
          </h3>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-tertiary)'
          }}>
            Ordne die CSV-Spalten den Lead-Feldern zu. Name ist erforderlich.
          </p>
        </div>

        {/* Mapping table */}
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 40px 1fr',
            alignItems: 'center',
            padding: '12px 20px',
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CSV-Spalte
            </span>
            <span />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Lead-Feld
            </span>
          </div>

          {headers.map((header, idx) => (
            <div
              key={header}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 40px 1fr',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: idx < headers.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: mapping[header] ? 'rgba(79, 70, 229, 0.02)' : 'var(--color-bg)',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                }}>
                  {header}
                </span>
                {rows[0] && rows[0][idx] && (
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--color-text-tertiary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    z.B. &quot;{rows[0][idx]}&quot;
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ArrowRight size={16} style={{ color: mapping[header] ? '#4F46E5' : 'var(--color-text-tertiary)', opacity: mapping[header] ? 1 : 0.4 }} />
              </div>

              <select
                value={mapping[header] || ''}
                onChange={(e) => handleMappingChange(header, e.target.value as LeadFieldKey | '')}
                className="form-input"
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  borderColor: mapping[header] === 'name' ? '#10B981' : undefined,
                }}
              >
                <option value="">-- Nicht importieren --</option>
                {LEAD_FIELDS.map(field => {
                  const alreadyMapped = Object.entries(mapping).some(
                    ([key, val]) => val === field.key && key !== header
                  )
                  return (
                    <option key={field.key} value={field.key} disabled={alreadyMapped}>
                      {field.label}{field.required ? ' *' : ''}{alreadyMapped ? ' (bereits zugeordnet)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          ))}
        </div>

        {/* Preview section */}
        {mappedFields.length > 0 && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '4px'
              }}>
                Vorschau
              </h3>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-text-tertiary)'
              }}>
                Erste {Math.min(5, rows.length)} von {rows.length} Zeilen
              </p>
            </div>

            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '24px',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {mappedFields.map(([csvHeader, fieldKey]) => {
                        const field = LEAD_FIELDS.find(f => f.key === fieldKey)
                        return (
                          <th
                            key={csvHeader}
                            style={{
                              padding: '10px 16px',
                              textAlign: 'left',
                              background: 'var(--color-bg-secondary)',
                              borderBottom: '1px solid var(--color-border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--color-text-tertiary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {field?.label || fieldKey}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {mappedFields.map(([csvHeader]) => {
                          const colIdx = headers.indexOf(csvHeader)
                          return (
                            <td
                              key={csvHeader}
                              style={{
                                padding: '10px 16px',
                                borderBottom: rowIdx < previewRows.length - 1 ? '1px solid var(--color-border)' : 'none',
                                color: 'var(--color-text)',
                                whiteSpace: 'nowrap',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {row[colIdx] || <span style={{ color: 'var(--color-text-tertiary)' }}>--</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Validation notice */}
        {!isNameMapped && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '14px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#F59E0B'
          }}>
            <AlertCircle size={18} />
            Bitte ordne mindestens die Spalte &quot;Name&quot; zu.
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
            {totalValidLeads} von {rows.length} Leads werden importiert
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-secondary">
                Abbrechen
              </button>
            )}
            <button
              onClick={handleStartImport}
              disabled={!isNameMapped || totalValidLeads === 0}
              className="btn btn-primary"
              style={{
                opacity: !isNameMapped || totalValidLeads === 0 ? 0.5 : 1,
                cursor: !isNameMapped || totalValidLeads === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Upload size={16} />
              {totalValidLeads} Leads importieren
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Importing Step ──
  if (step === 'importing') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: '20px',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(79, 70, 229, 0.08)',
        }}>
          <Loader2 size={28} style={{ color: '#4F46E5', animation: 'spin 1s linear infinite' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '6px'
          }}>
            Leads werden importiert...
          </p>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-tertiary)',
          }}>
            {totalValidLeads} Leads werden verarbeitet
          </p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // ── Result Step ──
  if (step === 'result' && importResult) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        gap: '20px',
      }}>
        {importResult.success ? (
          <>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(16, 185, 129, 0.1)',
            }}>
              <Check size={36} style={{ color: '#10B981' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '8px'
              }}>
                Import erfolgreich!
              </p>
              <p style={{
                fontSize: '15px',
                color: 'var(--color-text-tertiary)',
              }}>
                {importResult.count} {importResult.count === 1 ? 'Lead wurde' : 'Leads wurden'} erfolgreich importiert.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              {onCancel && (
                <button onClick={onCancel} className="btn btn-secondary">
                  Schliessen
                </button>
              )}
              <button
                onClick={() => {
                  onSuccess?.()
                }}
                className="btn btn-primary"
              >
                <Check size={16} />
                Fertig
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
            }}>
              <AlertCircle size={36} style={{ color: '#EF4444' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '8px'
              }}>
                Import fehlgeschlagen
              </p>
              <p style={{
                fontSize: '15px',
                color: 'var(--color-text-tertiary)',
                maxWidth: '400px',
              }}>
                {importResult.error || 'Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              {onCancel && (
                <button onClick={onCancel} className="btn btn-secondary">
                  Abbrechen
                </button>
              )}
              <button
                onClick={() => {
                  setStep('mapping')
                  setImportResult(null)
                  setError(null)
                }}
                className="btn btn-primary"
              >
                Erneut versuchen
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
