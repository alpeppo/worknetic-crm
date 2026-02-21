'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal } from './Modal'
import { createActivity, type ActivityFormData } from '@/lib/actions'
import {
  Plus,
  Phone,
  Mail,
  Send,
  CalendarCheck,
  MessageSquare,
  Linkedin,
  RefreshCw,
  TrendingUp,
  Clock,
  Loader2,
  Video,
  Smartphone,
  MessageCircle
} from 'lucide-react'

interface Activity {
  id: string
  lead_id: string
  type: string
  subject: string
  body?: string
  created_at: string
  created_by?: string
}

interface Lead {
  id: string
  name: string
  company?: string
}

interface ActivitiesClientProps {
  activities: Activity[]
  leads: Lead[]
  groupedActivities: Record<string, Activity[]>
  typeCount: Record<string, number>
}

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Notiz', icon: MessageSquare },
  { value: 'call', label: 'Anruf', icon: Phone },
  { value: 'email_sent', label: 'E-Mail gesendet', icon: Send },
  { value: 'email_received', label: 'E-Mail erhalten', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: CalendarCheck },
  { value: 'linkedin_message', label: 'LinkedIn Nachricht', icon: Linkedin },
  { value: 'video_call', label: 'Video Call', icon: Video },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'sms', label: 'SMS', icon: Smartphone },
]

