'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  Phone,
  MessageSquare,
  Video,
  Smartphone,
  CalendarCheck,
  FileText,
  ArrowUpDown,
  Filter,
  Search,
  ChevronRight,
} from 'lucide-react'

interface Activity {
  id: string
  lead_id: string
  type: string
  subject: string | null
  body: string | null
  created_at: string
  scheduled_for: string | null
  leads: { id: string; name: string; company: string | null; stage: string } | null
}

interface InboxClientProps {
  activities: Activity[]
}

const CHANNEL_FILTERS = [
  { value: 'all', label: 'Alle', icon: Filter },
  { value: 'email', label: 'E-Mail', icon: Mail },
  { value: 'call', label: 'Anrufe', icon: Phone },
  { value: 'meeting', label: 'Meetings', icon: CalendarCheck },
  { value: 'linkedin', label: 'LinkedIn', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
  { value: 'note', label: 'Notizen', icon: FileText },
]

const TYPE_CONFIG: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  email_sent: { icon: Send, color: '#4F46E5', label: 'E-Mail gesendet' },
  email_received: { icon: Mail, color: '#818CF8', label: 'E-Mail empfangen' },
  call: { icon: Phone, color: '#10B981', label: 'Anruf' },
  meeting: { icon: CalendarCheck, color: '#818CF8', label: 'Meeting' },
  linkedin_message: { icon: Send, color: '#0A66C2', label: 'LinkedIn' },
  whatsapp: { icon: Smartphone, color: '#25D366', label: 'WhatsApp' },
  sms: { icon: MessageSquare, color: '#60A5FA', label: 'SMS' },
  video_call: { icon: Video, color: '#F59E0B', label: 'Video Call' },
  note: { icon: FileText, color: '#8E8E93', label: 'Notiz' },
  stage_change: { icon: ArrowUpDown, color: '#EF4444', label: 'Stage geändert' },
}

function getChannelGroup(type: string): string {
  if (type.includes('email')) return 'email'
  if (type === 'call' || type === 'video_call') return 'call'
  if (type === 'meeting') return 'meeting'
  if (type === 'linkedin_message') return 'linkedin'
  if (type === 'whatsapp' || type === 'sms') return 'whatsapp'
  return 'note'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Gerade eben'
  if (diffMins < 60) return `vor ${diffMins}m`
  if (diffHours < 24) return `vor ${diffHours}h`
  if (diffDays < 7) return `vor ${diffDays}d`
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export function InboxClient({ activities }: InboxClientProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let result = activities

    if (activeFilter !== 'all') {
      result = result.filter(a => getChannelGroup(a.type) === activeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        (a.subject?.toLowerCase().includes(q)) ||
        (a.body?.toLowerCase().includes(q)) ||
        (a.leads?.name?.toLowerCase().includes(q)) ||
        (a.leads?.company?.toLowerCase().includes(q))
      )
    }

    return result
  }, [activities, activeFilter, searchQuery])

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {}
    filtered.forEach(a => {
      const date = new Date(a.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key: string
      if (date.toDateString() === today.toDateString()) {
        key = 'Heute'
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Gestern'
      } else {
        key = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(a)
    })
    return groups
  }, [filtered])

  return (
    <div>
      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          flex: '1',
          minWidth: '200px',
          maxWidth: '400px',
        }}>
          <Search size={18} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suchen..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: '14px',
              width: '100%',
            }}
          />
        </div>

        {/* Channel Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CHANNEL_FILTERS.map(f => {
            const isActive = activeFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '100px',
                  border: isActive ? '1px solid rgba(79,70,229,0.3)' : '1px solid transparent',
                  background: isActive ? 'rgba(79,70,229,0.1)' : 'var(--color-bg-secondary)',
                  color: isActive ? '#4F46E5' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <f.icon size={14} />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Activity Feed */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--color-bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Mail size={24} style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
            Keine Aktivitäten
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
            {activeFilter !== 'all' ? 'Keine Ergebnisse für diesen Filter.' : 'Noch keine Kommunikation erfasst.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel} style={{ marginBottom: '32px' }}>
            {/* Date Header */}
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              paddingLeft: '4px',
            }}>
              {dateLabel}
            </div>

            {/* Items */}
            <div style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {items.map((activity, idx) => {
                const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.note
                const Icon = config.icon
                return (
                  <Link
                    key={activity.id}
                    href={activity.leads ? `/leads/${activity.leads.id}` : '#'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px 20px',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    className="hover:bg-[var(--color-bg-secondary)]"
                  >
                    {/* Type Icon */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: `${config.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} style={{ color: config.color }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {activity.leads?.name || 'Unbekannt'}
                        </span>
                        {activity.leads?.company && (
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--color-text-tertiary)',
                            whiteSpace: 'nowrap',
                          }}>
                            {activity.leads.company}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {activity.subject || config.label}
                        {activity.body && (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>
                            {' — '}{activity.body.substring(0, 80)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: config.color,
                        background: `${config.color}15`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}>
                        {config.label}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--color-text-tertiary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatDate(activity.created_at)}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
