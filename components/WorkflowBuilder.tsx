'use client'

import { useState } from 'react'
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  UserPlus,
  Briefcase,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  Bell,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import {
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
} from '@/lib/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Workflow {
  id: string
  name: string
  description: string | null
  trigger_type: string
  trigger_config: Record<string, unknown>
  actions: Array<{ type: string; config: Record<string, unknown> }>
  active: boolean
  run_count: number
  last_run_at: string | null
  created_at: string
}

interface WorkflowBuilderProps {
  workflows: Workflow[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Neuer Lead', description: 'Wenn ein Lead erstellt wird', icon: UserPlus },
  { value: 'stage_changed', label: 'Stage geändert', description: 'Wenn sich der Stage eines Leads ändert', icon: ArrowRight },
  { value: 'deal_created', label: 'Neuer Deal', description: 'Wenn ein Deal erstellt wird', icon: Briefcase },
  { value: 'follow_up_overdue', label: 'Follow-up überfällig', description: 'Wenn ein Follow-up überfällig ist', icon: AlertCircle },
  { value: 'inactivity', label: 'Inaktivität', description: 'Wenn ein Lead X Tage inaktiv ist', icon: Clock },
]

const ACTION_TYPES = [
  { value: 'change_stage', label: 'Stage ändern', icon: ArrowRight },
  { value: 'create_activity', label: 'Aktivität erstellen', icon: MessageSquare },
  { value: 'set_follow_up', label: 'Follow-up setzen', icon: Calendar },
  { value: 'send_notification', label: 'Benachrichtigung', icon: Bell },
]

const STAGES = [
  { value: 'new', label: 'Neu' },
  { value: 'contacted', label: 'Kontaktiert' },
  { value: 'qualified', label: 'Qualifiziert' },
  { value: 'discovery_call', label: 'Discovery Call' },
  { value: 'proposal_sent', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerLabel(type: string): string {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label ?? type
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Noch nie'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowBuilder({ workflows: initialWorkflows }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Wizard state
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({})
  const [actions, setActions] = useState<Array<{ type: string; config: Record<string, unknown> }>>([])
  const [saving, setSaving] = useState(false)

  // -----------------------------------------------------------------------
  // Modal helpers
  // -----------------------------------------------------------------------

  function openCreate() {
    setEditingWorkflow(null)
    setStep(1)
    setName('')
    setDescription('')
    setTriggerType('')
    setTriggerConfig({})
    setActions([])
    setModalOpen(true)
  }

  function openEdit(wf: Workflow) {
    setEditingWorkflow(wf)
    setStep(1)
    setName(wf.name)
    setDescription(wf.description ?? '')
    setTriggerType(wf.trigger_type)
    setTriggerConfig(wf.trigger_config ?? {})
    setActions(wf.actions ?? [])
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingWorkflow(null)
  }

  // -----------------------------------------------------------------------
  // Actions on workflows
  // -----------------------------------------------------------------------

  async function handleToggle(wf: Workflow) {
    setTogglingId(wf.id)
    try {
      await toggleWorkflow(wf.id, !wf.active)
      setWorkflows((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, active: !w.active } : w)),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteWorkflow(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      name,
      description: description || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      actions,
    }

    try {
      if (editingWorkflow) {
        await updateWorkflow(editingWorkflow.id, payload)
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === editingWorkflow.id ? { ...w, name, description: description || null, trigger_type: triggerType, trigger_config: triggerConfig, actions } : w,
          ),
        )
      } else {
        const result = await createWorkflow(payload)
        if (result.success && result.workflow) {
          setWorkflows((prev) => [result.workflow as Workflow, ...prev])
        }
      }
      closeModal()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Action list helpers
  // -----------------------------------------------------------------------

  function addAction(type: string) {
    setActions((prev) => [...prev, { type, config: {} }])
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateActionConfig(index: number, key: string, value: unknown) {
    setActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, config: { ...a.config, [key]: value } } : a)),
    )
  }

  // -----------------------------------------------------------------------
  // Validation per step
  // -----------------------------------------------------------------------

  const canProceedStep1 = name.trim().length > 0
  const canProceedStep2 = triggerType.length > 0
  const canSave = actions.length > 0

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button onClick={openCreate} style={styles.primaryButton}>
          <Plus size={18} />
          <span>Workflow erstellen</span>
        </button>
      </div>

