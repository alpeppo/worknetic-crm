'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { updateDeal } from '@/lib/actions'
import { Edit2, Loader2, Save } from 'lucide-react'

interface Deal {
  id: string
  name: string
  lead_id: string
  stage: string
  value: number
  probability?: number
  expected_close_date?: string
  notes?: string
  created_at: string
  updated_at: string
  closed_at?: string
}

interface DealDetailClientProps {
  deal: Deal
}

const STAGES = [
  { id: 'discovery', name: 'Discovery', color: '#3b82f6' },
  { id: 'qualification', name: 'Qualification', color: '#8b5cf6' },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', color: '#ef4444' },
  { id: 'won', name: 'Won', color: '#10b981' },
]

export function DealDetailClient({ deal }: DealDetailClientProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    stage: deal.stage,
    value: deal.value.toString(),
    probability: (deal.probability || 50).toString(),
    expected_close_date: deal.expected_close_date || '',
    notes: deal.notes || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.value) {
      setError('Bitte gib einen Wert ein')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateDeal(deal.id, {
        stage: formData.stage,
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability),
        expected_close_date: formData.expected_close_date || undefined,
        notes: formData.notes || undefined
      })

      if (result.success) {
        setIsEditModalOpen(false)
        router.refresh()
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Header Edit Button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setFormData({
            stage: deal.stage,
            value: deal.value.toString(),
            probability: (deal.probability || 50).toString(),
            expected_close_date: deal.expected_close_date || '',
            notes: deal.notes || ''
          })
          setError(null)
          setIsEditModalOpen(true)
        }}
      >
        <Edit2 size={16} />
        Bearbeiten
      </button>

      {/* Edit Deal Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setError(null) }}
        title="Deal bearbeiten"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="form-input"
            >
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
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
              rows={4}
              placeholder="Zusatzliche Informationen zum Deal..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setIsEditModalOpen(false); setError(null) }}
            >
              Abbrechen
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Speichern
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

/**
 * Interactive stage pipeline for use in the page body.
 * Allows clicking on stages to change them.
 */
export function DealStagePipeline({ deal }: DealDetailClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStageChange = async (newStage: string) => {
    if (newStage === deal.stage) return
    setIsLoading(true)
    try {
      const result = await updateDeal(deal.id, { stage: newStage })
      if (result.success) {
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px'
      }}
    >
      {STAGES.map((stage) => {
        const isActive = stage.id === deal.stage
        const currentIndex = STAGES.findIndex(s => s.id === deal.stage)
        const stageIndex = STAGES.findIndex(s => s.id === stage.id)
        const isPast = stageIndex < currentIndex

        return (
          <button
            key={stage.id}
            onClick={() => handleStageChange(stage.id)}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: isActive
                ? `2px solid ${stage.color}`
                : '1px solid var(--color-border)',
              background: isActive
                ? `${stage.color}15`
                : isPast
                  ? 'var(--color-bg-secondary)'
                  : 'var(--color-bg)',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center' as const,
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                color: isActive ? stage.color : isPast ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)'
              }}
            >
              {stage.name}
            </div>
            {isActive && (
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: stage.color,
                  margin: '6px auto 0'
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
