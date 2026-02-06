'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Mail,
  Copy,
  ExternalLink,
  ChevronLeft,
  Check,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { getEmailTemplates, createActivity } from '@/lib/actions'

interface EmailComposerProps {
  lead: {
    id: string
    name: string
    email?: string
    company?: string
    vertical?: string
  }
  onSuccess: () => void
  onCancel: () => void
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  vertical: string | null
  category: string
  variables: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  outreach: '#007AFF',
  follow_up: '#FF9500',
  proposal: '#34C759',
  meeting: '#AF52DE',
  general: '#8E8E93',
}

const CATEGORY_LABELS: Record<string, string> = {
  outreach: 'Outreach',
  follow_up: 'Follow-up',
  proposal: 'Angebot',
  meeting: 'Meeting',
  general: 'Allgemein',
}

const CATEGORY_ORDER = ['outreach', 'follow_up', 'proposal', 'meeting', 'general']

function interpolateVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match
  })
}

function getUnfilledVariables(
  text: string,
  filledVars: Record<string, string>
): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  const varNames = matches.map((m) => m.replace(/\{\{|\}\}/g, ''))
  const unique = [...new Set(varNames)]
  return unique.filter((v) => !(v in filledVars))
}

export default function EmailComposer({
  lead,
  onSuccess,
  onCancel,
}: EmailComposerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({})
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [sendingAction, setSendingAction] = useState(false)

  // Auto-fill variables from lead data
  const leadVariables: Record<string, string> = useMemo(() => {
    const vars: Record<string, string> = {}
    if (lead.name) vars.name = lead.name
    if (lead.company) vars.company = lead.company
    if (lead.vertical) vars.vertical = lead.vertical
    return vars
  }, [lead.name, lead.company, lead.vertical])

  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true)
        const data = await getEmailTemplates()
        setTemplates(data)
      } catch (err) {
        setError('Vorlagen konnten nicht geladen werden.')
        console.error('Failed to fetch email templates:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, EmailTemplate[]> = {}
    for (const template of templates) {
      const cat = template.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(template)
    }
    return groups
  }, [templates])

  // Determine unfilled variables for the selected template
  const unfilledVars = useMemo(() => {
    if (!selectedTemplate) return []
    const combined = selectedTemplate.subject + ' ' + selectedTemplate.body
    return getUnfilledVariables(combined, leadVariables)
  }, [selectedTemplate, leadVariables])

  // All variables (lead + custom)
  const allVariables = useMemo(
    () => ({ ...leadVariables, ...customVariables }),
    [leadVariables, customVariables]
  )

  // When a template is selected, pre-fill subject and body
  function handleSelectTemplate(template: EmailTemplate) {
    setSelectedTemplate(template)
    setCustomVariables({})
    setShowPreview(false)
    setActionFeedback(null)

    const vars = { ...leadVariables }
    setSubject(interpolateVariables(template.subject, vars))
    setBody(interpolateVariables(template.body, vars))
  }

  // Update subject/body when custom variables change
  useEffect(() => {
    if (!selectedTemplate) return
    const vars = { ...leadVariables, ...customVariables }
    setSubject(interpolateVariables(selectedTemplate.subject, vars))
    setBody(interpolateVariables(selectedTemplate.body, vars))
  }, [customVariables, selectedTemplate, leadVariables])

  function handleBackToTemplates() {
    setSelectedTemplate(null)
    setSubject('')
    setBody('')
    setCustomVariables({})
    setShowPreview(false)
    setActionFeedback(null)
  }

  async function logActivity() {
    try {
      await createActivity({
        type: 'email_sent',
        lead_id: lead.id,
        subject,
        body,
      })
    } catch (err) {
      console.error('Failed to log activity:', err)
    }
  }

  async function handleCopyToClipboard() {
    setSendingAction(true)
    try {
      const text = `Betreff: ${subject}\n\n${body}`
      await navigator.clipboard.writeText(text)
      await logActivity()
      setActionFeedback('In Zwischenablage kopiert')
      setTimeout(() => {
        setActionFeedback(null)
        onSuccess()
      }, 1500)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      setActionFeedback('Fehler beim Kopieren')
      setTimeout(() => setActionFeedback(null), 2000)
    } finally {
      setSendingAction(false)
    }
  }

  async function handleOpenInMail() {
    setSendingAction(true)
    try {
      const mailto = `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailto, '_blank')
      await logActivity()
      setActionFeedback('Mail-App geöffnet')
      setTimeout(() => {
        setActionFeedback(null)
        onSuccess()
      }, 1500)
    } catch (err) {
      console.error('Failed to open mail client:', err)
      setActionFeedback('Fehler beim Öffnen')
      setTimeout(() => setActionFeedback(null), 2000)
    } finally {
      setSendingAction(false)
    }
  }

  // Render final preview text (replace any remaining {{var}} markers)
  const previewSubject = interpolateVariables(subject, allVariables)
  const previewBody = interpolateVariables(body, allVariables)

  // ── Loading state ──
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrapper}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color="var(--color-text-tertiary)" />
          <span style={{ color: 'var(--color-text-secondary)', marginLeft: 10, fontSize: 15 }}>
            Vorlagen werden geladen...
          </span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorWrapper}>
          <AlertCircle size={20} color="#FF3B30" />
          <span style={{ color: '#FF3B30', marginLeft: 8, fontSize: 15 }}>{error}</span>
        </div>
      </div>
    )
  }

  // ── Step 2: Editor ──
  if (selectedTemplate) {
    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.editorHeader}>
          <button onClick={handleBackToTemplates} style={styles.backButton}>
            <ChevronLeft size={20} />
            <span>Vorlagen</span>
          </button>
          <h2 style={styles.editorTitle}>{selectedTemplate.name}</h2>
          <div style={{ width: 80 }} />
        </div>

        {/* No email warning */}
        {!lead.email && (
          <div style={styles.warningBanner}>
            <AlertCircle size={16} color="#FF9500" />
            <span style={{ marginLeft: 8, fontSize: 14, color: '#FF9500' }}>
              Keine E-Mail hinterlegt
            </span>
          </div>
        )}

        {/* Recipient */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>An:</label>
          <div style={styles.recipientValue}>
            {lead.email || (
              <span style={{ color: '#FF9500', fontStyle: 'italic' }}>
                Keine E-Mail hinterlegt
              </span>
            )}
          </div>
        </div>

        {/* Unfilled variables */}
        {unfilledVars.length > 0 && (
          <div style={styles.variablesSection}>
            <p style={styles.variablesSectionTitle}>Fehlende Variablen ausfüllen:</p>
            <div style={styles.variablesGrid}>
              {unfilledVars.map((varName) => (
                <div key={varName} style={styles.variableInputGroup}>
                  <label style={styles.variableLabel}>{`{{${varName}}}`}</label>
                  <input
                    type="text"
                    value={customVariables[varName] || ''}
                    onChange={(e) =>
                      setCustomVariables((prev) => ({
                        ...prev,
                        [varName]: e.target.value,
                      }))
                    }
                    placeholder={`Wert für ${varName}`}
                    style={styles.variableInput}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview toggle */}
        <div style={styles.previewToggleRow}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              ...styles.previewToggle,
              backgroundColor: showPreview ? 'var(--color-text)' : 'transparent',
              color: showPreview ? 'var(--color-bg)' : 'var(--color-text-secondary)',
            }}
          >
            {showPreview ? 'Bearbeiten' : 'Vorschau'}
          </button>
        </div>

        {showPreview ? (
          /* Preview mode */
          <div style={styles.previewContainer}>
            <div style={styles.previewSubject}>
              <span style={styles.previewSubjectLabel}>Betreff:</span>
              {previewSubject}
            </div>
            <div style={styles.previewBody}>{previewBody}</div>
          </div>
        ) : (
          /* Edit mode */
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Betreff:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={styles.subjectInput}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Nachricht:</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                style={styles.bodyTextarea}
              />
            </div>
          </>
        )}

        {/* Action feedback */}
        {actionFeedback && (
          <div style={styles.feedbackBanner}>
            <Check size={16} color="#34C759" />
            <span style={{ marginLeft: 8, fontSize: 14, color: '#34C759' }}>
              {actionFeedback}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={styles.actionRow}>
          <button onClick={onCancel} style={styles.cancelButton}>
            Abbrechen
          </button>
          <div style={styles.actionButtonGroup}>
            <button
              onClick={handleCopyToClipboard}
              disabled={sendingAction}
              style={styles.secondaryAction}
            >
              {sendingAction ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Copy size={16} />
              )}
              <span style={{ marginLeft: 6 }}>In Zwischenablage kopieren</span>
            </button>
            <button
              onClick={handleOpenInMail}
              disabled={sendingAction || !lead.email}
              style={{
                ...styles.primaryAction,
                opacity: !lead.email ? 0.5 : 1,
                cursor: !lead.email ? 'not-allowed' : 'pointer',
              }}
            >
              {sendingAction ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ExternalLink size={16} />
              )}
              <span style={{ marginLeft: 6 }}>In Mail öffnen</span>
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Step 1: Template selection ──
  return (
    <div style={styles.container}>
      <div style={styles.selectionHeader}>
        <h2 style={styles.selectionTitle}>
          <FileText size={20} style={{ marginRight: 8 }} />
          Vorlage auswählen
        </h2>
        <button onClick={onCancel} style={styles.cancelButtonSmall}>
          Abbrechen
        </button>
      </div>

      <p style={styles.selectionSubtitle}>
        E-Mail an <strong>{lead.name}</strong>
        {lead.company ? ` (${lead.company})` : ''}
      </p>

      {templates.length === 0 && (
        <div style={styles.emptyState}>
          <Mail size={32} color="var(--color-text-tertiary)" />
          <p style={{ marginTop: 12, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Keine Vorlagen verfügbar.
          </p>
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const categoryTemplates = groupedTemplates[category]
        if (!categoryTemplates || categoryTemplates.length === 0) return null
        return (
          <div key={category} style={styles.categoryGroup}>
            <h3 style={styles.categoryTitle}>
              <span
                style={{
                  ...styles.categoryDot,
                  backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.general,
                }}
              />
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div style={styles.templateGrid}>
              {categoryTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  style={styles.templateCard}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                      'var(--color-border)'
                  }}
                >
                  <div style={styles.templateCardContent}>
                    <span style={styles.templateName}>{template.name}</span>
                    <span
                      style={{
                        ...styles.categoryBadge,
                        backgroundColor: `${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general}18`,
                        color: CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general,
                      }}
                    >
                      {CATEGORY_LABELS[template.category] || template.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 24,
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  errorWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },

  // Step 1: Selection
  selectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: 'var(--color-text)',
  },
  selectionSubtitle: {
    fontSize: 15,
    color: 'var(--color-text-secondary)',
    margin: 0,
  },
  cancelButtonSmall: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: 15,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 8,
    transition: 'background-color 0.15s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  categoryGroup: {
    marginTop: 8,
  },
  categoryTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    margin: '0 0 10px 0',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 8,
    display: 'inline-block',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
  },
  templateCard: {
    display: 'flex',
    alignItems: 'stretch',
    padding: 16,
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%',
  },
  templateCardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    width: '100%',
  },
  templateName: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  categoryBadge: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: 6,
  },

  // Step 2: Editor
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: '#007AFF',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 0',
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: 'var(--color-text)',
    textAlign: 'center' as const,
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#FF950015',
    borderRadius: 10,
    border: '1px solid #FF950030',
  },
  feedbackBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    backgroundColor: '#34C75915',
    borderRadius: 10,
    border: '1px solid #34C75930',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  recipientValue: {
    fontSize: 15,
    color: 'var(--color-text)',
    padding: '10px 14px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 10,
    border: '1px solid var(--color-border)',
  },
  subjectInput: {
    fontSize: 15,
    color: 'var(--color-text)',
    padding: '10px 14px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 10,
    border: '1px solid var(--color-border)',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  bodyTextarea: {
    fontSize: 15,
    color: 'var(--color-text)',
    padding: '12px 14px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 10,
    border: '1px solid var(--color-border)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    lineHeight: 1.5,
    width: '100%',
    boxSizing: 'border-box' as const,
  },

  // Variables
  variablesSection: {
    padding: '14px 16px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 14,
    border: '1px solid var(--color-border)',
  },
  variablesSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    margin: '0 0 10px 0',
  },
  variablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  variableInputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  variableLabel: {
    fontSize: 13,
    color: 'var(--color-text-tertiary)',
    fontFamily: 'monospace',
  },
  variableInput: {
    fontSize: 14,
    color: 'var(--color-text)',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },

  // Preview
  previewToggleRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  previewToggle: {
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  previewContainer: {
    padding: '20px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 14,
    border: '1px solid var(--color-border)',
  },
  previewSubject: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid var(--color-border)',
  },
  previewSubjectLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginRight: 8,
  },
  previewBody: {
    fontSize: 15,
    color: 'var(--color-text)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },

  // Actions
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    fontSize: 15,
    color: 'var(--color-text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 10,
  },
  actionButtonGroup: {
    display: 'flex',
    gap: 10,
  },
  secondaryAction: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  primaryAction: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 500,
    color: '#FFFFFF',
    backgroundColor: '#007AFF',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
}
