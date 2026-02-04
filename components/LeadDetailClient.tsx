'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { LeadForm } from './LeadForm'
import { ActivityForm } from './ActivityForm'
import { updateLeadStage, deleteLead, setFollowUp, createDeal } from '@/lib/actions'
import {
  Edit2,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  PhoneCall,
  Send,
  CalendarCheck,
  Briefcase,
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  headline?: string
  linkedin_url?: string
  website?: string
  location?: string
  vertical?: string
  source?: string
  stage?: string
  lead_score?: number
  pain_score?: number
  fit_score?: number
  buying_score?: number
  qualified?: boolean
  deal_value?: number
  connections?: number
  score_notes?: Record<string, unknown>
  created_at: string
}

interface LeadDetailClientProps {
  lead: Lead
}

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

export function LeadDetailClient({ lead }: LeadDetailClientProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [dealData, setDealData] = useState({ name: '', value: '' })

  const handleStageChange = async (newStage: string) => {
    setIsLoading(true)
    await updateLeadStage(lead.id, newStage)
    setIsStageDropdownOpen(false)
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Lead wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    setIsLoading(true)
    await deleteLead(lead.id)
    router.push('/leads')
  }

  const handleSetFollowUp = async () => {
    if (!followUpDate) return
    setIsLoading(true)
    await setFollowUp(lead.id, followUpDate)
    setIsFollowUpOpen(false)
    setFollowUpDate('')
    setIsLoading(false)
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dealData.name || !dealData.value) return
    setIsLoading(true)
    await createDeal({
      lead_id: lead.id,
      name: dealData.name,
      value: parseFloat(dealData.value),
      stage: 'discovery'
    })
    setIsDealModalOpen(false)
    setDealData({ name: '', value: '' })
    setIsLoading(false)
  }

  return (
    <>
      {/* Action Buttons in Header */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsEditModalOpen(true)}
        >
          <Edit2 size={16} />
          Bearbeiten
        </button>
        <div className="dropdown">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
          >
            <MoreHorizontal size={20} />
          </button>
          {isStageDropdownOpen && (
            <>
              <div className="dropdown-menu" style={{ minWidth: '200px' }}>
                <div className="px-3 py-2 text-xs font-semibold text-muted uppercase">Stage ändern</div>
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    className={`dropdown-item ${lead.stage === stage.value ? 'bg-[var(--bg-tertiary)]' : ''}`}
                    onClick={() => handleStageChange(stage.value)}
                    disabled={isLoading}
                  >
                    {stage.label}
                  </button>
                ))}
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item danger"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 size={16} />
                  Lead löschen
                </button>
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setIsStageDropdownOpen(false)} />
            </>
          )}
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Aktionen</h3>
        </div>
        <div className="card-body space-y-3">
          <button
            className="btn btn-primary w-full"
            onClick={() => setIsActivityModalOpen(true)}
          >
            <MessageSquare size={18} />
            Notiz hinzufügen
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={() => setIsFollowUpOpen(true)}
          >
            <Calendar size={18} />
            Follow-up setzen
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={() => setIsDealModalOpen(true)}
          >
            <Briefcase size={18} />
            Deal erstellen
          </button>
        </div>
      </div>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Lead bearbeiten"
        size="lg"
      >
        <LeadForm
          lead={lead}
          onSuccess={() => setIsEditModalOpen(false)}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Activity hinzufügen"
        size="md"
      >
        <ActivityForm
          leadId={lead.id}
          onSuccess={() => setIsActivityModalOpen(false)}
          onCancel={() => setIsActivityModalOpen(false)}
        />
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Follow-up setzen"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Datum</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="form-input"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => setIsFollowUpOpen(false)}
            >
              Abbrechen
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSetFollowUp}
              disabled={!followUpDate || isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Deal Modal */}
      <Modal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        title="Deal erstellen"
        size="md"
      >
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div>
            <label className="form-label">Deal Name *</label>
            <input
              type="text"
              value={dealData.name}
              onChange={(e) => setDealData({ ...dealData, name: e.target.value })}
              className="form-input"
              placeholder={`Deal mit ${lead.name}`}
              required
            />
          </div>
          <div>
            <label className="form-label">Wert (EUR) *</label>
            <input
              type="number"
              value={dealData.value}
              onChange={(e) => setDealData({ ...dealData, value: e.target.value })}
              className="form-input"
              placeholder="5000"
              min="0"
              step="100"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDealModalOpen(false)}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Deal erstellen'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
