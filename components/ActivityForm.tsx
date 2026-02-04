'use client'

import { useState } from 'react'
import { createActivity, type ActivityFormData } from '@/lib/actions'
import { Loader2, Phone, Mail, MessageSquare, Calendar, Linkedin, Send } from 'lucide-react'

interface ActivityFormProps {
  leadId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Notiz', icon: MessageSquare },
  { value: 'call', label: 'Anruf', icon: Phone },
  { value: 'email_sent', label: 'E-Mail gesendet', icon: Send },
  { value: 'email_received', label: 'E-Mail erhalten', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'linkedin_message', label: 'LinkedIn Nachricht', icon: Linkedin },
]

export function ActivityForm({ leadId, onSuccess, onCancel }: ActivityFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('note')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data: ActivityFormData = {
      lead_id: leadId,
      type: formData.get('type') as ActivityFormData['type'],
      subject: formData.get('subject') as string,
      body: formData.get('body') as string || undefined,
    }

    try {
      const result = await createActivity(data)

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

      {/* Activity Type */}
      <div>
        <label className="form-label">Typ</label>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.value

            return (
              <label
                key={type.value}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected
                    ? 'border-[var(--brand-primary)] bg-[rgba(33,153,213,0.05)]'
                    : 'border-[var(--border-light)] hover:border-[var(--border-medium)]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={isSelected}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="sr-only"
                />
                <Icon size={16} className={isSelected ? 'text-[var(--brand-primary)]' : 'text-muted'} />
                <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>{type.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="form-label">Betreff *</label>
        <input
          type="text"
          name="subject"
          required
          className="form-input"
          placeholder={
            selectedType === 'call' ? 'z.B. Discovery Call geführt' :
            selectedType === 'email_sent' ? 'z.B. Angebot versendet' :
            selectedType === 'meeting' ? 'z.B. Erstgespräch vereinbart' :
            'z.B. Wichtige Info zum Lead'
          }
        />
      </div>

      {/* Body */}
      <div>
        <label className="form-label">Details</label>
        <textarea
          name="body"
          rows={4}
          className="form-input"
          placeholder="Weitere Details zur Aktivität..."
        />
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
            'Activity hinzufügen'
          )}
        </button>
      </div>
    </form>
  )
}
