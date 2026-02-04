'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { createDeal, updateDealStage } from '@/lib/actions'
import { Plus, Loader2 } from 'lucide-react'

interface Deal {
  id: string
  name: string
  lead_id: string
  stage: string
  value: number
  probability?: number
  expected_close_date?: string
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lead_id: '',
    name: '',
    value: '',
    probability: '50',
    expected_close_date: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.lead_id || !formData.name || !formData.value) {
      setError('Bitte fülle alle Pflichtfelder aus')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createDeal({
        lead_id: formData.lead_id,
        name: formData.name,
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability),
        expected_close_date: formData.expected_close_date || undefined
      })

      if (result.success) {
        setIsModalOpen(false)
        setFormData({ lead_id: '', name: '', value: '', probability: '50', expected_close_date: '' })
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStageChange = async (dealId: string, newStage: string) => {
    await updateDealStage(dealId, newStage)
  }

  // Modal form content - reusable
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
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsModalOpen(false)}
        >
          Abbrechen
        </button>
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Erstellen...
            </>
          ) : (
            'Deal erstellen'
          )}
        </button>
      </div>
    </form>
  )

  // If headerOnly, only render the button and modal
  if (headerOnly) {
    return (
      <>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Deal erstellen
        </button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Neuen Deal erstellen"
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

          return (
            <div key={stage.id} className="kanban-column">
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

              <div className="kanban-cards">
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => {
                    const lead = deal.lead_id ? leadMap.get(deal.lead_id) : null
                    return (
                      <div key={deal.id} className="kanban-card">
                        <div className="kanban-card-title">{deal.name}</div>
                        <div className="kanban-card-company">
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
                  <div className="text-center py-8 text-muted text-sm">
                    Keine Deals
                  </div>
                )}

                {/* Add Deal Button */}
                <button
                  className="w-full py-3 border-2 border-dashed border-[var(--border-light)] rounded-lg text-muted text-sm hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                  onClick={() => setIsModalOpen(true)}
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

      {/* Create Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Neuen Deal erstellen"
        size="md"
      >
        {modalContent}
      </Modal>
    </>
  )
}
