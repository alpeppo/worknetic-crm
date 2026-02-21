'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { LeadForm } from './LeadForm'
import { CSVImport } from './CSVImport'
import { updateLeadStage, deleteLead, markLeadReviewed, bulkUpdateLeadStage, bulkDeleteLeads, bulkMarkReviewed } from '@/lib/actions'
import {
  Plus,
  Download,
  Upload,
  Mail,
  Phone,
  Linkedin,
  ArrowUpDown,
  Trash2,
  Edit2,
  ChevronDown,
  Inbox,
  CheckCircle2,
  Users,
  Check,
  Flame,
  Star,
  Crown,
  TrendingUp,
  Target,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  headline?: string
  linkedin_url?: string
  vertical?: string
  source?: string
  stage?: string
  lead_score?: number
  pain_score?: number
  fit_score?: number
  buying_score?: number
  contact_score?: number
  decision_maker_score?: number
  budget_score?: number
  decision_maker_level?: string
  enrichment_status?: string
  outreach_priority?: string
  outreach_channel?: string
  company_description?: string
  qualified?: boolean
  reviewed?: boolean
  created_at: string
}

interface Vertical {
  id: string
  name: string
  color?: string
}

interface LeadsClientProps {
  leads: Lead[]
  totalLeads: number
  qualifiedLeads: number
  highScoreLeads: number
  avgScore: string
  inboxCount: number
  readyCount: number
  verticals?: Vertical[]
  totalCount: number
  currentPage: number
  pageSize: number
}

const STAGES = [
  { value: 'new', label: 'Neu', color: '#64748B' },
  { value: 'contacted', label: 'Kontaktiert', color: '#4F46E5' },
  { value: 'follow_up', label: 'Follow-up', color: '#818CF8' },
  { value: 'qualified', label: 'Qualifiziert', color: '#818CF8' },
  { value: 'discovery_call', label: 'Discovery', color: '#F59E0B' },
  { value: 'proposal_sent', label: 'Proposal', color: '#F59E0B' },
  { value: 'negotiation', label: 'Negotiation', color: '#EF4444' },
  { value: 'won', label: 'Gewonnen', color: '#10B981' },
  { value: 'lost', label: 'Verloren', color: '#64748B' },
]

type TabType = 'inbox' | 'ready' | 'all'

