'use client'

import { useState } from 'react'
import { createLead, updateLead, type LeadFormData } from '@/lib/actions'
import { Loader2 } from 'lucide-react'

interface LeadFormProps {
  lead?: {
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
  }
  onSuccess?: () => void
  onCancel?: () => void
}

const STAGES = [
  { value: 'new', label: 'Neu' },
  { value: 'contacted', label: 'Kontaktiert' },
  { value: 'qualified', label: 'Qualifiziert' },
  { value: 'discovery_call', label: 'Discovery Call' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
  { value: 'nurture', label: 'Nurture' },
]

const VERTICALS = [
  { value: 'coaches_berater', label: 'Coaches & Berater' },
  { value: 'immobilienmakler', label: 'Immobilienmakler' },
  { value: 'steuerberater', label: 'Steuerberater' },
  { value: 'handwerker', label: 'Handwerker' },
]

const SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Empfehlung' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Sonstiges' },
]

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!lead

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data: LeadFormData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      company: formData.get('company') as string || undefined,
      headline: formData.get('headline') as string || undefined,
      linkedin_url: formData.get('linkedin_url') as string || undefined,
      website: formData.get('website') as string || undefined,
      location: formData.get('location') as string || undefined,
      vertical: formData.get('vertical') as string || undefined,
      source: formData.get('source') as string || undefined,
      stage: formData.get('stage') as string || 'new',
    }

    try {
      const result = isEditing
        ? await updateLead(lead.id, data)
        : await createLead(data)

      if (result.success) {
        onSuccess?.()
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Name - Required */}
      <div>
        <label className="form-label">Name *</label>
        <input
          type="text"
          name="name"
          defaultValue={lead?.name}
          required
          className="form-input"
          placeholder="Max Mustermann"
        />
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">E-Mail</label>
          <input
            type="email"
            name="email"
            defaultValue={lead?.email}
            className="form-input"
            placeholder="max@beispiel.de"
          />
        </div>
        <div>
          <label className="form-label">Telefon</label>
          <input
            type="tel"
            name="phone"
            defaultValue={lead?.phone}
            className="form-input"
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      {/* Company & Headline */}
      <div>
        <label className="form-label">Unternehmen</label>
        <input
          type="text"
          name="company"
          defaultValue={lead?.company}
          className="form-input"
          placeholder="Firma GmbH"
        />
      </div>

      <div>
        <label className="form-label">Headline / Position</label>
        <input
          type="text"
          name="headline"
          defaultValue={lead?.headline}
          className="form-input"
          placeholder="Business Coach | Experte für..."
        />
      </div>

      {/* LinkedIn URL */}
      <div>
        <label className="form-label">LinkedIn URL</label>
        <input
          type="url"
          name="linkedin_url"
          defaultValue={lead?.linkedin_url}
          className="form-input"
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      {/* Website & Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Website</label>
          <input
            type="url"
            name="website"
            defaultValue={lead?.website}
            className="form-input"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="form-label">Standort</label>
          <input
            type="text"
            name="location"
            defaultValue={lead?.location}
            className="form-input"
            placeholder="Berlin, Deutschland"
          />
        </div>
      </div>

      {/* Vertical & Source */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Vertical</label>
          <select name="vertical" defaultValue={lead?.vertical || ''} className="form-input">
            <option value="">Auswählen...</option>
            {VERTICALS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Quelle</label>
          <select name="source" defaultValue={lead?.source || 'linkedin'} className="form-input">
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage */}
      <div>
        <label className="form-label">Stage</label>
        <select name="stage" defaultValue={lead?.stage || 'new'} className="form-input">
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Abbrechen
          </button>
        )}
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Speichern...
            </>
          ) : (
            isEditing ? 'Speichern' : 'Lead erstellen'
          )}
        </button>
      </div>
    </form>
  )
}
