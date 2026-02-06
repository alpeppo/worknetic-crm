'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Plus, Edit2, Trash2, Copy, Check, FileText, X, Save, Eye } from 'lucide-react'
import { createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/actions'

interface EmailTemplateEditorProps {
  templates: any[]
}

const CATEGORIES: Record<string, { label: string; color: string; bgColor: string }> = {
  outreach: { label: 'Erstansprache', color: '#007AFF', bgColor: 'rgba(0, 122, 255, 0.1)' },
  follow_up: { label: 'Follow-up', color: '#FF9500', bgColor: 'rgba(255, 149, 0, 0.1)' },
  proposal: { label: 'Angebot', color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.1)' },
  meeting: { label: 'Meeting', color: '#AF52DE', bgColor: 'rgba(175, 82, 222, 0.1)' },
  general: { label: 'Allgemein', color: '#86868b', bgColor: 'rgba(134, 134, 139, 0.1)' },
}

const VERTICALS = [
  { value: 'coaches_berater', label: 'Coaches & Berater' },
  { value: 'immobilienmakler', label: 'Immobilienmakler' },
  { value: 'steuerberater', label: 'Steuerberater' },
  { value: 'handwerker', label: 'Handwerker' },
]

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  const unique = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
  return unique
}

function highlightVariables(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{\w+\}\})/g)
  return parts.map((part, i) => {
    if (/^\{\{\w+\}\}$/.test(part)) {
      return (
        <span
          key={i}
          style={{
            display: 'inline',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(0, 122, 255, 0.1)',
            color: '#007AFF',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function EmailTemplateEditor({ templates }: EmailTemplateEditorProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Form state
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCategory, setFormCategory] = useState('outreach')
  const [formVertical, setFormVertical] = useState('')

  // Variable fill values for preview
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory)

  const detectedVariables = useMemo(() => extractVariables(formBody), [formBody])

  const resetForm = () => {
    setFormName('')
    setFormSubject('')
    setFormBody('')
    setFormCategory('outreach')
    setFormVertical('')
    setError(null)
  }

  const openCreateForm = () => {
    resetForm()
    setEditingId(null)
    setIsCreating(true)
  }

  const openEditForm = (template: any) => {
    setFormName(template.name || '')
    setFormSubject(template.subject || '')
    setFormBody(template.body || '')
    setFormCategory(template.category || 'general')
    setFormVertical(template.vertical || '')
    setError(null)
    setIsCreating(false)
    setEditingId(template.id)
  }

  const closeForm = () => {
    setIsCreating(false)
    setEditingId(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    setIsLoading(true)
    setError(null)

    const variables = extractVariables(formBody)
    const payload = {
      name: formName.trim(),
      subject: formSubject.trim(),
      body: formBody.trim(),
      category: formCategory,
      vertical: formVertical || undefined,
      variables,
    }

    try {
      const result = editingId
        ? await updateEmailTemplate(editingId, payload)
        : await createEmailTemplate(payload)

      if (result.success) {
        closeForm()
        router.refresh()
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten.')
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return

    setIsLoading(true)
    const result = await deleteEmailTemplate(id)
    if (result.success) {
      if (editingId === id) closeForm()
      if (previewId === id) setPreviewId(null)
      router.refresh()
    }
    setIsLoading(false)
  }

  const handleCopy = async (template: any) => {
    let text = template.body || ''
    const vars = extractVariables(text)
    vars.forEach(v => {
      const value = variableValues[v]
      if (value) {
        text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), value)
      }
    })

    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback silent
    }
  }

  const openPreview = (template: any) => {
    const vars = extractVariables(template.body || '')
    const initial: Record<string, string> = {}
    vars.forEach(v => { initial[v] = variableValues[v] || '' })
    setVariableValues(initial)
    setPreviewId(template.id)
  }

  const previewTemplate = templates.find(t => t.id === previewId)
  const isFormOpen = isCreating || editingId !== null

  const getFilledPreview = (body: string): string => {
    let text = body
    Object.entries(variableValues).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`)
    })
    return text
  }

  return (
    <div>
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            E-Mail Vorlagen
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
            {templates.length} {templates.length === 1 ? 'Vorlage' : 'Vorlagen'} gespeichert
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#007AFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
          }}
        >
          <Plus size={16} />
          Neue Vorlage
        </button>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterCategory('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '100px',
            border: filterCategory === 'all' ? '1px solid #007AFF' : '1px solid var(--color-border)',
            background: filterCategory === 'all' ? 'rgba(0, 122, 255, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filterCategory === 'all' ? '#007AFF' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Alle
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '100px',
              border: filterCategory === key ? `1px solid ${cat.color}` : '1px solid var(--color-border)',
              background: filterCategory === key ? cat.bgColor : 'var(--color-bg)',
              fontSize: '13px',
              fontWeight: 500,
              color: filterCategory === key ? cat.color : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Form Panel (Create / Edit) */}
      {isFormOpen && (
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {editingId ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </h3>
            <button
              onClick={closeForm}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)',
                transition: 'all 0.2s',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 59, 48, 0.08)',
                color: '#FF3B30',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-input"
                placeholder="z.B. LinkedIn Erstansprache"
              />
            </div>
            <div>
              <label className="form-label">Betreff *</label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="form-input"
                placeholder="z.B. Kurze Frage zu {{company}}"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Kategorie</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="form-input"
              >
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Vertical</label>
              <select
                value={formVertical}
                onChange={(e) => setFormVertical(e.target.value)}
                className="form-input"
              >
                <option value="">Alle Verticals</option>
                {VERTICALS.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Nachricht *</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              className="form-input"
              rows={8}
              placeholder={`Hallo {{name}},\n\nich habe gesehen, dass {{company}} im Bereich {{vertical}} aktiv ist...\n\nVerwende {{variable}} für dynamische Platzhalter.`}
              style={{ resize: 'vertical', minHeight: '160px', fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}
            />
          </div>

          {/* Detected Variables */}
          {detectedVariables.length > 0 && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'var(--color-bg-secondary)',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Erkannte Variablen
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {detectedVariables.map(v => (
                  <span
                    key={v}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 122, 255, 0.1)',
                      color: '#007AFF',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <button onClick={closeForm} className="btn btn-secondary">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isLoading ? (
                'Speichern...'
              ) : (
                <>
                  <Save size={16} />
                  {editingId ? 'Speichern' : 'Vorlage erstellen'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {previewTemplate && (
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 122, 255, 0.1)',
                }}
              >
                <Eye size={20} style={{ color: '#007AFF' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  Vorschau: {previewTemplate.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', margin: 0, marginTop: '2px' }}>
                  Variablen ausfüllen und kopieren
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)',
                transition: 'all 0.2s',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Variable Inputs */}
          {extractVariables(previewTemplate.body || '').length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Variablen ausfüllen
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {extractVariables(previewTemplate.body || '').map(v => (
                  <div key={v}>
                    <label className="form-label" style={{ fontSize: '12px' }}>{v}</label>
                    <input
                      type="text"
                      value={variableValues[v] || ''}
                      onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                      className="form-input"
                      placeholder={`Wert für {{${v}}}`}
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Preview */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Betreff
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--color-bg-secondary)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text)',
                lineHeight: '1.5',
              }}
            >
              {highlightVariables(getFilledPreview(previewTemplate.subject || ''))}
            </div>
          </div>

          {/* Body Preview */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Nachricht
            </div>
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'var(--color-bg-secondary)',
                fontSize: '14px',
                color: 'var(--color-text)',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {highlightVariables(getFilledPreview(previewTemplate.body || ''))}
            </div>
          </div>

          {/* Copy Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleCopy(previewTemplate)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {copiedId === previewTemplate.id ? (
                <>
                  <Check size={16} />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  In Zwischenablage kopieren
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-bg-secondary)',
              margin: '0 auto 20px',
            }}
          >
            <FileText size={28} style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
            {filterCategory === 'all' ? 'Keine Vorlagen vorhanden' : 'Keine Vorlagen in dieser Kategorie'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginBottom: '24px' }}>
            {filterCategory === 'all'
              ? 'Erstelle deine erste E-Mail Vorlage, um schneller zu kommunizieren.'
              : 'Erstelle eine neue Vorlage oder wähle eine andere Kategorie.'}
          </div>
          {filterCategory === 'all' && (
            <button
              onClick={openCreateForm}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              Erste Vorlage erstellen
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTemplates.map((template) => {
            const cat = CATEGORIES[template.category] || CATEGORIES.general
            const vars = extractVariables(template.body || '')
            const verticalLabel = VERTICALS.find(v => v.value === template.vertical)?.label

            return (
              <div
                key={template.id}
                style={{
                  background: 'var(--color-bg)',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border)',
                  padding: '20px 24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  {/* Left Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: cat.bgColor,
                          flexShrink: 0,
                        }}
                      >
                        <Mail size={18} style={{ color: cat.color }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {template.name}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {template.subject}
                        </div>
                      </div>
                    </div>

                    {/* Badges Row */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 12px',
                          borderRadius: '100px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: cat.bgColor,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </span>
                      {verticalLabel && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'rgba(175, 82, 222, 0.1)',
                            color: '#AF52DE',
                          }}
                        >
                          {verticalLabel}
                        </span>
                      )}
                      {vars.length > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {vars.length} {vars.length === 1 ? 'Variable' : 'Variablen'}
                        </span>
                      )}
                    </div>

                    {/* Body Preview */}
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-tertiary)',
                        marginTop: '12px',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {template.body}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '16px', flexShrink: 0 }}>
                    <button
                      onClick={() => openPreview(template)}
                      title="Vorschau"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--color-text-tertiary)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 122, 255, 0.08)'
                        e.currentTarget.style.color = '#007AFF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-tertiary)'
                      }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleCopy(template)}
                      title="Kopieren"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: copiedId === template.id ? '#34C759' : 'var(--color-text-tertiary)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (copiedId !== template.id) {
                          e.currentTarget.style.background = 'rgba(52, 199, 89, 0.08)'
                          e.currentTarget.style.color = '#34C759'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (copiedId !== template.id) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--color-text-tertiary)'
                        }
                      }}
                    >
                      {copiedId === template.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => openEditForm(template)}
                      title="Bearbeiten"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--color-text-tertiary)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-secondary)'
                        e.currentTarget.style.color = 'var(--color-text)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-tertiary)'
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      title="Löschen"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--color-text-tertiary)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'
                        e.currentTarget.style.color = '#FF3B30'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-tertiary)'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
