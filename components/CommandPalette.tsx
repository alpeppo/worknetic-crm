'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Briefcase,
  BarChart3,
  Calendar,
  Settings,
  Inbox,
  ArrowRight,
  Building2,
  LayoutDashboard,
} from 'lucide-react'
import { searchLeads } from '@/lib/actions'

interface Lead {
  id: string
  name: string
  company: string | null
  stage: string
  lead_score: number | null
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
]

const stageLabels: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Neu', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.1)' },
  contacted: { label: 'Kontaktiert', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)' },
  qualified: { label: 'Qualifiziert', color: '#34C759', bg: 'rgba(52, 199, 89, 0.1)' },
  proposal: { label: 'Angebot', color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.1)' },
  negotiation: { label: 'Verhandlung', color: '#5AC8FA', bg: 'rgba(90, 200, 250, 0.1)' },
  won: { label: 'Gewonnen', color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  lost: { label: 'Verloren', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' },
}

function getStageInfo(stage: string) {
  return stageLabels[stage] || { label: stage, color: 'var(--color-text-secondary)', bg: 'var(--color-bg-secondary)' }
}

export function CommandPalette() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Total selectable items count
  const totalItems = query.trim() === '' ? navigationItems.length : leads.length

  // Open/close with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opening, reset state when closing
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Small delay to ensure the DOM has rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setLeads([])
      setSelectedIndex(0)
      setIsLoading(false)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = query.trim()
    if (trimmed === '') {
      setLeads([])
      setIsLoading(false)
      setSelectedIndex(0)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLeads(trimmed)
        setLeads(results)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search failed:', err)
        setLeads([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Navigate to a path and close the palette
  const navigateTo = useCallback(
    (path: string) => {
      setIsOpen(false)
      router.push(path)
    },
    [router]
  )

  // Handle selecting the current item
  const handleSelect = useCallback(() => {
    if (query.trim() === '') {
      // Navigation mode
      const item = navigationItems[selectedIndex]
      if (item) navigateTo(item.href)
    } else {
      // Leads mode
      const lead = leads[selectedIndex]
      if (lead) navigateTo(`/leads/${lead.id}`)
    }
  }, [query, selectedIndex, leads, navigateTo])

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % Math.max(totalItems, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1))
          break
        case 'Enter':
          e.preventDefault()
          handleSelect()
          break
      }
    },
    [totalItems, handleSelect]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const showNavigation = query.trim() === ''
  const showLeads = query.trim() !== ''
  const noResults = showLeads && !isLoading && leads.length === 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        animation: 'cmdPaletteOverlayIn 0.15s ease-out',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Dialog */}
      <div
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          margin: '0 24px',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          animation: 'cmdPaletteDialogIn 0.2s var(--ease-out)',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Search
            size={22}
            style={{
              color: 'var(--color-text-tertiary)',
              flexShrink: 0,
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen..."
            style={{
              flex: 1,
              fontSize: '18px',
              fontWeight: 400,
              color: 'var(--color-text)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              letterSpacing: '-0.01em',
              lineHeight: '1.4',
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                flexShrink: 0,
                lineHeight: '1.4',
              }}
            >
              Löschen
            </button>
          )}
          <kbd
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'inherit',
              color: 'var(--color-text-tertiary)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              flexShrink: 0,
              lineHeight: '1.4',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {/* Loading indicator */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                color: 'var(--color-text-tertiary)',
                fontSize: '14px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--color-border)',
                  borderTopColor: 'var(--color-blue)',
                  borderRadius: '50%',
                  animation: 'cmdPaletteSpin 0.6s linear infinite',
                  marginRight: '10px',
                }}
              />
              Suche läuft...
            </div>
          )}

          {/* Navigation section */}
          {showNavigation && (
            <>
              <div
                style={{
                  padding: '8px 12px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Navigation
              </div>
              {navigationItems.map((item, index) => (
                <button
                  key={item.href}
                  data-selected={selectedIndex === index}
                  onClick={() => navigateTo(item.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      selectedIndex === index
                        ? 'var(--color-bg-secondary)'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        selectedIndex === index
                          ? 'rgba(0, 122, 255, 0.1)'
                          : 'var(--color-bg-secondary)',
                      flexShrink: 0,
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <item.icon
                      size={16}
                      style={{
                        color:
                          selectedIndex === index
                            ? 'var(--color-blue)'
                            : 'var(--color-text-secondary)',
                        transition: 'color 0.1s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--color-text)',
                    }}
                  >
                    {item.name}
                  </span>
                  {selectedIndex === index && (
                    <ArrowRight
                      size={14}
                      style={{ color: 'var(--color-text-tertiary)' }}
                    />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Leads results */}
          {showLeads && !isLoading && leads.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 12px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Leads
              </div>
              {leads.map((lead, index) => {
                const stage = getStageInfo(lead.stage)
                return (
                  <button
                    key={lead.id}
                    data-selected={selectedIndex === index}
                    onClick={() => navigateTo(`/leads/${lead.id}`)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background:
                        selectedIndex === index
                          ? 'var(--color-bg-secondary)'
                          : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          selectedIndex === index
                            ? 'rgba(0, 122, 255, 0.1)'
                            : 'var(--color-bg-secondary)',
                        flexShrink: 0,
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <Users
                        size={16}
                        style={{
                          color:
                            selectedIndex === index
                              ? 'var(--color-blue)'
                              : 'var(--color-text-secondary)',
                          transition: 'color 0.1s ease',
                        }}
                      />
                    </div>
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
                        {lead.name}
                      </div>
                      {lead.company && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: 'var(--color-text-tertiary)',
                            marginTop: '1px',
                          }}
                        >
                          <Building2 size={11} />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {lead.company}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: stage.color,
                        background: stage.bg,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        flexShrink: 0,
                        lineHeight: '1.4',
                      }}
                    >
                      {stage.label}
                    </span>
                    {selectedIndex === index && (
                      <ArrowRight
                        size={14}
                        style={{
                          color: 'var(--color-text-tertiary)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </>
          )}

          {/* No results */}
          {noResults && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 16px',
                gap: '8px',
              }}
            >
              <Search
                size={32}
                style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}
              />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Keine Ergebnisse
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Kein Lead gefunden für &ldquo;{query}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '10px 20px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <kbd
              style={{
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
                fontWeight: 500,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
              }}
            >
              &uarr;
            </kbd>
            <kbd
              style={{
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
                fontWeight: 500,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
              }}
            >
              &darr;
            </kbd>
            <span style={{ marginLeft: '2px' }}>Navigieren</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <kbd
              style={{
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
                fontWeight: 500,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
              }}
            >
              &crarr;
            </kbd>
            <span style={{ marginLeft: '2px' }}>Öffnen</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <kbd
              style={{
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
                fontWeight: 500,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
              }}
            >
              ESC
            </kbd>
            <span style={{ marginLeft: '2px' }}>Schließen</span>
          </span>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes cmdPaletteOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes cmdPaletteDialogIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes cmdPaletteSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