export function ActivitiesClient({
  activities,
  leads,
  groupedActivities,
  typeCount
}: ActivitiesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('note')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leadMap = new Map(leads.map(l => [l.id, l]))

  const filteredActivities = filter
    ? activities.filter(a => a.type === filter)
    : activities

  // Re-group filtered activities by date
  const filteredGrouped: Record<string, Activity[]> = {}
  filteredActivities.forEach((activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    if (!filteredGrouped[date]) filteredGrouped[date] = []
    filteredGrouped[date].push(activity)
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={18} />
      case 'email_sent': return <Send size={18} />
      case 'email_received': return <Mail size={18} />
      case 'meeting': return <CalendarCheck size={18} />
      case 'note': return <MessageSquare size={18} />
      case 'linkedin_message': return <Linkedin size={18} />
      case 'video_call': return <Video size={18} />
      case 'whatsapp': return <MessageCircle size={18} />
      case 'sms': return <Smartphone size={18} />
      case 'stage_change': return <RefreshCw size={18} />
      case 'score_update': return <TrendingUp size={18} />
      default: return <Clock size={18} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return '#10B981'
      case 'email_sent': return '#4F46E5'
      case 'email_received': return '#4F46E5'
      case 'meeting': return '#818CF8'
      case 'note': return '#64748B'
      case 'linkedin_message': return '#0077b5'
      case 'video_call': return '#F59E0B'
      case 'whatsapp': return '#25D366'
      case 'sms': return '#60A5FA'
      case 'stage_change': return '#F59E0B'
      case 'score_update': return '#EF4444'
      default: return '#64748B'
    }
  }

  const getTypeLabel = (type: string) => {
    const found = ACTIVITY_TYPES.find(t => t.value === type)
    if (found) return found.label
    if (type === 'stage_change') return 'Stage'
    if (type === 'score_update') return 'Score'
    return type
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId || !subject) {
      setError('Bitte wähle einen Lead und gib einen Betreff ein')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createActivity({
        lead_id: selectedLeadId,
        type: selectedType as ActivityFormData['type'],
        subject,
        body: body || undefined
      })

      if (result.success) {
        setIsModalOpen(false)
        setSelectedLeadId('')
        setSubject('')
        setBody('')
        setSelectedType('note')
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
    <>
      {/* Header Actions */}
      <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
        <Plus size={18} />
        Aktivität hinzufügen
      </button>

      {/* Übersicht */}
      <div className="section-card" style={{ marginBottom: '32px', marginTop: '28px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon stat-icon-blue" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
              <Clock size={18} />
            </div>
            <div>
              <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>{activities.length}</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginLeft: '6px' }}>Aktivitäten gesamt</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Nach Typ filtern</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setFilter(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '100px',
                border: filter === null ? '1px solid var(--color-interactive)' : '1px solid var(--color-border)',
                background: filter === null ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontSize: '13px',
                fontWeight: 500,
                color: filter === null ? 'var(--color-interactive)' : 'var(--color-text-secondary)',
              }}
            >
              Alle
            </button>
            {Object.entries(typeCount).map(([type, count]) => {
              const color = getActivityColor(type)
              const isActive = filter === type
              return (
                <button
                  key={type}
                  onClick={() => setFilter(filter === type ? null : type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '100px',
                    border: isActive ? `1px solid ${color}` : '1px solid var(--color-border)',
                    background: isActive ? `${color}12` : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isActive ? color : 'var(--color-text-secondary)',
                  }}
                >
                  <span style={{ color, display: 'flex', alignItems: 'center' }}>{getActivityIcon(type)}</span>
                  <span>{getTypeLabel(type)}</span>
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>{String(count)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filteredActivities.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '44px' }}>
          {Object.entries(filteredGrouped).map(([date, dayActivities]) => (
            <div key={date}>
              {/* Date Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{date}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>

              {/* Day Activities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayActivities.map((activity) => {
                  const lead = activity.lead_id ? leadMap.get(activity.lead_id) : null
                  const color = getActivityColor(activity.type)

                  return (
                    <div
                      key={activity.id}
                      className="section-card"
                      style={{ transition: 'all 0.2s' }}
                    >
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                          {/* Icon */}
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '14px',
                              background: `${color}12`,
                              color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getActivityIcon(activity.type)}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Type badge + Lead */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <span
                                    className="badge"
                                    style={{
                                      background: `${color}12`,
                                      color,
                                      fontSize: '12px',
                                    }}
                                  >
                                    {getTypeLabel(activity.type)}
                                  </span>
                                  {lead && (
                                    <Link
                                      href={`/leads/${activity.lead_id}`}
                                      style={{
                                        fontSize: '13px',
                                        color: 'var(--color-text-tertiary)',
                                        textDecoration: 'none',
                                        transition: 'color 0.15s',
                                      }}
                                      className="hover:text-[var(--color-blue)]"
                                    >
                                      {lead.name}
                                      {lead.company && ` · ${lead.company}`}
                                    </Link>
                                  )}
                                </div>

                                {/* Subject */}
                                {activity.subject && (
                                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: activity.body ? '6px' : 0 }}>
                                    {activity.subject}
                                  </h4>
                                )}

                                {/* Body */}
                                {activity.body && (
                                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                    {activity.body}
                                  </p>
                                )}
                              </div>

                              {/* Time */}
                              <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '2px' }}>
                                {new Date(activity.created_at).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {activity.created_by && (
                              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                                von {activity.created_by}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Clock size={24} />
            </div>
            <div className="empty-state-title">
              {filter ? 'Keine Aktivitäten mit diesem Filter' : 'Keine Aktivitäten'}
            </div>
            <div className="empty-state-description">
              {filter ? 'Versuche einen anderen Filter.' : 'Erstelle deine erste Activity.'}
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Aktivität erstellen
            </button>
          </div>
        </div>
      )}

      {/* Create Activity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Aktivität hinzufügen"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#EF4444',
              fontSize: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              {error}
            </div>
          )}

          {/* Lead Selection */}
          <div>
            <label className="form-label">Lead *</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
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

          {/* Activity Type */}
          <div>
            <label className="form-label">Typ</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = selectedType === type.value
                const typeColor = getActivityColor(type.value)

                return (
                  <label
                    key={type.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: isSelected ? `1px solid ${typeColor}` : '1px solid var(--color-border)',
                      background: isSelected ? `${typeColor}08` : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={isSelected}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="sr-only"
                    />
                    <Icon size={16} style={{ color: isSelected ? typeColor : 'var(--color-text-tertiary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 500 : 400, color: isSelected ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{type.label}</span>
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input"
              placeholder="z.B. Discovery Call geführt"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="form-label">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="form-input"
              placeholder="Weitere Details zur Aktivität..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 mt-1">
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
                  Speichern...
                </>
              ) : (
                'Aktivität hinzufügen'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