export function LeadsClient({
  leads,
  totalLeads,
  qualifiedLeads,
  highScoreLeads,
  avgScore,
  inboxCount,
  readyCount,
  verticals = [],
  totalCount,
  currentPage,
  pageSize
}: LeadsClientProps) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('inbox')
  const [filter, setFilter] = useState<string>('all')
  const [verticalFilter, setVerticalFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false)

  // Extract unique verticals from leads if not provided
  const uniqueVerticals = verticals.length > 0 ? verticals :
    [...new Set(leads.map(l => l.vertical).filter(Boolean))].map(v => ({ id: v!, name: v!, color: '#4F46E5' }))

  const getLeadsByTab = () => {
    switch (activeTab) {
      case 'inbox': return leads.filter(l => !l.reviewed)
      case 'ready': return leads.filter(l => l.reviewed)
      default: return leads
    }
  }

  const tabLeads = getLeadsByTab()

  const filteredLeads = tabLeads.filter(lead => {
    // Vertical filter
    if (verticalFilter !== 'all' && lead.vertical !== verticalFilter) return false

    // Status filter
    if (filter === 'all') return true
    if (filter === 'qualified') return lead.qualified
    if (filter === 'high_score') return (lead.lead_score || 0) >= 7
    if (filter === 'hot') return lead.outreach_priority === 'hot'
    if (filter === 'with_phone') return (lead.contact_score || 0) >= 3
    return true
  })

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#10B981'
    if (score >= 5) return '#F59E0B'
    return '#64748B'
  }

  const getScoreClass = (score: number) => {
    if (score >= 7) return 'high'
    if (score >= 5) return 'medium'
    return 'low'
  }

  const getStageInfo = (stage: string) => {
    return STAGES.find(s => s.value === stage) || STAGES[0]
  }

  const handleStageChange = async (leadId: string, newStage: string) => {
    setIsLoading(leadId)
    setActiveDropdown(null)
    const result = await updateLeadStage(leadId, newStage)
    if (result && !result.success) {
      console.error('Stage update failed:', result.error)
      alert(`Stage konnte nicht geändert werden: ${result.error || 'Unbekannter Fehler'}`)
    }
    router.refresh()
    setIsLoading(null)
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('Lead wirklich löschen?')) return
    setIsLoading(leadId)
    setActiveDropdown(null)
    await deleteLead(leadId)
    router.refresh()
    setIsLoading(null)
  }

  const handleMarkReviewed = async (leadId: string, reviewed: boolean) => {
    setIsLoading(leadId)
    await markLeadReviewed(leadId, reviewed)
    router.refresh()
    setIsLoading(null)
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const handleBulkStageChange = async (stage: string) => {
    if (selectedLeads.size === 0) return
    setIsBulkLoading(true)
    await bulkUpdateLeadStage(Array.from(selectedLeads), stage)
    setSelectedLeads(new Set())
    router.refresh()
    setIsBulkLoading(false)
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return
    if (!confirm(`${selectedLeads.size} Leads wirklich löschen?`)) return
    setIsBulkLoading(true)
    await bulkDeleteLeads(Array.from(selectedLeads))
    setSelectedLeads(new Set())
    router.refresh()
    setIsBulkLoading(false)
  }

  const handleBulkMarkReviewed = async (reviewed: boolean) => {
    if (selectedLeads.size === 0) return
    setIsBulkLoading(true)
    await bulkMarkReviewed(Array.from(selectedLeads), reviewed)
    setSelectedLeads(new Set())
    router.refresh()
    setIsBulkLoading(false)
  }

  const hotLeadsCount = leads.filter(l => l.outreach_priority === 'hot').length
  const withPhoneCount = leads.filter(l => (l.contact_score || 0) >= 3).length

  const handleCSVExport = () => {
    const csvColumns = ['Name', 'Email', 'Phone', 'Company', 'Headline', 'Vertical', 'Source', 'Stage', 'Lead Score', 'Created At']

    const escapeCSVValue = (value: string | number | undefined | null): string => {
      if (value === undefined || value === null) return ''
      const str = String(value)
      // Wrap in quotes if the value contains semicolons, quotes, or newlines
      if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const getStageLabel = (stage: string | undefined): string => {
      if (!stage) return ''
      const found = STAGES.find(s => s.value === stage)
      return found ? found.label : stage
    }

    const rows = filteredLeads.map(lead => [
      escapeCSVValue(lead.name),
      escapeCSVValue(lead.email),
      escapeCSVValue(lead.phone),
      escapeCSVValue(lead.company),
      escapeCSVValue(lead.headline),
      escapeCSVValue(lead.vertical),
      escapeCSVValue(lead.source),
      escapeCSVValue(getStageLabel(lead.stage)),
      escapeCSVValue(lead.lead_score),
      escapeCSVValue(lead.created_at ? new Date(lead.created_at).toLocaleDateString('de-DE') : '')
    ].join(';'))

    const csvContent = [csvColumns.join(';'), ...rows].join('\n')

    // Add BOM for proper UTF-8 handling in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    const today = new Date().toISOString().split('T')[0]
    const filename = `leads-export-${today}.csv`

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-blue)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Gesamt</span>
            <div className="stat-icon stat-icon-blue"><Users size={22} /></div>
          </div>
          <div className="stat-value">{totalLeads}</div>
          <p className="stat-subtitle">{qualifiedLeads} qualifiziert</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-orange)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Inbox</span>
            <div className="stat-icon stat-icon-orange"><Inbox size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-orange)' }}>{inboxCount}</div>
          <p className="stat-subtitle">Zu bearbeiten</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-red)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Hot</span>
            <div className="stat-icon stat-icon-red"><Flame size={22} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-red)' }}>{hotLeadsCount}</div>
          <p className="stat-subtitle">{withPhoneCount} mit Telefon</p>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--color-green)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <span className="stat-label">Ø Score</span>
            <div className="stat-icon stat-icon-green"><TrendingUp size={22} /></div>
          </div>
          <div className="stat-value">{avgScore}</div>
          <p className="stat-subtitle">von 10</p>
        </div>
      </div>

      {/* Tabs & Actions */}
      <div className="actions-bar">
        <div className="tabs">
          <button onClick={() => setActiveTab('inbox')} className={`tab ${activeTab === 'inbox' ? 'active' : ''}`}>
            <Inbox size={16} />
            Inbox
            {inboxCount > 0 && <span className="tab-badge">{inboxCount}</span>}
          </button>
          <button onClick={() => setActiveTab('ready')} className={`tab ${activeTab === 'ready' ? 'active' : ''}`}>
            <CheckCircle2 size={16} />
            Ready
            <span style={{ fontSize: '12px', opacity: 0.6 }}>{readyCount}</span>
          </button>
          <button onClick={() => setActiveTab('all')} className={`tab ${activeTab === 'all' ? 'active' : ''}`}>
            <Users size={16} />
            Alle
            <span style={{ fontSize: '12px', opacity: 0.6 }}>{totalLeads}</span>
          </button>
        </div>

        <div className="actions-bar-right">
          <button onClick={() => setIsCSVModalOpen(true)} className="btn btn-secondary btn-sm">
            <Upload size={16} />
            CSV Import
          </button>
          <button onClick={handleCSVExport} className="btn btn-secondary btn-sm">
            <Download size={16} />
            CSV Export
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} />
            Neuer Lead
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            marginBottom: '16px',
            background: 'rgba(79, 70, 229, 0.06)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            borderRadius: '16px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#4F46E5' }}>
            {selectedLeads.size} ausgewählt
          </span>
          <div style={{ width: '1px', height: '24px', background: 'rgba(79, 70, 229, 0.2)' }} />
          <button
            onClick={() => handleBulkMarkReviewed(true)}
            disabled={isBulkLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg)', fontSize: '13px', fontWeight: 500,
              color: '#10B981', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={14} /> Ready
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'bulk-stage' ? null : 'bulk-stage')}
              disabled={isBulkLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--color-border)',
                background: 'var(--color-bg)', fontSize: '13px', fontWeight: 500,
                color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Stage ändern <ChevronDown size={14} />
            </button>
            {activeDropdown === 'bulk-stage' && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                  minWidth: '180px', background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', borderRadius: '14px',
                  padding: '8px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 100
                }}
              >
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => { handleBulkStageChange(stage.value); setActiveDropdown(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '10px 14px', background: 'transparent',
                      border: 'none', borderRadius: '8px', fontSize: '14px',
                      color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left'
                    }}
                    className="hover:bg-[var(--color-bg-secondary)]"
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }} />
                    {stage.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.06)', fontSize: '13px', fontWeight: 500,
              color: '#EF4444', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Trash2 size={14} /> Löschen
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setSelectedLeads(new Set())}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--color-text-tertiary)', cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        {/* Vertical Filter Dropdown */}
        {uniqueVerticals.length > 0 && (
          <div className="dropdown">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'vertical-filter' ? null : 'vertical-filter')}
              className={`filter-btn ${verticalFilter !== 'all' ? 'active' : ''}`}
              style={verticalFilter !== 'all' ? { borderColor: '#818CF8', background: 'rgba(129, 140, 248, 0.08)', color: '#818CF8' } : undefined}
            >
              <Target size={14} />
              {verticalFilter === 'all' ? 'Zielgruppe' : uniqueVerticals.find(v => v.id === verticalFilter)?.name || verticalFilter}
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>
            {activeDropdown === 'vertical-filter' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  minWidth: '200px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  padding: '8px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                  zIndex: 100
                }}
              >
                <button
                  onClick={() => { setVerticalFilter('all'); setActiveDropdown(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 14px',
                    background: verticalFilter === 'all' ? 'var(--color-bg-secondary)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Alle Zielgruppen
                </button>
                {uniqueVerticals.map((vertical) => (
                  <button
                    key={vertical.id}
                    onClick={() => { setVerticalFilter(vertical.id); setActiveDropdown(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 14px',
                      background: verticalFilter === vertical.id ? 'var(--color-bg-secondary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    className="hover:bg-[var(--color-bg-secondary)]"
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: vertical.color || '#818CF8'
                      }}
                    />
                    {vertical.name}
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {leads.filter(l => l.vertical === vertical.id).length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 6px' }} />

        <button onClick={() => setFilter('all')} className={`filter-btn ${filter === 'all' ? 'active' : ''}`}>
          Alle
        </button>
        <button onClick={() => setFilter('hot')} className={`filter-btn ${filter === 'hot' ? 'active' : ''}`}
          style={filter === 'hot' ? { borderColor: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444' } : undefined}>
          <Flame size={14} /> Hot
        </button>
        <button onClick={() => setFilter('with_phone')} className={`filter-btn ${filter === 'with_phone' ? 'active' : ''}`}
          style={filter === 'with_phone' ? { borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#10B981' } : undefined}>
          <Phone size={14} /> Mit Telefon
        </button>
        <button onClick={() => setFilter('qualified')} className={`filter-btn ${filter === 'qualified' ? 'active' : ''}`}
          style={filter === 'qualified' ? { borderColor: '#818CF8', background: 'rgba(129, 140, 248, 0.08)', color: '#818CF8' } : undefined}>
          <Check size={14} /> Qualifiziert
        </button>
        <button onClick={() => setFilter('high_score')} className={`filter-btn ${filter === 'high_score' ? 'active' : ''}`}>
          <TrendingUp size={14} /> Score ≥ 7
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', padding: '12px 0 12px 20px' }}>
                <input
                  type="checkbox"
                  checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                  onChange={toggleSelectAll}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4F46E5' }}
                />
              </th>
              <th style={{ width: '26%' }}>
                <span className="flex items-center gap-2">Lead <ArrowUpDown size={12} /></span>
              </th>
              <th style={{ width: '10%' }}>
                <span className="flex items-center gap-2">Score <ArrowUpDown size={12} /></span>
              </th>
              <th style={{ width: '14%' }}>Tags</th>
              <th style={{ width: '12%' }}>Stage</th>
              <th style={{ width: '12%' }}>Kontakt</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => {
                const score = lead.lead_score || 0
                const scoreColor = getScoreColor(score)
                const scoreClass = getScoreClass(score)
                const initials = lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                const stageInfo = getStageInfo(lead.stage || 'new')

                return (
                  <tr key={lead.id} className={`${isLoading === lead.id ? 'opacity-50' : ''} group`} style={{ background: selectedLeads.has(lead.id) ? 'rgba(79, 70, 229, 0.03)' : undefined }}>
                    <td style={{ padding: '12px 0 12px 20px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4F46E5' }}
                      />
                    </td>
                    <td>
                      <Link href={`/leads/${lead.id}`} className="lead-name-cell">
                        <div className="lead-avatar">{initials}</div>
                        <div className="lead-info">
                          <div className="lead-name flex items-center gap-2">
                            {lead.name}
                            {lead.qualified && (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                                <Check size={10} style={{ color: '#10B981' }} />
                              </span>
                            )}
                          </div>
                          <div className="lead-company">{lead.company || '–'}</div>
                        </div>
                      </Link>
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold" style={{ color: scoreColor, minWidth: '32px' }}>
                          {score.toFixed(1)}
                        </span>
                        <div className="score-bar" style={{ width: '50px' }}>
                          <div className={`score-fill ${scoreClass}`} style={{ width: `${(score / 10) * 100}%` }} />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.outreach_priority === 'hot' && (
                          <span className="badge badge-danger">
                            <Flame size={10} /> Hot
                          </span>
                        )}
                        {lead.outreach_priority === 'high' && (
                          <span className="badge badge-warning">
                            <Star size={10} /> High
                          </span>
                        )}
                        {lead.decision_maker_level === 'owner' && (
                          <span className="badge badge-success">
                            <Crown size={10} /> Owner
                          </span>
                        )}
                        {lead.decision_maker_level === 'director' && (
                          <span className="badge badge-primary">Director</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="dropdown">
                        {/* Modern Stage Button - Apple Capsule Style */}
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === `stage-${lead.id}` ? null : `stage-${lead.id}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          className="hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] hover:shadow-md"
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: stageInfo.color,
                              boxShadow: `0 0 6px ${stageInfo.color}50`
                            }}
                          />
                          {stageInfo.label}
                          <ChevronDown size={14} style={{ opacity: 0.5, marginLeft: '2px' }} />
                        </button>
                        {activeDropdown === `stage-${lead.id}` && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              marginTop: '8px',
                              minWidth: '180px',
                              background: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '14px',
                              padding: '8px',
                              boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                              zIndex: 100
                            }}
                          >
                            {STAGES.map((stage) => (
                              <button
                                key={stage.value}
                                onClick={() => handleStageChange(lead.id, stage.value)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '14px',
                                  color: 'var(--color-text)',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                  textAlign: 'left'
                                }}
                                className="hover:bg-[var(--color-bg-secondary)]"
                              >
                                <span
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: stage.color,
                                    boxShadow: `0 0 6px ${stage.color}40`
                                  }}
                                />
                                {stage.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[#4F46E5] transition-all" title={lead.email}>
                            <Mail size={16} />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[#10B981] transition-all" title={lead.phone}>
                            <Phone size={16} />
                          </a>
                        )}
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[#0A66C2] transition-all">
                            <Linkedin size={16} />
                          </a>
                        )}
                        {!lead.email && !lead.phone && !lead.linkedin_url && <span className="text-muted">–</span>}
                      </div>
                    </td>

                    <td>
                      {lead.reviewed ? (
                        <span className="badge badge-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Ready
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Inbox
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className={`table-action-btn ${!lead.reviewed ? 'success' : 'warning'}`}
                          onClick={() => handleMarkReviewed(lead.id, !lead.reviewed)}
                          title={lead.reviewed ? 'Zurück in Inbox' : 'Als Ready markieren'}
                        >
                          {lead.reviewed ? <Inbox size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button className="table-action-btn" onClick={() => setEditingLead(lead)} title="Bearbeiten">
                          <Edit2 size={16} />
                        </button>
                        <button className="table-action-btn danger" onClick={() => handleDelete(lead.id)} title="Löschen">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      {activeTab === 'inbox' ? <Inbox size={24} /> : activeTab === 'ready' ? <CheckCircle2 size={24} /> : <Users size={24} />}
                    </div>
                    <div className="empty-state-title">
                      {activeTab === 'inbox' ? 'Inbox ist leer' : activeTab === 'ready' ? 'Keine Ready Leads' : 'Keine Leads'}
                    </div>
                    <div className="empty-state-description">
                      {activeTab === 'inbox' ? 'Neue Leads erscheinen hier.' : activeTab === 'ready' ? 'Markiere Leads als Ready.' : filter !== 'all' ? 'Anderer Filter probieren.' : 'Erstelle deinen ersten Lead.'}
                    </div>
                    {activeTab === 'all' && filter === 'all' && (
                      <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} /> Lead erstellen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalCount > pageSize && (() => {
        const totalPages = Math.ceil(totalCount / pageSize)

        const getPageNumbers = () => {
          const pages: (number | 'ellipsis')[] = []
          if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
          } else {
            // Always show first page
            pages.push(1)
            if (currentPage > 3) {
              pages.push('ellipsis')
            }
            // Pages around current
            const start = Math.max(2, currentPage - 1)
            const end = Math.min(totalPages - 1, currentPage + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (currentPage < totalPages - 2) {
              pages.push('ellipsis')
            }
            // Always show last page
            pages.push(totalPages)
          }
          return pages
        }

        const pageNumbers = getPageNumbers()

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '20px',
              padding: '16px 20px',
              background: 'var(--color-bg)',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
              Seite {currentPage} von {totalPages}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Previous Button */}
              <button
                onClick={() => { if (currentPage > 1) router.push(`/leads?page=${currentPage - 1}`) }}
                disabled={currentPage <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: currentPage <= 1 ? 'var(--color-text-tertiary)' : 'var(--color-text)',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <ChevronLeft size={18} />
              </button>

              {/* Page Number Buttons */}
              {pageNumbers.map((page, idx) =>
                page === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      fontSize: '14px',
                      color: 'var(--color-text-tertiary)'
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => router.push(`/leads?page=${page}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: page === currentPage ? '1px solid #4F46E5' : '1px solid transparent',
                      background: page === currentPage ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      fontSize: '14px',
                      fontWeight: page === currentPage ? 600 : 500,
                      color: page === currentPage ? '#4F46E5' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {page}
                  </button>
                )
              )}

              {/* Next Button */}
              <button
                onClick={() => { if (currentPage < totalPages) router.push(`/leads?page=${currentPage + 1}`) }}
                disabled={currentPage >= totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: currentPage >= totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text)',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)} von {totalCount}
            </span>
          </div>
        )
      })()}

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Neuen Lead erstellen" size="lg">
        <LeadForm onSuccess={() => setIsCreateModalOpen(false)} onCancel={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingLead} onClose={() => setEditingLead(null)} title="Lead bearbeiten" size="lg">
        {editingLead && <LeadForm lead={editingLead} onSuccess={() => setEditingLead(null)} onCancel={() => setEditingLead(null)} />}
      </Modal>

      <Modal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} title="CSV Import" size="lg">
        <CSVImport
          onSuccess={() => setIsCSVModalOpen(false)}
          onCancel={() => setIsCSVModalOpen(false)}
        />
      </Modal>

      {activeDropdown && <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />}
    </>
  )
}
