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
      case 'call': return '#10b981'
      case 'email_sent': return '#3b82f6'
      case 'email_received': return '#3b82f6'
      case 'meeting': return '#8b5cf6'
      case 'note': return '#6b7280'
      case 'linkedin_message': return '#0077b5'
      case 'video_call': return '#FF9500'
      case 'whatsapp': return '#25D366'
      case 'sms': return '#5AC8FA'
      case 'stage_change': return '#f59e0b'
      case 'score_update': return '#ef4444'
      default: return '#6b7280'
    }
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

      {/* Type Stats */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-muted" />
              <span className="font-semibold">{activities.length} Aktivitäten</span>
              <span className="text-muted text-sm">(letzte 50)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCount).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80"
                  style={{ background: `${getActivityColor(type)}15` }}
                  onClick={() => setFilter(filter === type ? null : type)}
                >
                  <span style={{ color: getActivityColor(type) }}>
                    {getActivityIcon(type)}
                  </span>
                  <span className="text-sm font-medium">{String(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <button
          className={`filter-btn ${filter === null ? 'active' : ''}`}
          onClick={() => setFilter(null)}
        >
          Alle
        </button>
        <button
          className={`filter-btn ${filter === 'call' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'call' ? null : 'call')}
        >
          <Phone size={14} />
          Calls
        </button>
        <button
          className={`filter-btn ${filter === 'email_sent' || filter === 'email_received' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'email_sent' ? null : 'email_sent')}
        >
          <Mail size={14} />
          E-Mails
        </button>
        <button
          className={`filter-btn ${filter === 'meeting' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'meeting' ? null : 'meeting')}
        >
          <CalendarCheck size={14} />
          Meetings
        </button>
        <button
          className={`filter-btn ${filter === 'note' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'note' ? null : 'note')}
        >
          <MessageSquare size={14} />
          Notizen
        </button>
        <button
          className={`filter-btn ${filter === 'video_call' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'video_call' ? null : 'video_call')}
        >
          <Video size={14} />
          Video
        </button>
        <button
          className={`filter-btn ${filter === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'whatsapp' ? null : 'whatsapp')}
        >
          <MessageCircle size={14} />
          WhatsApp
        </button>
        <button
          className={`filter-btn ${filter === 'sms' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'sms' ? null : 'sms')}
        >
          <Smartphone size={14} />
          SMS
        </button>
      </div>

      {/* Timeline */}
      {filteredActivities.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(filteredGrouped).map(([date, dayActivities]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm font-semibold text-muted">{date}</div>
                <div className="flex-1 h-px bg-[var(--border-light)]" />
              </div>

              <div className="space-y-3">
                {dayActivities.map((activity) => {
                  const lead = activity.lead_id ? leadMap.get(activity.lead_id) : null
                  const color = getActivityColor(activity.type)

                  return (
                    <div key={activity.id} className="card">
                      <div className="card-body py-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}15`, color }}
                          >
                            {getActivityIcon(activity.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="badge text-xs"
                                    style={{
                                      background: `${color}15`,
                                      color,
                                      border: `1px solid ${color}30`
                                    }}
                                  >
                                    {activity.type}
                                  </span>
                                  {lead && (
                                    <Link
                                      href={`/leads/${activity.lead_id}`}
                                      className="text-sm text-muted hover:text-[var(--brand-primary)] transition-colors"
                                    >
                                      {lead.name}
                                      {lead.company && ` · ${lead.company}`}
                                    </Link>
                                  )}
                                </div>

                                {activity.subject && (
                                  <h4 className="font-semibold mb-1">{activity.subject}</h4>
                                )}

                                {activity.body && (
                                  <p className="text-sm text-secondary">{activity.body}</p>
                                )}
                              </div>

                              <div className="text-xs text-muted whitespace-nowrap">
                                {new Date(activity.created_at).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>

                            {activity.created_by && (
                              <div className="mt-2 text-xs text-muted">
                                von {activity.created_by}
                              </div>
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
        <div className="card">
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
            <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm rounded-lg">
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
