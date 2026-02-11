'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe,
  Mail,
  Zap,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Play,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  UserPlus,
  Copy,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  website: string | null
  headline: string | null
  linkedin_url: string | null
  vertical: string | null
  stage: string | null
  location: string | null
  lead_score: number | null
  created_at: string
}

interface EnrichmentStatus {
  hasEnrichment: boolean
  hasEmailDraft: boolean
}

interface Vertical {
  slug: string
  name: string
}

interface ProgressResult {
  leadId: string
  leadName: string
  success: boolean
  enrichmentStatus?: string
  emailGenerated?: boolean
  error?: string
}

interface SearchResult {
  type: 'profile' | 'summary'
  name?: string
  company?: string | null
  linkedin_url?: string
  website?: string | null
  email?: string | null
  phone?: string | null
  imported?: boolean
  duplicate?: boolean
  error?: string
  total?: number
  imported_count?: number
  duplicate_count?: number
  error_count?: number
}

type AutomationType = 'enrichment' | 'email' | 'pipeline' | 'search'

interface AutomationsClientProps {
  leads: Lead[]
  enrichmentStatus: Record<string, EnrichmentStatus>
  verticals: Vertical[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTOMATIONS = [
  {
    id: 'enrichment' as AutomationType,
    name: 'Lead-Recherche',
    description: 'Website scrapen + KI-Recherche via Perplexity Sonar. Findet E-Mail, Telefon, Firmenbeschreibung und Geschaeftsprozesse.',
    icon: Globe,
    color: '#007AFF',
    bgColor: 'rgba(0, 122, 255, 0.10)',
    defaultFilter: 'unenriched' as const,
  },
  {
    id: 'email' as AutomationType,
    name: 'E-Mail generieren',
    description: 'Personalisierte Outreach-E-Mail mit GPT-5 Mini erstellen. Nutzt Recherche-Daten fuer maximale Personalisierung.',
    icon: Mail,
    color: '#AF52DE',
    bgColor: 'rgba(175, 82, 222, 0.10)',
    defaultFilter: 'no_email' as const,
  },
  {
    id: 'pipeline' as AutomationType,
    name: 'Komplett-Pipeline',
    description: 'Recherche + E-Mail in einem Schritt. Ideal fuer neue Leads ohne Daten.',
    icon: Zap,
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.10)',
    defaultFilter: 'unenriched' as const,
  },
  {
    id: 'search' as AutomationType,
    name: 'Leads suchen',
    description: 'Neue Leads via Google finden — LinkedIn-Profile, Kontaktdaten, Website. Automatisch importieren + anreichern.',
    icon: Search,
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.10)',
    defaultFilter: 'all' as const,
  },
]

const STAGES: Record<string, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  discovery_call: 'Discovery Call',
  proposal_sent: 'Angebot',
  negotiation: 'Verhandlung',
  won: 'Gewonnen',
  lost: 'Verloren',
}