      {/* Workflow grid */}
      {workflows.length === 0 ? (
        <div style={styles.emptyState}>
          <Zap size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            Keine Workflows vorhanden
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Erstelle deinen ersten Workflow, um Aufgaben zu automatisieren.
          </p>
          <button onClick={openCreate} style={styles.primaryButton}>
            <Plus size={18} />
            <span>Workflow erstellen</span>
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {workflows.map((wf) => (
            <div key={wf.id} style={styles.card}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: 0, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wf.name}
                  </h3>
                  {wf.description && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wf.description}
                    </p>
                  )}
                </div>
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(wf)}
                  disabled={togglingId === wf.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 12, flexShrink: 0 }}
                  title={wf.active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {togglingId === wf.id ? (
                    <Loader2 size={28} style={{ color: 'var(--color-text-tertiary)', animation: 'spin 1s linear infinite' }} />
                  ) : wf.active ? (
                    <ToggleRight size={28} style={{ color: '#34c759' }} />
                  ) : (
                    <ToggleLeft size={28} style={{ color: 'var(--color-text-tertiary)' }} />
                  )}
                </button>
              </div>

              {/* Trigger badge */}
              <div style={{ marginBottom: 16 }}>
                <span style={styles.badge}>
                  <Zap size={12} />
                  {triggerLabel(wf.trigger_type)}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
                <span>{wf.run_count} Ausführungen</span>
                <span>Zuletzt: {formatDate(wf.last_run_at)}</span>
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(wf)} style={styles.iconButton} title="Bearbeiten">
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(wf.id)}
                  disabled={deletingId === wf.id}
                  style={{ ...styles.iconButton, color: '#ff3b30' }}
                  title="Löschen"
                >
                  {deletingId === wf.id ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal overlay */}
      {modalOpen && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {editingWorkflow ? 'Workflow bearbeiten' : 'Neuer Workflow'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: s <= step ? '#007aff' : 'var(--color-border)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Step content */}
            <div style={{ minHeight: 280 }}>
              {/* Step 1: Name & Description */}
              {step === 1 && (
                <div>
                  <label style={styles.label}>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Lead Nachfassen"
                    style={styles.input}
                  />
                  <label style={{ ...styles.label, marginTop: 20 }}>Beschreibung (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Was macht dieser Workflow?"
                    rows={3}
                    style={{ ...styles.input, resize: 'vertical' }}
                  />
                </div>
              )}

              {/* Step 2: Trigger */}
              {step === 2 && (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
                    Wann soll der Workflow ausgelöst werden?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {TRIGGER_TYPES.map((t) => {
                      const Icon = t.icon
                      const selected = triggerType === t.value
                      return (
                        <button
                          key={t.value}
                          onClick={() => {
                            setTriggerType(t.value)
                            setTriggerConfig({})
                          }}
                          style={{
                            ...styles.triggerCard,
                            borderColor: selected ? '#007aff' : 'var(--color-border)',
                            background: selected ? 'rgba(0,122,255,0.06)' : 'var(--color-bg)',
                          }}
                        >
                          <Icon size={22} style={{ color: selected ? '#007aff' : 'var(--color-text-secondary)', marginBottom: 8 }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 2 }}>
                            {t.label}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            {t.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Conditional config for stage_changed */}
                  {triggerType === 'stage_changed' && (
                    <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Von Stage</label>
                        <select
                          value={(triggerConfig.from_stage as string) ?? ''}
                          onChange={(e) => setTriggerConfig((c) => ({ ...c, from_stage: e.target.value }))}
                          style={styles.input}
                        >
                          <option value="">Beliebig</option>
                          {STAGES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Zu Stage</label>
                        <select
                          value={(triggerConfig.to_stage as string) ?? ''}
                          onChange={(e) => setTriggerConfig((c) => ({ ...c, to_stage: e.target.value }))}
                          style={styles.input}
                        >
                          <option value="">Beliebig</option>
                          {STAGES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Conditional config for inactivity */}
                  {triggerType === 'inactivity' && (
                    <div style={{ marginTop: 20 }}>
                      <label style={styles.label}>Tage der Inaktivität</label>
                      <input
                        type="number"
                        min={1}
                        value={(triggerConfig.days as number) ?? ''}
                        onChange={(e) => setTriggerConfig((c) => ({ ...c, days: parseInt(e.target.value) || '' }))}
                        placeholder="z.B. 7"
                        style={{ ...styles.input, maxWidth: 160 }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Actions */}
              {step === 3 && (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
                    Was soll passieren, wenn der Trigger ausgelöst wird?
                  </p>

                  {/* Existing actions */}
                  {actions.map((action, idx) => {
                    const meta = ACTION_TYPES.find((a) => a.value === action.type)
                    const Icon = meta?.icon ?? Zap
                    return (
                      <div key={idx} style={styles.actionRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={styles.actionPill}>
                            <Icon size={14} />
                            {meta?.label ?? action.type}
                          </span>
                          <button onClick={() => removeAction(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <X size={16} style={{ color: '#ff3b30' }} />
                          </button>
                        </div>

                        {/* Config for change_stage */}
                        {action.type === 'change_stage' && (
                          <div>
                            <label style={styles.labelSmall}>Ziel-Stage</label>
                            <select
                              value={(action.config.target_stage as string) ?? ''}
                              onChange={(e) => updateActionConfig(idx, 'target_stage', e.target.value)}
                              style={styles.inputSmall}
                            >
                              <option value="">Stage wählen</option>
                              {STAGES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Config for create_activity */}
                        {action.type === 'create_activity' && (
                          <div>
                            <label style={styles.labelSmall}>Betreff</label>
                            <input
                              type="text"
                              value={(action.config.subject as string) ?? ''}
                              onChange={(e) => updateActionConfig(idx, 'subject', e.target.value)}
                              placeholder="z.B. Nachfassen"
                              style={styles.inputSmall}
                            />
                          </div>
                        )}

                        {/* Config for set_follow_up */}
                        {action.type === 'set_follow_up' && (
                          <div>
                            <label style={styles.labelSmall}>Tage ab jetzt</label>
                            <input
                              type="number"
                              min={1}
                              value={(action.config.days as number) ?? ''}
                              onChange={(e) => updateActionConfig(idx, 'days', parseInt(e.target.value) || '')}
                              placeholder="z.B. 3"
                              style={{ ...styles.inputSmall, maxWidth: 120 }}
                            />
                          </div>
                        )}

                        {/* Config for send_notification */}
                        {action.type === 'send_notification' && (
                          <div>
                            <label style={styles.labelSmall}>Nachricht</label>
                            <input
                              type="text"
                              value={(action.config.message as string) ?? ''}
                              onChange={(e) => updateActionConfig(idx, 'message', e.target.value)}
                              placeholder="Benachrichtigungstext"
                              style={styles.inputSmall}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add action buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {ACTION_TYPES.map((a) => {
                      const Icon = a.icon
                      return (
                        <button key={a.value} onClick={() => addAction(a.value)} style={styles.addActionButton}>
                          <Icon size={14} />
                          {a.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <div>
                {step > 1 && (
                  <button onClick={() => setStep((s) => s - 1)} style={styles.secondaryButton}>
                    <ChevronLeft size={16} />
                    Zurück
                  </button>
                )}
              </div>
              <div>
                {step < 3 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                    style={{
                      ...styles.primaryButton,
                      opacity: (step === 1 ? !canProceedStep1 : !canProceedStep2) ? 0.5 : 1,
                      cursor: (step === 1 ? !canProceedStep1 : !canProceedStep2) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Weiter
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={!canSave || saving}
                    style={{
                      ...styles.primaryButton,
                      opacity: !canSave || saving ? 0.5 : 1,
                      cursor: !canSave || saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#007aff',
    background: 'rgba(0,122,255,0.08)',
    borderRadius: 8,
    padding: '4px 10px',
  },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    transition: 'background 0.15s',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#007aff',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center' as const,
  },

  // Modal
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: 'var(--color-bg)',
    borderRadius: 24,
    padding: 36,
    width: '100%',
    maxWidth: 640,
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
  },

  // Forms
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: 6,
  },
  labelSmall: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-tertiary)',
    marginBottom: 4,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    color: 'var(--color-text)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputSmall: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--color-text)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },

  // Trigger cards
  triggerCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    padding: 16,
    border: '2px solid var(--color-border)',
    borderRadius: 16,
    background: 'var(--color-bg)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s, background 0.15s',
  },

  // Action rows
  actionRow: {
    padding: 16,
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    marginBottom: 10,
  },
  actionPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 20,
    padding: '4px 12px',
  },
  addActionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg)',
    border: '1px dashed var(--color-border)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
}
