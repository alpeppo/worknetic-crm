'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { createDeal, updateDealStage, updateDeal } from '@/lib/actions'
import { Plus, Loader2, GripVertical, Edit2 } from 'lucide-react'

interface Deal {
  id: string
  name: string
  lead_id: string
  stage: string
  value: number
  probability?: number
  expected_close_date?: string
  notes?: string
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
  { id: 'discovery', name: 'Discovery', color: '#3b82f6' },
  { id: 'qualification', name: 'Qualification', color: '#8b5cf6' },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', color: '#ef4444' },
  { id: 'won', name: 'Won', color: '#10b981' },
]

export function DealsClient({ deals, leads, headerOnly = false }: DealsClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState({
    lead_id: '',
    name: '',
    value: '',
    probability: '50',
    expected_close_date: '',
    notes: ''
  })

  // Optimistic local deals state — allows instant UI updates on drag & drop
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals)
  useEffect(() => { setLocalDeals(deals) }, [deals])

  const leadMap = new Map(leads.map(l => [l.id, l]))

  // Group deals by stage — uses localDeals for optimistic updates
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = localDeals.filter(d => d.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  // Calculate stage values
  const stageValues = STAGES.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || []
    acc[stage.id] = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    return acc
  }, {} as Record<string, number>)

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
  // Optimistic UI: instantly moves card in localDeals, then syncs with server.
  const boardRef = useRef<HTMLDivElement>(null)

  const performDrop = useCallback(async (dealId: string, newStage: string) => {
    const deal = localDeals.find(d => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    // Optimistic update — move card immediately in UI
    setLocalDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, stage: newStage } : d
    ))

    // Server update
    const result = await updateDealStage(dealId, newStage)
    if (!result.success) {
      // Revert on failure
      setLocalDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage: deal.stage } : d
      ))
    }
    router.refresh()
  }, [localDeals, router])

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
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
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
              <div className="kanban-column-header">
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
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(deal); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[var(--color-text)] transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
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
                        {deal.expected_close_date && (
                          <div className="text-xs text-muted mt-2">
                            Close: {new Date(deal.expected_close_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: 'short'
                            })}
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
                  className="w-full py-3 border-2 border-dashed border-[var(--color-border)] rounded-lg text-muted text-sm hover:border-[#007AFF] hover:text-[#007AFF] transition-colors"
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                  <Plus size={16} className="inline mr-1" />
                  Deal hinzufügen
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lost Deals Section (if any) */}
      {deals.some(d => d.stage === 'lost') && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-muted">Verlorene Deals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deals
              .filter(d => d.stage === 'lost')
              .map((deal) => {
                const lead = deal.lead_id ? leadMap.get(deal.lead_id) : null
                return (
                  <div key={deal.id} className="card" style={{ opacity: 0.7 }}>
                    <div className="card-body">
                      <div className="font-semibold">{deal.name}</div>
                      <div className="text-sm text-muted">{lead?.company || '–'}</div>
                      <div className="text-sm text-danger mt-2">
                        €{(deal.value || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Create/Edit Deal Modal */}
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
