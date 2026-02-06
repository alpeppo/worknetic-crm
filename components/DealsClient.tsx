'use client'

// Force rebuild: 2026-02-04T18:57
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { createDeal, updateDealStage, updateDeal } from '@/lib/actions'
import Link from 'next/link'
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
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lead_id: '',
    name: '',
    value: '',
    probability: '50',
    expected_close_date: '',
    notes: ''
  })

  const leadMap = new Map(leads.map(l => [l.id, l]))

  // Group deals by stage
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(d => d.stage === stage.id)
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

  // Drag & Drop
  const dragCounterRef = useRef<Record<string, number>>({})

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, dealId: string) => {
    setDraggedDealId(dealId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dealId)
    // Slight delay for visual feedback so browser captures drag image first
    requestAnimationFrame(() => {
      if (e.currentTarget) {
        e.currentTarget.style.opacity = '0.5'
      }
    })
  }

  const onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedDealId(null)
    setDragOverStage(null)
    dragCounterRef.current = {}
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current[stageId] = (dragCounterRef.current[stageId] || 0) + 1
    setDragOverStage(stageId)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.stopPropagation()
    dragCounterRef.current[stageId] = (dragCounterRef.current[stageId] || 0) - 1
    if (dragCounterRef.current[stageId] <= 0) {
      dragCounterRef.current[stageId] = 0
      if (dragOverStage === stageId) {
        setDragOverStage(null)
      }
    }
  }

  const onDrop = async (e: React.DragEvent<HTMLDivElement>, newStage: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverStage(null)
    dragCounterRef.current = {}

    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    if (!dealId) return

    const deal = deals.find(d => d.id === dealId)
    if (deal && deal.stage !== newStage) {
      await updateDealStage(dealId, newStage)
      router.refresh()
    }

    setDraggedDealId(null)
  }

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
      {/* Kanban Board */}
      <div className="kanban-board">
        {STAGES.map((stage) => {
          const stageDeals = dealsByStage[stage.id] || []
          const stageValue = stageValues[stage.id] || 0
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className="kanban-column"
              onDragOver={onDragOver}
              onDragEnter={(e) => onDragEnter(e, stage.id)}
              onDragLeave={(e) => onDragLeave(e, stage.id)}
              onDrop={(e) => onDrop(e, stage.id)}
              style={{
                background: isDragOver ? 'rgba(0, 122, 255, 0.08)' : undefined,
                borderColor: isDragOver ? '#007AFF' : undefined,
                transition: 'all 0.2s ease'
              }}
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

              <div
                className="kanban-cards"
                style={{
                  background: isDragOver ? 'rgba(0, 122, 255, 0.05)' : undefined,
                  minHeight: '100px'
                }}
              >
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => {
                    const lead = deal.lead_id ? leadMap.get(deal.lead_id) : null
                    const isDragging = draggedDealId === deal.id

                    return (
                      <div
                        key={deal.id}
                        className={`kanban-card group ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, deal.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        style={{
                          opacity: isDragging ? 0.5 : 1,
                          transform: isDragging ? 'rotate(2deg) scale(1.02)' : undefined,
                          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
                          transition: 'transform 0.1s, box-shadow 0.1s'
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GripVertical
                              size={14}
                              className="text-muted flex-shrink-0 cursor-grab"
                              style={{ opacity: 0.4 }}
                            />
                            <Link
                              href={`/deals/${deal.id}`}
                              className="kanban-card-title truncate hover:text-[var(--brand-primary)] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              {deal.name}
                            </Link>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEditModal(deal); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[var(--color-text)] transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                        <Link
                          href={`/deals/${deal.id}`}
                          className="kanban-card-company hover:text-[var(--brand-primary)] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                        >
                          {lead?.company || lead?.name || 'Kein Lead'}
                        </Link>
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
                  <div
                    className="text-center py-8 text-muted text-sm border-2 border-dashed rounded-lg"
                    style={{
                      borderColor: isDragOver ? '#007AFF' : 'var(--color-border)',
                      background: isDragOver ? 'rgba(0, 122, 255, 0.08)' : undefined,
                      minHeight: '100px'
                    }}
                  >
                    {isDragOver ? '✓ Hier ablegen' : 'Keine Deals'}
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
