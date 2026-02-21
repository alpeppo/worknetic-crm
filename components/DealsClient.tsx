'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { createDeal, updateDealStage, updateDeal, deleteDeal, createActivity } from '@/lib/actions'
import { Plus, Loader2, GripVertical, Edit2, Trash2, TrendingUp, DollarSign, Target, Clock, MessageSquare, XCircle, Percent } from 'lucide-react'

interface Deal {
  id: string
  name: string
  lead_id: string
  stage: string
  value: number
  probability?: number
  expected_close_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
  lost_reason?: string
  lost_notes?: string
}

interface Lead {
  id: string
  name: string
  company?: string
}

interface DealsClientProps {
  deals: Deal[]
  leads: Lead[]
  headerOnly?: boolean
}

const STAGES = [
  { id: 'discovery', name: 'Discovery', color: '#4F46E5' },
  { id: 'qualification', name: 'Qualification', color: '#818CF8' },
  { id: 'proposal', name: 'Proposal', color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', color: '#EF4444' },
  { id: 'won', name: 'Won', color: '#10B981' },
  { id: 'lost', name: 'Lost', color: '#64748B' },
]

export function DealsClient({ deals, leads, headerOnly = false }: DealsClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)
  // Lost reason modal
  const [lostDealId, setLostDealId] = useState<string | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [lostNotes, setLostNotes] = useState('')
  // Quick note
  const [quickNoteDealId, setQuickNoteDealId] = useState<string | null>(null)
  const [quickNoteText, setQuickNoteText] = useState('')
  const [quickNoteLoading, setQuickNoteLoading] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: '',
    name: '',
    value: '',
    probability: '50',
    expected_close_date: '',
    notes: ''
  })

  // --- Drag & Drop State (completely separated from server state) ---
  // stageOverrides: optimistic stage changes from drag-and-drop (dealId → newStage).
  // These are layered ON TOP of the server data and CANNOT be overwritten by server re-renders.
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})

  // localDeals: server-synced state for non-drag operations (delete optimistic removal).
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals)
  useEffect(() => {
    setLocalDeals(deals)
  }, [deals])

  // effectiveDeals: the final truth for rendering — server data + drag overrides on top.
  const effectiveDeals = useMemo(() =>
    localDeals.map(d => {
      const override = stageOverrides[d.id]
      return override ? { ...d, stage: override } : d
    }),
    [localDeals, stageOverrides]
  )

  // Clear overrides once server data confirms the new stage
  useEffect(() => {
    const keys = Object.keys(stageOverrides)
    if (keys.length === 0) return
    const confirmed = keys.filter(dealId => {
      const serverDeal = deals.find(d => d.id === dealId)
      return serverDeal && serverDeal.stage === stageOverrides[dealId]
    })
    if (confirmed.length > 0) {
      setStageOverrides(prev => {
        const next = { ...prev }
        confirmed.forEach(id => delete next[id])
        return next
      })
    }
  }, [deals, stageOverrides])

  const leadMap = new Map(leads.map(l => [l.id, l]))

  // Group deals by stage — uses effectiveDeals (server data + drag overrides)
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = effectiveDeals.filter(d => d.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  // Calculate stage values
  const stageValues = STAGES.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || []
    acc[stage.id] = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    return acc
  }, {} as Record<string, number>)

  // Stats — computed from effectiveDeals so they update optimistically on drag & drop
  const pipelineValue = effectiveDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonValue = effectiveDeals.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0)
  const weightedPipeline = effectiveDeals
    .filter(d => d.stage !== 'won' && d.stage !== 'lost')
    .reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 50) / 100), 0)
  const closedDeals = effectiveDeals.filter(d => d.stage === 'won' || d.stage === 'lost')
  const winRate = closedDeals.length > 0
    ? Math.round((effectiveDeals.filter(d => d.stage === 'won').length / closedDeals.length) * 100)
    : 0

  const resetForm = () => {
    setFormData({ lead_id: '', name: '', value: '', probability: '50', expected_close_date: '', notes: '' })
    setEditingDeal(null)
    setError(null)
  }

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal)
    setFormData({
      lead_id: deal.lead_id,
      name: deal.name,
      value: deal.value.toString(),
      probability: (deal.probability || 50).toString(),
      expected_close_date: deal.expected_close_date || '',
      notes: deal.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (dealId: string) => {
    if (!confirm('Deal wirklich löschen?')) return
    setDeletingDealId(dealId)
    const previousDeals = localDeals
    setLocalDeals(prev => prev.filter(d => d.id !== dealId))
    const result = await deleteDeal(dealId)
    if (!result.success) {
      setLocalDeals(previousDeals)
    }
    setDeletingDealId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.lead_id || !formData.name || !formData.value) {
      setError('Bitte fülle alle Pflichtfelder aus')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (editingDeal) {
        const result = await updateDeal(editingDeal.id, {
          name: formData.name,
          value: parseFloat(formData.value),
          probability: parseInt(formData.probability),
          expected_close_date: formData.expected_close_date || undefined,
          notes: formData.notes || undefined
        })

        if (result.success) {
          setIsModalOpen(false)
          resetForm()
          router.refresh()
        } else {
          setError(result.error || 'Ein Fehler ist aufgetreten')
        }
      } else {
        const result = await createDeal({
          lead_id: formData.lead_id,
          name: formData.name,
          value: parseFloat(formData.value),
          probability: parseInt(formData.probability),
          expected_close_date: formData.expected_close_date || undefined
        })

        if (result.success) {
          setIsModalOpen(false)
          resetForm()
          router.refresh()
        } else {
          setError(result.error || 'Ein Fehler ist aufgetreten')
        }
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  // Drag & Drop — Mouse-events based. No HTML5 DnD API at all.
  // Uses mousedown/mousemove/mouseup + elementFromPoint for 100% reliable drops.
  // Optimistic UI: stageOverrides moves the card instantly, server confirms later.
  const boardRef = useRef<HTMLDivElement>(null)

  // Ref to always read the latest effectiveDeals without re-creating callbacks
  const effectiveDealsRef = useRef(effectiveDeals)
  effectiveDealsRef.current = effectiveDeals

  const performDrop = useCallback(async (dealId: string, newStage: string) => {
    const deal = effectiveDealsRef.current.find(d => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    // If dropping to "lost", open lost reason modal instead of direct drop
    if (newStage === 'lost') {
      setLostDealId(dealId)
      setLostReason('')
      setLostNotes('')
      return
    }

    // Optimistic update — just set a stage override. This is SEPARATE from server state
    // and CANNOT be overwritten by useEffect/props/revalidation/router.refresh.
    setStageOverrides(prev => ({ ...prev, [dealId]: newStage }))

    // Server update — if it fails, remove the override (card goes back)
    try {
      const result = await updateDealStage(dealId, newStage)
      if (!result.success) {
        setStageOverrides(prev => {
          const next = { ...prev }
          delete next[dealId]
          return next
        })
      }
    } catch {
      setStageOverrides(prev => {
        const next = { ...prev }
        delete next[dealId]
        return next
      })
    }
  }, [])

  const confirmLostDeal = async () => {
    if (!lostDealId) return
    const dealId = lostDealId

    // Optimistic update via override
    setStageOverrides(prev => ({ ...prev, [dealId]: 'lost' }))
    setLocalDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, lost_reason: lostReason, lost_notes: lostNotes } : d
    ))
    setLostDealId(null)
    const result = await updateDealStage(dealId, 'lost', lostReason || undefined, lostNotes || undefined)
    if (!result.success) {
      setStageOverrides(prev => {
        const next = { ...prev }
        delete next[dealId]
        return next
      })
    }
  }

  const handleQuickNote = async () => {
    if (!quickNoteDealId || !quickNoteText.trim()) return
    setQuickNoteLoading(true)
    const deal = localDeals.find(d => d.id === quickNoteDealId)
    if (deal) {
      await createActivity({
        lead_id: deal.lead_id,
        type: 'note',
        subject: `Notiz zu Deal: ${deal.name}`,
        body: quickNoteText.trim()
      })
    }
    setQuickNoteLoading(false)
    setQuickNoteDealId(null)
    setQuickNoteText('')
    router.refresh()
  }

  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    // Track the current target stage during mousemove so mouseup can use it reliably
    let currentTargetStage: string | null = null

    let drag: {
      dealId: string
      sourceStage: string
      card: HTMLElement
      clone: HTMLElement | null
      offsetX: number
      offsetY: number
      startX: number
      startY: number
      started: boolean
    } | null = null

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // left click only
      const target = e.target as HTMLElement
      // Don't start drag from buttons or other interactive elements
      if (target.closest('button')) return

      const card = target.closest('[data-deal-id]') as HTMLElement | null
      if (!card) return
      const dealId = card.getAttribute('data-deal-id')
      if (!dealId) return
      const col = card.closest('[data-stage]')
      const sourceStage = col?.getAttribute('data-stage') || ''

      const rect = card.getBoundingClientRect()
      drag = {
        dealId,
        sourceStage,
        card,
        clone: null,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: e.clientX,
        startY: e.clientY,
        started: false,
      }
      currentTargetStage = null
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!drag) return

      // Start drag after 5px movement threshold (to allow clicks)
      if (!drag.started) {
        const dx = Math.abs(e.clientX - drag.startX)
        const dy = Math.abs(e.clientY - drag.startY)
        if (dx + dy < 5) return
        drag.started = true

        // Create floating clone
        const clone = drag.card.cloneNode(true) as HTMLElement
        clone.style.cssText = `
          position: fixed;
          width: ${drag.card.offsetWidth}px;
          z-index: 10000;
          pointer-events: none;
          opacity: 0.92;
          transform: rotate(1.5deg) scale(1.03);
          box-shadow: 0 16px 48px rgba(0,0,0,0.2);
          transition: none;
          cursor: grabbing;
        `
        document.body.appendChild(clone)
        drag.clone = clone

        // Dim original card
        drag.card.style.opacity = '0.3'
        drag.card.style.transition = 'none'
      }

      // Move clone to cursor position
      if (drag.clone) {
        drag.clone.style.left = (e.clientX - drag.offsetX) + 'px'
        drag.clone.style.top = (e.clientY - drag.offsetY) + 'px'
      }

      // Highlight column under cursor (hide clone temporarily for elementFromPoint)
      if (drag.clone) {
        drag.clone.style.display = 'none'
        const el = document.elementFromPoint(e.clientX, e.clientY)
        drag.clone.style.display = ''

        board.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'))
        const col = el?.closest('[data-stage]')
        if (col) {
          col.classList.add('drag-over')
          currentTargetStage = col.getAttribute('data-stage')
        } else {
          currentTargetStage = null
        }
      }
    }

    const onMouseUp = () => {
      if (!drag) return

      if (drag.started && drag.clone) {
        // Clean up clone and visual state
        drag.clone.remove()
        drag.card.style.opacity = ''
        drag.card.style.transition = ''
        board.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'))

        // Use the tracked target stage from mousemove (more reliable than elementFromPoint in mouseup)
        if (currentTargetStage && currentTargetStage !== drag.sourceStage) {
          performDrop(drag.dealId, currentTargetStage)
        }
      }

      drag = null
      currentTargetStage = null
    }

    board.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      board.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // Clean up if component unmounts during drag
      if (drag?.clone) {
        drag.clone.remove()
        drag.card.style.opacity = ''
        drag.card.style.transition = ''
      }
    }
  }, [performDrop])

  // Modal form content
  const modalContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label className="form-label">Lead *</label>
        <select
          value={formData.lead_id}
          onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
          className="form-input"
          required
          disabled={!!editingDeal}
        >
          <option value="">Lead auswählen...</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name} {lead.company ? `(${lead.company})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Deal Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="form-input"
          placeholder="z.B. Automation Package"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Wert (EUR) *</label>
          <input
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="form-input"
            placeholder="5000"
            min="0"
            step="1"
            required
          />
        </div>
        <div>
          <label className="form-label">Wahrscheinlichkeit (%)</label>
          <input
            type="number"
            value={formData.probability}
            onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
            className="form-input"
            placeholder="50"
            min="0"
            max="100"
          />
        </div>
      </div>
      <div>
        <label className="form-label">Erwartetes Abschlussdatum</label>
        <input
          type="date"
          value={formData.expected_close_date}
          onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label">Notizen</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input"
          rows={3}
          placeholder="Zusätzliche Informationen zum Deal..."
        />
      </div>
      <div className="flex items-center justify-between pt-5 mt-1">
        {editingDeal ? (
          <button
            type="button"
            onClick={() => { setIsModalOpen(false); resetForm(); handleDelete(editingDeal.id); }}
            className="btn flex items-center gap-2 text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)]"
            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={16} />
            Löschen
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setIsModalOpen(false); resetForm(); }}
          >
            Abbrechen
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {editingDeal ? 'Speichern...' : 'Erstellen...'}
              </>
            ) : (
              editingDeal ? 'Speichern' : 'Deal erstellen'
            )}
          </button>
        </div>
      </div>
    </form>
  )

  // If headerOnly, only render the button and modal
  if (headerOnly) {
    return (
      <>
        <button className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus size={18} />
          Deal erstellen
        </button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); resetForm(); }}
          title={editingDeal ? 'Deal bearbeiten' : 'Neuen Deal erstellen'}
          size="md"
        >
          {modalContent}
        </Modal>
      </>
    )
  }

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-blue)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Pipeline</span>
            <div className="stat-icon stat-icon-blue"><TrendingUp size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-blue)' }}>€{(pipelineValue / 1000).toFixed(0)}k</div>
          <p className="stat-subtitle">Gesamtwert</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-green)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Gewonnen</span>
            <div className="stat-icon stat-icon-green"><DollarSign size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-green)' }}>€{(wonValue / 1000).toFixed(0)}k</div>
          <p className="stat-subtitle">Abgeschlossen</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-purple)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Gewichtet</span>
            <div className="stat-icon stat-icon-purple"><Target size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-purple)' }}>€{(weightedPipeline / 1000).toFixed(0)}k</div>
          <p className="stat-subtitle">Pipeline × Probability</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-orange)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Win Rate</span>
            <div className="stat-icon stat-icon-orange"><Percent size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-orange)' }}>{winRate}%</div>
          <p className="stat-subtitle">{closedDeals.length} abgeschlossen</p>
        </div>
      </div>

      {/* Kanban Board — all drag events handled via native DOM listeners in useEffect */}
      <div className="kanban-board" ref={boardRef}>
        {STAGES.map((stage) => {
          const stageDeals = dealsByStage[stage.id] || []
          const stageValue = stageValues[stage.id] || 0

          return (
            <div
              key={stage.id}
              className="kanban-column"
              data-stage={stage.id}
            >
              <div className="kanban-column-header" style={{ '--kanban-accent': stage.color } as React.CSSProperties}>
                <div className="kanban-column-title">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: stage.color }}
                  />
                  {stage.name}
                  <span className="kanban-column-count">{stageDeals.length}</span>
                </div>
                <div className="kanban-column-value">
                  €{(stageValue / 1000).toFixed(0)}k
                </div>
              </div>

              <div className="kanban-cards" style={{ minHeight: '100px' }}>
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => {
                    const lead = deal.lead_id ? leadMap.get(deal.lead_id) : null

                    return (
                      <div
                        key={deal.id}
                        className="kanban-card group"
                        data-deal-id={deal.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GripVertical
                              size={14}
                              className="text-muted flex-shrink-0 cursor-grab"
                              style={{ opacity: 0.4 }}
                            />
                            <div
                              className="kanban-card-title truncate hover:text-[var(--color-blue)] transition-colors cursor-pointer"
                              onClick={() => router.push(`/deals/${deal.id}`)}
                            >
                              {deal.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuickNoteDealId(deal.id); setQuickNoteText(''); }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[rgba(79,70,229,0.1)] text-muted hover:text-[#4F46E5] transition-all"
                              title="Schnelle Notiz"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(deal); }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[var(--color-text)] transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                              disabled={deletingDealId === deal.id}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[rgba(239,68,68,0.1)] text-muted hover:text-[#EF4444] transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div
                          className="kanban-card-company hover:text-[var(--color-blue)] transition-colors cursor-pointer"
                          onClick={() => router.push(`/deals/${deal.id}`)}
                        >
                          {lead?.company || lead?.name || 'Kein Lead'}
                        </div>
                        <div className="kanban-card-footer">
                          <div className="kanban-card-value">
                            €{(deal.value || 0).toLocaleString()}
                          </div>
                          <div className="kanban-card-probability">
                            {deal.probability || 0}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {deal.created_at && (() => {
                            const days = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24))
                            const isStale = days > 30
                            return (
                              <div className="flex items-center gap-1 text-xs" style={{ color: isStale ? '#EF4444' : 'var(--color-text-tertiary)' }}>
                                <Clock size={11} />
                                {days}d
                              </div>
                            )
                          })()}
                          {deal.expected_close_date && (
                            <div className="text-xs text-muted">
                              Close: {new Date(deal.expected_close_date).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </div>
                          )}
                        </div>
                        {deal.stage === 'lost' && deal.lost_reason && (
                          <div className="mt-2 px-2 py-1 rounded-md text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                            {deal.lost_reason === 'budget' && 'Budget / Zu teuer'}
                            {deal.lost_reason === 'timing' && 'Timing'}
                            {deal.lost_reason === 'competitor' && 'Wettbewerber'}
                            {deal.lost_reason === 'no_need' && 'Kein Bedarf'}
                            {deal.lost_reason === 'no_response' && 'Keine Rückmeldung'}
                            {deal.lost_reason === 'bad_fit' && 'Passt nicht'}
                            {deal.lost_reason === 'other' && 'Sonstiges'}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="kanban-empty-placeholder">
                    Keine Deals
                  </div>
                )}

                {/* Add Deal Button */}
                <button
                  className="w-full py-3 border-2 border-dashed border-[var(--color-border)] rounded-xl text-muted text-sm hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-[rgba(79,70,229,0.03)] transition-all flex items-center justify-center gap-2"
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                  <Plus size={15} />
                  <span>Hinzufügen</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create/Edit Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingDeal ? 'Deal bearbeiten' : 'Neuen Deal erstellen'}
        size="md"
      >
        {modalContent}
      </Modal>

      {/* Lost Reason Modal */}
      <Modal
        isOpen={!!lostDealId}
        onClose={() => setLostDealId(null)}
        title="Deal als verloren markieren"
        size="md"
      >
        <div className="space-y-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(239,68,68,0.06)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
            <XCircle size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Warum wurde dieser Deal verloren? Diese Info hilft, den Sales-Prozess zu verbessern.
            </p>
          </div>
          <div>
            <label className="form-label">Grund</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="form-input"
            >
              <option value="">Grund auswählen...</option>
              <option value="budget">Budget / Zu teuer</option>
              <option value="timing">Timing / Nicht jetzt</option>
              <option value="competitor">Wettbewerber gewählt</option>
              <option value="no_need">Kein Bedarf mehr</option>
              <option value="no_response">Keine Rückmeldung</option>
              <option value="bad_fit">Passt nicht zusammen</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notizen (optional)</label>
            <textarea
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Was genau ist passiert? Was können wir daraus lernen?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-5 mt-1">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLostDealId(null)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: '#EF4444', color: 'white', border: 'none' }}
              onClick={confirmLostDeal}
            >
              Als verloren markieren
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick Note Modal */}
      <Modal
        isOpen={!!quickNoteDealId}
        onClose={() => setQuickNoteDealId(null)}
        title="Schnelle Notiz"
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
            className="form-input"
            rows={4}
            placeholder="Notiz eingeben..."
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQuickNoteDealId(null)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={quickNoteLoading || !quickNoteText.trim()}
              onClick={handleQuickNote}
            >
              {quickNoteLoading ? <Loader2 size={16} className="animate-spin" /> : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