type StatusFilter = 'all' | 'unenriched' | 'no_email'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutomationsClient({ leads, enrichmentStatus, verticals }: AutomationsClientProps) {
  const router = useRouter()

  // Selection state
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationType | null>(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [verticalFilter, setVerticalFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  // Execution state
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [progress, setProgress] = useState<{
    completed: number
    total: number
    results: ProgressResult[]
  }>({ completed: 0, total: 0, results: [] })

  // Search-specific state
  const [searchVertical, setSearchVertical] = useState('')
  const [searchMaxLeads, setSearchMaxLeads] = useState(20)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchSummary, setSearchSummary] = useState<SearchResult | null>(null)

  // Stats
  const totalLeads = leads.length
  const unenrichedCount = leads.filter((l) => !enrichmentStatus[l.id]?.hasEnrichment).length
  const noEmailCount = leads.filter((l) => !enrichmentStatus[l.id]?.hasEmailDraft).length

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== 'all' && lead.stage !== stageFilter) return false
      if (verticalFilter !== 'all' && lead.vertical !== verticalFilter) return false
      const status = enrichmentStatus[lead.id]
      if (statusFilter === 'unenriched' && status?.hasEnrichment) return false
      if (statusFilter === 'no_email' && status?.hasEmailDraft) return false
      return true
    })
  }, [leads, stageFilter, verticalFilter, statusFilter, enrichmentStatus])

  // Handlers
  const handleSelectAutomation = (automationId: AutomationType) => {
    const automation = AUTOMATIONS.find((a) => a.id === automationId)!
    setSelectedAutomation(automationId)
    setStatusFilter(automation.defaultFilter)
    setSelectedLeadIds(new Set())
    setIsDone(false)
    setProgress({ completed: 0, total: 0, results: [] })
    setSearchResults([])
    setSearchSummary(null)
    if (automationId === 'search' && verticals.length > 0 && !searchVertical) {
      setSearchVertical(verticals[0].slug)
    }
  }

  const handleSelectAll = () => {
    setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)))
  }

  const handleSelectNone = () => {
    setSelectedLeadIds(new Set())
  }

  const handleToggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  const handleBack = () => {
    setSelectedAutomation(null)
    setIsDone(false)
    setProgress({ completed: 0, total: 0, results: [] })
    setSearchResults([])
    setSearchSummary(null)
  }

  const handleRun = async () => {
    if (selectedLeadIds.size === 0 || !selectedAutomation) return

    setIsRunning(true)
    setIsDone(false)
    setProgress({ completed: 0, total: selectedLeadIds.size, results: [] })

    const leadIds = Array.from(selectedLeadIds)

    try {
      const response = await fetch('/api/automations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation: selectedAutomation, leadIds }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const event: ProgressResult = JSON.parse(line)
              setProgress((prev) => ({
                ...prev,
                completed: prev.completed + 1,
                results: [...prev.results, event],
              }))
            } catch {
              // skip malformed lines
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const event: ProgressResult = JSON.parse(buffer)
            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              results: [...prev.results, event],
            }))
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      console.error('Automation run failed:', err)
    } finally {
      setIsRunning(false)
      setIsDone(true)
      router.refresh()
    }
  }

  const handleRunSearch = async () => {
    if (!searchVertical) return

    setIsRunning(true)
    setIsDone(false)
    setSearchResults([])
    setSearchSummary(null)
    setProgress({ completed: 0, total: searchMaxLeads, results: [] })

    try {
      const response = await fetch('/api/automations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vertical: searchVertical, maxLeads: searchMaxLeads }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const event: SearchResult = JSON.parse(line)
              if (event.type === 'summary') {
                setSearchSummary(event)
              } else {
                setSearchResults(prev => [...prev, event])
                setProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
              }
            } catch { /* skip */ }
          }
        }

        if (buffer.trim()) {
          try {
            const event: SearchResult = JSON.parse(buffer)
            if (event.type === 'summary') {
              setSearchSummary(event)
            } else {
              setSearchResults(prev => [...prev, event])
              setProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsRunning(false)
      setIsDone(true)
      router.refresh()
    }
  }

  const selectedAutomationConfig = AUTOMATIONS.find((a) => a.id === selectedAutomation)
  const successCount = progress.results.filter((r) => r.success).length
  const errorCount = progress.results.filter((r) => !r.success).length

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Leads gesamt" value={totalLeads} color="var(--color-blue)" />
        <StatCard label="Unangereichert" value={unenrichedCount} color="var(--color-orange)" />
        <StatCard label="Ohne E-Mail-Entwurf" value={noEmailCount} color="var(--color-purple)" />
      </div>

      {/* Automation Cards */}
      {!selectedAutomation && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {AUTOMATIONS.map((automation) => (
            <button
              key={automation.id}
              onClick={() => handleSelectAutomation(automation.id)}
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '28px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = automation.color
                e.currentTarget.style.boxShadow = `0 4px 20px ${automation.bgColor}`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: automation.bgColor,
                  color: automation.color,
                  marginBottom: '16px',
                }}
              >
                <automation.icon size={24} />
              </div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em',
                }}
              >
                {automation.name}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}
              >
                {automation.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Search Config Panel */}
      {selectedAutomation === 'search' && !isRunning && !isDone && (
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg)' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(52, 199, 89, 0.10)',
                color: '#34C759',
              }}
            >
              <Search size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                Leads suchen
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                Vertical und Anzahl konfigurieren
              </p>
            </div>
          </div>

          {/* Search Config */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Vertical
              </label>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                <select
                  value={searchVertical}
                  onChange={(e) => setSearchVertical(e.target.value)}
                  style={{
                    appearance: 'none',
                    width: '100%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '10px 36px 10px 14px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {verticals.map((v) => (
                    <option key={v.slug} value={v.slug}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'var(--color-text-tertiary)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Anzahl Leads: <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{searchMaxLeads}</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={searchMaxLeads}
                onChange={(e) => setSearchMaxLeads(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#34C759' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(52, 199, 89, 0.06)',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Sucht via Google nach LinkedIn-Profilen im DACH-Raum, extrahiert Kontaktdaten von Firmenwebsites und importiert als neue Leads. Enrichment + E-Mail-Generierung starten automatisch.
            </div>
          </div>

          {/* Run Button */}
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              ~{searchMaxLeads} Leads suchen in &quot;{verticals.find(v => v.slug === searchVertical)?.name ?? searchVertical}&quot;
            </span>
            <button
              onClick={handleRunSearch}
              disabled={!searchVertical}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                background: '#34C759',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <Search size={16} />
              Suche starten
            </button>
          </div>
        </div>
      )}

      {/* Lead Selection Panel (for enrichment/email/pipeline) */}
      {selectedAutomation && selectedAutomation !== 'search' && !isRunning && !isDone && (
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg)'
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: selectedAutomationConfig!.bgColor,
                color: selectedAutomationConfig!.color,
              }}
            >
              {selectedAutomationConfig && <selectedAutomationConfig.icon size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                {selectedAutomationConfig?.name}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                Leads auswaehlen und starten
              </p>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as StatusFilter); setSelectedLeadIds(new Set()) }}
              options={[
                { value: 'all', label: 'Alle' },
                { value: 'unenriched', label: 'Unangereichert' },
                { value: 'no_email', label: 'Ohne E-Mail' },
              ]}
            />
            <FilterSelect
              label="Stage"
              value={stageFilter}
              onChange={(v) => { setStageFilter(v); setSelectedLeadIds(new Set()) }}
              options={[
                { value: 'all', label: 'Alle Stages' },
                ...Object.entries(STAGES).map(([val, label]) => ({ value: val, label })),
              ]}
            />
            <FilterSelect
              label="Vertical"
              value={verticalFilter}
              onChange={(v) => { setVerticalFilter(v); setSelectedLeadIds(new Set()) }}
              options={[
                { value: 'all', label: 'Alle Verticals' },
                ...verticals.map((v) => ({ value: v.slug, label: v.name })),
              ]}
            />

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={handleSelectAll} style={styles.smallBtn}>
                Alle ({filteredLeads.length})
              </button>
              <button onClick={handleSelectNone} style={styles.smallBtn}>
                Keine
              </button>
            </div>
          </div>

          {/* Lead List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filteredLeads.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
                Keine Leads fuer diese Filter gefunden.
              </div>
            ) : (
              filteredLeads.map((lead, idx) => {
                const isSelected = selectedLeadIds.has(lead.id)
                const status = enrichmentStatus[lead.id]
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleToggleLead(lead.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      borderBottom: idx < filteredLeads.length - 1 ? '1px solid var(--color-border)' : 'none',
                      background: isSelected ? 'rgba(0, 122, 255, 0.04)' : 'transparent',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? 'rgba(0, 122, 255, 0.04)' : 'transparent'
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #007AFF' : '2px solid var(--color-border-strong)',
                        background: isSelected ? '#007AFF' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <CheckCircle size={14} color="#fff" />}
                    </div>

                    {/* Lead Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                          {lead.name}
                        </span>
                        {lead.company && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            {lead.company}
                          </span>
                        )}
                      </div>
                      {lead.headline && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '500px',
                          }}
                        >
                          {lead.headline}
                        </div>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {lead.stage && (
                        <span style={styles.badge}>
                          {STAGES[lead.stage] || lead.stage}
                        </span>
                      )}
                      {status?.hasEnrichment && (
                        <span style={{ ...styles.badge, color: 'var(--color-green)', background: 'rgba(52, 199, 89, 0.10)' }}>
                          Recherche
                        </span>
                      )}
                      {status?.hasEmailDraft && (
                        <span style={{ ...styles.badge, color: 'var(--color-purple)', background: 'rgba(175, 82, 222, 0.10)' }}>
                          E-Mail
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Run Button */}
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {selectedLeadIds.size} von {filteredLeads.length} Leads ausgewaehlt
            </span>
            <button
              onClick={handleRun}
              disabled={selectedLeadIds.size === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                background: selectedLeadIds.size > 0 ? (selectedAutomationConfig?.color || '#007AFF') : 'var(--color-text-tertiary)',
                border: 'none',
                borderRadius: '12px',
                cursor: selectedLeadIds.size > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: selectedLeadIds.size > 0 ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (selectedLeadIds.size > 0) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Play size={16} />
              Starten ({selectedLeadIds.size} Leads)
            </button>
          </div>
        </div>
      )}

      {/* Search Progress View */}
      {(isRunning || isDone) && selectedAutomation === 'search' && (
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Progress Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(52, 199, 89, 0.10)',
                  color: '#34C759',
                }}
              >
                {isRunning ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle size={18} />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                  {isRunning ? 'Suche laeuft...' : 'Suche abgeschlossen!'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {isRunning
                    ? `${searchResults.length} Profile gefunden...`
                    : searchSummary
                      ? `${searchSummary.imported_count} importiert, ${searchSummary.duplicate_count} Duplikate`
                      : `${searchResults.filter(r => r.imported).length} importiert`}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--color-bg-secondary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: '#34C759',
                  width: searchMaxLeads > 0 ? `${Math.min((searchResults.length / searchMaxLeads) * 100, 100)}%` : '0%',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Results List */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: result.duplicate ? 'rgba(255, 149, 0, 0.03)' : result.error ? 'rgba(255, 59, 48, 0.03)' : 'transparent',
                }}
              >
                {result.imported ? (
                  <UserPlus size={18} color="var(--color-green)" />
                ) : result.duplicate ? (
                  <Copy size={18} color="var(--color-orange)" />
                ) : (
                  <XCircle size={18} color="var(--color-red)" />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {result.name}
                    </span>
                    {result.company && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {result.company}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                    {result.website && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                        {new URL(result.website).hostname.replace('www.', '')}
                      </span>
                    )}
                    {result.email && (
                      <span style={{ fontSize: '11px', color: 'var(--color-blue)' }}>
                        {result.email}
                      </span>
                    )}
                    {result.phone && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                        {result.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {result.imported && (
                    <span style={{ ...styles.badge, color: 'var(--color-green)', background: 'rgba(52, 199, 89, 0.10)' }}>
                      Importiert
                    </span>
                  )}
                  {result.duplicate && (
                    <span style={{ ...styles.badge, color: 'var(--color-orange)', background: 'rgba(255, 149, 0, 0.10)' }}>
                      Duplikat
                    </span>
                  )}
                  {result.error && (
                    <span style={{ ...styles.badge, color: 'var(--color-red)', background: 'rgba(255, 59, 48, 0.10)' }}>
                      Fehler
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isRunning && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  background: 'rgba(52, 199, 89, 0.02)',
                }}
              >
                <Loader2 size={18} color="#34C759" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Suche weitere Profile...
                </span>
              </div>
            )}
          </div>

          {/* Summary & Actions */}
          {isDone && (
            <div
              style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                gap: '12px',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {searchSummary && (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {searchSummary.total} gefunden &middot; {searchSummary.imported_count} importiert &middot; {searchSummary.duplicate_count} Duplikate
                  {(searchSummary.error_count ?? 0) > 0 && ` · ${searchSummary.error_count} Fehler`}
                </span>
              )}
              <button onClick={handleBack} style={styles.secondaryBtn}>
                <ArrowLeft size={16} />
                Zurueck
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress View (for enrichment/email/pipeline) */}
      {(isRunning || isDone) && selectedAutomation && selectedAutomation !== 'search' && (
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Progress Header */}
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: selectedAutomationConfig!.bgColor,
                  color: selectedAutomationConfig!.color,
                }}
              >
                {isRunning ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle size={18} />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                  {isRunning
                    ? `${selectedAutomationConfig?.name} laeuft...`
                    : 'Fertig!'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {isRunning
                    ? `${progress.completed} von ${progress.total} verarbeitet`
                    : `${successCount} erfolgreich${errorCount > 0 ? `, ${errorCount} fehlgeschlagen` : ''}`}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--color-bg-secondary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: selectedAutomationConfig?.color || '#007AFF',
                  width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Results List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {progress.results.map((result, idx) => (
              <div
                key={result.leadId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  borderBottom: idx < progress.results.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {result.success ? (
                  <CheckCircle size={18} color="var(--color-green)" />
                ) : (
                  <XCircle size={18} color="var(--color-red)" />
                )}
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)', fontWeight: 500 }}>
                  {result.leadName}
                </span>
                {result.success ? (
                  <span style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: 600 }}>
                    {result.enrichmentStatus === 'complete' ? 'Vollstaendig' : result.enrichmentStatus === 'partial' ? 'Teilweise' : 'OK'}
                    {result.emailGenerated && ' + E-Mail'}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--color-red)', fontWeight: 500 }}>
                    {result.error || 'Fehler'}
                  </span>
                )}
              </div>
            ))}

            {/* Pending leads (not yet processed) */}
            {isRunning && progress.completed < progress.total && (
              <>
                {/* Currently processing */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'rgba(0, 122, 255, 0.02)',
                  }}
                >
                  <Loader2 size={18} color="var(--color-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Verarbeite...
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Done Actions */}
          {isDone && (
            <div
              style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button onClick={handleBack} style={styles.secondaryBtn}>
                <ArrowLeft size={16} />
                Zurueck
              </button>
              {errorCount > 0 && (
                <button
                  onClick={() => {
                    const failedIds = progress.results.filter((r) => !r.success).map((r) => r.leadId)
                    setSelectedLeadIds(new Set(failedIds))
                    setIsDone(false)
                    setProgress({ completed: 0, total: 0, results: [] })
                  }}
                  style={{
                    ...styles.secondaryBtn,
                    color: 'var(--color-orange)',
                    borderColor: 'var(--color-orange)',
                  }}
                >
                  <RotateCcw size={16} />
                  Fehlgeschlagene erneut ({errorCount})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '8px 32px 8px 12px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text)',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: 'var(--color-text-tertiary)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  smallBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '100px',
    color: 'var(--color-text-tertiary)',
    background: 'var(--color-bg-secondary)',
    whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
}
