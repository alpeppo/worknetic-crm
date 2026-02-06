'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Clock, AlertCircle, CalendarCheck, ChevronRight, X } from 'lucide-react'
import { getOverdueFollowUps, getUpcomingFollowUps, getDueToday } from '@/lib/reminders'

type FollowUpItem = { id: string; name: string; company: string | null; next_follow_up_at: string }
type Tab = 'overdue' | 'today' | 'upcoming'

/**
 * Formats a date string into a German relative time string.
 * Examples: "vor 2 Tagen", "vor 3 Stunden", "in 3 Stunden", "morgen", "in 2 Tagen"
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const absDiffMs = Math.abs(diffMs)
  const isPast = diffMs < 0

  const minutes = Math.floor(absDiffMs / (1000 * 60))
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60))
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) {
    return 'gerade eben'
  }

  if (minutes < 60) {
    if (isPast) {
      return minutes === 1 ? 'vor 1 Minute' : `vor ${minutes} Minuten`
    }
    return minutes === 1 ? 'in 1 Minute' : `in ${minutes} Minuten`
  }

  if (hours < 24) {
    if (isPast) {
      return hours === 1 ? 'vor 1 Stunde' : `vor ${hours} Stunden`
    }
    return hours === 1 ? 'in 1 Stunde' : `in ${hours} Stunden`
  }

  if (days === 1) {
    return isPast ? 'gestern' : 'morgen'
  }

  if (days < 7) {
    if (isPast) {
      return `vor ${days} Tagen`
    }
    return `in ${days} Tagen`
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7)
    if (isPast) {
      return weeks === 1 ? 'vor 1 Woche' : `vor ${weeks} Wochen`
    }
    return weeks === 1 ? 'in 1 Woche' : `in ${weeks} Wochen`
  }

  const months = Math.floor(days / 30)
  if (isPast) {
    return months === 1 ? 'vor 1 Monat' : `vor ${months} Monaten`
  }
  return months === 1 ? 'in 1 Monat' : `in ${months} Monaten`
}

const tabConfig: Record<Tab, { label: string; color: string; bgColor: string; icon: typeof AlertCircle; emptyText: string }> = {
  overdue: {
    label: 'Uberfällig',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.1)',
    icon: AlertCircle,
    emptyText: 'Keine überfälligen Follow-ups',
  },
  today: {
    label: 'Heute',
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.1)',
    icon: CalendarCheck,
    emptyText: 'Keine Follow-ups heute',
  },
  upcoming: {
    label: 'Bald',
    color: '#007AFF',
    bgColor: 'rgba(0, 122, 255, 0.1)',
    icon: Clock,
    emptyText: 'Keine anstehenden Follow-ups',
  },
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overdue')
  const [overdue, setOverdue] = useState<FollowUpItem[]>([])
  const [dueToday, setDueToday] = useState<FollowUpItem[]>([])
  const [upcoming, setUpcoming] = useState<FollowUpItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    const [o, t, u] = await Promise.all([
      getOverdueFollowUps(),
      getDueToday(),
      getUpcomingFollowUps(),
    ])
    setOverdue(o)
    setDueToday(t)
    setUpcoming(u)
    setLoaded(true)
  }, [])

  // Fetch on mount
  useEffect(() => { fetchData() }, [fetchData])

  // Refresh when opening
  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, fetchData])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const overdueCount = overdue.length

  const tabData: Record<Tab, FollowUpItem[]> = {
    overdue,
    today: dueToday,
    upcoming,
  }

  const currentItems = tabData[activeTab]
  const currentConfig = tabConfig[activeTab]

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
        className="hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] hover:shadow-md"
      >
        <Bell size={20} />
        {/* Notification Badge */}
        {overdueCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '18px',
              height: '18px',
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 100%)',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)',
              border: '2px solid var(--color-bg)',
            }}
          >
            {overdueCount > 9 ? '9+' : overdueCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            width: '380px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'dropdownIn 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 12px',
            }}
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              Follow-up Erinnerungen
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                background: 'var(--color-bg-secondary)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '0 20px 12px',
            }}
          >
            {(Object.keys(tabConfig) as Tab[]).map((tab) => {
              const config = tabConfig[tab]
              const isActive = activeTab === tab
              const count = tabData[tab].length
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    background: isActive ? config.bgColor : 'var(--color-bg-secondary)',
                    border: isActive ? `1px solid ${config.color}30` : '1px solid transparent',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isActive ? config.color : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {config.label}
                  {count > 0 && (
                    <span
                      style={{
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 5px',
                        background: isActive ? config.color : 'var(--color-bg-tertiary)',
                        color: isActive ? 'white' : 'var(--color-text-tertiary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--color-border)' }} />

          {/* Items List */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {currentItems.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 20px',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: currentConfig.bgColor,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentConfig.color,
                  }}
                >
                  <currentConfig.icon size={22} />
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                  }}
                >
                  {currentConfig.emptyText}
                </span>
              </div>
            ) : (
              currentItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/leads/${item.id}`}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.15s ease',
                  }}
                  className="hover:bg-[var(--color-bg-secondary)]"
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      background: currentConfig.bgColor,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: currentConfig.color,
                      flexShrink: 0,
                    }}
                  >
                    <currentConfig.icon size={16} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                      }}
                    >
                      {item.company && (
                        <>
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-text-tertiary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.company}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            &middot;
                          </span>
                        </>
                      )}
                      <span
                        style={{
                          fontSize: '12px',
                          color: currentConfig.color,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatRelativeTime(item.next_follow_up_at)}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight
                    size={16}
                    style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
                  />
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
