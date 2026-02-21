'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  Video,
  MessageCircle,
  Smartphone,
  CalendarCheck,
  Linkedin,
  MessageSquare,
  Send
} from 'lucide-react'

interface CalendarViewProps {
  activities: Array<{
    id: string
    lead_id: string
    type: string
    subject: string | null
    body: string | null
    created_at: string
    scheduled_for: string | null
  }>
  leads: Array<{
    id: string
    name: string
    company: string | null
    next_follow_up_at: string | null
  }>
}

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const GERMAN_WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const TYPE_COLORS: Record<string, string> = {
  call: '#10b981',
  email_sent: '#3b82f6',
  email_received: '#3b82f6',
  meeting: '#8b5cf6',
  note: '#6b7280',
  linkedin_message: '#0077b5',
  video_call: '#F59E0B',
  whatsapp: '#25D366',
  sms: '#60A5FA',
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Anruf',
  email_sent: 'E-Mail gesendet',
  email_received: 'E-Mail erhalten',
  meeting: 'Meeting',
  note: 'Notiz',
  linkedin_message: 'LinkedIn',
  video_call: 'Video Call',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

function getActivityIcon(type: string, size: number = 14) {
  switch (type) {
    case 'call': return <Phone size={size} />
    case 'email_sent': return <Send size={size} />
    case 'email_received': return <Mail size={size} />
    case 'meeting': return <CalendarCheck size={size} />
    case 'note': return <MessageSquare size={size} />
    case 'linkedin_message': return <Linkedin size={size} />
    case 'video_call': return <Video size={size} />
    case 'whatsapp': return <MessageCircle size={size} />
    case 'sms': return <Smartphone size={size} />
    default: return <Clock size={size} />
  }
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function CalendarView({ activities, leads }: CalendarViewProps) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const leadMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; company: string | null; next_follow_up_at: string | null }>()
    leads.forEach(l => map.set(l.id, l))
    return map
  }, [leads])

  // Group activities by date key (YYYY-MM-DD)
  const activitiesByDate = useMemo(() => {
    const map: Record<string, typeof activities> = {}
    activities.forEach(activity => {
      const dateStr = activity.scheduled_for || activity.created_at
      const dateKey = formatDateKey(new Date(dateStr))
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(activity)
    })
    return map
  }, [activities])

  // Group follow-ups by date key
  const followUpsByDate = useMemo(() => {
    const map: Record<string, typeof leads> = {}
    leads.forEach(lead => {
      if (lead.next_follow_up_at) {
        const dateKey = formatDateKey(new Date(lead.next_follow_up_at))
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(lead)
      }
    })
    return map
  }, [leads])

  // Compute calendar grid days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = lastDay.getDate()

    // getDay() returns 0=Sunday. Convert to Monday-based: 0=Monday ... 6=Sunday
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6

    const days: Array<{ date: Date; dateKey: string; isCurrentMonth: boolean }> = []

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      days.push({ date, dateKey: formatDateKey(date), isCurrentMonth: false })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d)
      days.push({ date, dateKey: formatDateKey(date), isCurrentMonth: true })
    }

    // Next month days to fill remaining cells (complete the last week)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(currentYear, currentMonth + 1, d)
        days.push({ date, dateKey: formatDateKey(date), isCurrentMonth: false })
      }
    }

    return days
  }, [currentMonth, currentYear])

  const todayKey = formatDateKey(today)

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(todayKey)
  }

  const selectedActivities = selectedDate ? (activitiesByDate[selectedDate] || []) : []
  const selectedFollowUps = selectedDate ? (followUpsByDate[selectedDate] || []) : []

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Calendar Grid */}
      <div
        style={{
          flex: 1,
          background: 'var(--color-bg)',
          borderRadius: '20px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Calendar Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {GERMAN_MONTHS[currentMonth]} {currentYear}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={goToToday}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                color: 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Heute
            </button>
            <button
              onClick={goToPreviousMonth}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                color: 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextMonth}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                color: 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {GERMAN_WEEKDAYS.map(day => (
            <div
              key={day}
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
          }}
        >
          {calendarDays.map((day, index) => {
            const dayActivities = activitiesByDate[day.dateKey] || []
            const dayFollowUps = followUpsByDate[day.dateKey] || []
            const isToday = day.dateKey === todayKey
            const isSelected = day.dateKey === selectedDate
            const hasContent = dayActivities.length > 0 || dayFollowUps.length > 0

            // Get unique activity types for this day (up to 5 dots)
            const uniqueTypes = [...new Set(dayActivities.map(a => a.type))].slice(0, 5)

            return (
              <div
                key={`${day.dateKey}-${index}`}
                onClick={() => setSelectedDate(day.dateKey === selectedDate ? null : day.dateKey)}
                style={{
                  minHeight: '90px',
                  padding: '8px',
                  borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: index < calendarDays.length - 7 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'rgba(79, 70, 229, 0.04)'
                    : 'transparent',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Day Number */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: isToday ? 600 : day.isCurrentMonth ? 500 : 400,
                    color: isToday
                      ? '#4F46E5'
                      : day.isCurrentMonth
                        ? 'var(--color-text)'
                        : 'var(--color-text-tertiary)',
                    border: isToday ? '2px solid #4F46E5' : '2px solid transparent',
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    marginBottom: '4px',
                  }}
                >
                  {day.date.getDate()}
                </div>

                {/* Activity Dots */}
                {uniqueTypes.length > 0 && (
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    {uniqueTypes.map(type => (
                      <div
                        key={type}
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: TYPE_COLORS[type] || '#6b7280',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Follow-up Indicators */}
                {dayFollowUps.length > 0 && (
                  <div style={{ marginTop: '2px' }}>
                    {dayFollowUps.slice(0, 2).map(lead => (
                      <div
                        key={lead.id}
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: '#F59E0B',
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {lead.name}
                      </div>
                    ))}
                    {dayFollowUps.length > 2 && (
                      <div style={{ fontSize: '9px', color: '#F59E0B', fontWeight: 500 }}>
                        +{dayFollowUps.length - 2} weitere
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Side Panel */}
      {selectedDate && (
        <div
          style={{
            width: '380px',
            flexShrink: 0,
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>
              {selectedActivities.length} {selectedActivities.length === 1 ? 'Aktivität' : 'Aktivitäten'}
              {selectedFollowUps.length > 0 && ` · ${selectedFollowUps.length} Follow-up${selectedFollowUps.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Panel Content */}
          <div style={{ padding: '16px 24px', maxHeight: '600px', overflowY: 'auto' }}>
            {/* Follow-ups Section */}
            {selectedFollowUps.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#F59E0B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CalendarCheck size={13} />
                  Follow-ups
                </div>
                {selectedFollowUps.map(lead => (
                  <div
                    key={lead.id}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(245, 158, 11, 0.06)',
                      borderRadius: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.15)',
                      marginBottom: '8px',
                    }}
                  >
                    <Link
                      href={`/leads/${lead.id}`}
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#F59E0B',
                        textDecoration: 'none',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {lead.name}
                    </Link>
                    {lead.company && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                        {lead.company}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Activities Section */}
            {selectedActivities.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={13} />
                  Aktivitäten
                </div>
                {selectedActivities.map(activity => {
                  const color = TYPE_COLORS[activity.type] || '#6b7280'
                  const lead = leadMap.get(activity.lead_id)
                  const time = new Date(activity.scheduled_for || activity.created_at).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={activity.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: '14px',
                        border: '1px solid var(--color-border)',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '10px',
                              background: `${color}15`,
                              color: color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getActivityIcon(activity.type, 16)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {lead && (
                              <Link
                                href={`/leads/${activity.lead_id}`}
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'var(--color-text)',
                                  textDecoration: 'none',
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {lead.name}
                                {lead.company && (
                                  <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                                    {' '}· {lead.company}
                                  </span>
                                )}
                              </Link>
                            )}
                            {activity.subject && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--color-text-tertiary)',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {activity.subject}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                            {time}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: color,
                              background: `${color}15`,
                              border: `1px solid ${color}30`,
                              borderRadius: '6px',
                              padding: '2px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {TYPE_LABELS[activity.type] || activity.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {selectedActivities.length === 0 && selectedFollowUps.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'var(--color-bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <Calendar size={22} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>
                  Keine Einträge
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                  An diesem Tag gibt es keine Aktivitäten oder Follow-ups.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
