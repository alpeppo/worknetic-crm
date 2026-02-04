'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal } from './Modal'
import { LeadForm } from './LeadForm'
import { updateLeadStage, deleteLead, markLeadReviewed } from '@/lib/actions'
import {
  Plus,
  Download,
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
  TrendingUp
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

interface LeadsClientProps {
  leads: Lead[]
  totalLeads: number
  qualifiedLeads: number
  highScoreLeads: number
  avgScore: string
  inboxCount: number
  readyCount: number
}

const STAGES = [
  { value: 'new', label: 'Neu', color: '#86868b' },
  { value: 'contacted', label: 'Kontaktiert', color: '#007AFF' },
  { value: 'qualified', label: 'Qualifiziert', color: '#AF52DE' },
  { value: 'discovery_call', label: 'Discovery', color: '#FF9500' },
  { value: 'proposal_sent', label: 'Proposal', color: '#FF9500' },
  { value: 'negotiation', label: 'Negotiation', color: '#FF3B30' },
  { value: 'won', label: 'Gewonnen', color: '#34C759' },
  { value: 'lost', label: 'Verloren', color: '#86868b' },
]

type TabType = 'inbox' | 'ready' | 'all'

export function LeadsClient({
  leads,
  totalLeads,
  qualifiedLeads,
  highScoreLeads,
  avgScore,
  inboxCount,
  readyCount
}: LeadsClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('inbox')
  const [filter, setFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const getLeadsByTab = () => {
    switch (activeTab) {
      case 'inbox': return leads.filter(l => !l.reviewed)
      case 'ready': return leads.filter(l => l.reviewed)
      default: return leads
    }
  }

  const tabLeads = getLeadsByTab()

  const filteredLeads = tabLeads.filter(lead => {
    if (filter === 'all') return true
    if (filter === 'qualified') return lead.qualified
    if (filter === 'high_score') return (lead.lead_score || 0) >= 7
    if (filter === 'hot') return lead.outreach_priority === 'hot'
    if (filter === 'with_phone') return (lead.contact_score || 0) >= 3
    return true
  })

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#34C759'
    if (score >= 5) return '#FF9500'
    return '#86868b'
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
    await updateLeadStage(leadId, newStage)
    setActiveDropdown(null)
    setIsLoading(null)
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('Lead wirklich löschen?')) return
    setIsLoading(leadId)
    await deleteLead(leadId)
    setActiveDropdown(null)
    setIsLoading(null)
  }

  const handleMarkReviewed = async (leadId: string, reviewed: boolean) => {
    setIsLoading(leadId)
    await markLeadReviewed(leadId, reviewed)
    setIsLoading(null)
  }

  const hotLeadsCount = leads.filter(l => l.outreach_priority === 'hot').length
  const withPhoneCount = leads.filter(l => (l.contact_score || 0) >= 3).length

  return (
    <>
      {/* Stats - Verticals Style */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gesamt</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 122, 255, 0.1)' }}>
              <Users size={22} style={{ color: '#007AFF' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>{totalLeads}</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>{qualifiedLeads} qualifiziert</p>
        </div>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inbox</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 149, 0, 0.1)' }}>
              <Inbox size={22} style={{ color: '#FF9500' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF9500', letterSpacing: '-0.5px' }}>{inboxCount}</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>Zu bearbeiten</p>
        </div>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hot</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 59, 48, 0.1)' }}>
              <Flame size={22} style={{ color: '#FF3B30' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF3B30', letterSpacing: '-0.5px' }}>{hotLeadsCount}</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>{withPhoneCount} mit Telefon</p>
        </div>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ø Score</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52, 199, 89, 0.1)' }}>
              <TrendingUp size={22} style={{ color: '#34C759' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>{avgScore}</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>von 10</p>
        </div>
      </div>

      {/* Tabs - Modern Style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '16px 20px',
          background: 'var(--color-bg)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg-secondary)', padding: '6px', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'inbox' ? 'var(--color-bg)' : 'transparent',
              color: activeTab === 'inbox' ? 'var(--color-text)' : 'var(--color-text-tertiary)',
              boxShadow: activeTab === 'inbox' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Inbox size={16} />
            Inbox
            {inboxCount > 0 && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: 600,
                background: activeTab === 'inbox' ? '#FF9500' : 'rgba(255, 149, 0, 0.15)',
                color: activeTab === 'inbox' ? 'white' : '#FF9500'
              }}>
                {inboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'ready' ? 'var(--color-bg)' : 'transparent',
              color: activeTab === 'ready' ? 'var(--color-text)' : 'var(--color-text-tertiary)',
              boxShadow: activeTab === 'ready' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <CheckCircle2 size={16} />
            Ready
            <span style={{ fontSize: '12px', opacity: 0.6 }}>{readyCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'all' ? 'var(--color-bg)' : 'transparent',
              color: activeTab === 'all' ? 'var(--color-text)' : 'var(--color-text-tertiary)',
              boxShadow: activeTab === 'all' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Users size={16} />
            Alle
            <span style={{ fontSize: '12px', opacity: 0.6 }}>{totalLeads}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)]"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#007AFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
            }}
            className="hover:bg-[#0066d6]"
          >
            <Plus size={16} />
            Neuer Lead
          </button>
        </div>
      </div>

      {/* Filters - Modern Pill Style */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '100px',
            border: filter === 'all' ? '1px solid #007AFF' : '1px solid var(--color-border)',
            background: filter === 'all' ? 'rgba(0, 122, 255, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filter === 'all' ? '#007AFF' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('hot')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '100px',
            border: filter === 'hot' ? '1px solid #FF3B30' : '1px solid var(--color-border)',
            background: filter === 'hot' ? 'rgba(255, 59, 48, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filter === 'hot' ? '#FF3B30' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Flame size={14} />
          Hot
        </button>
        <button
          onClick={() => setFilter('with_phone')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '100px',
            border: filter === 'with_phone' ? '1px solid #34C759' : '1px solid var(--color-border)',
            background: filter === 'with_phone' ? 'rgba(52, 199, 89, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filter === 'with_phone' ? '#34C759' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Phone size={14} />
          Mit Telefon
        </button>
        <button
          onClick={() => setFilter('qualified')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '100px',
            border: filter === 'qualified' ? '1px solid #AF52DE' : '1px solid var(--color-border)',
            background: filter === 'qualified' ? 'rgba(175, 82, 222, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filter === 'qualified' ? '#AF52DE' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Check size={14} />
          Qualifiziert
        </button>
        <button
          onClick={() => setFilter('high_score')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '100px',
            border: filter === 'high_score' ? '1px solid #007AFF' : '1px solid var(--color-border)',
            background: filter === 'high_score' ? 'rgba(0, 122, 255, 0.08)' : 'var(--color-bg)',
            fontSize: '13px',
            fontWeight: 500,
            color: filter === 'high_score' ? '#007AFF' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <TrendingUp size={14} />
          Score ≥ 7
        </button>
      </div>

      {/* Table - Modern Card Style */}
      <div
        style={{
          background: 'var(--color-bg)',
          borderRadius: '20px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>
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
                  <tr key={lead.id} className={`${isLoading === lead.id ? 'opacity-50' : ''} group`}>
                    <td>
                      <Link href={`/leads/${lead.id}`} className="lead-name-cell">
                        <div className="lead-avatar">{initials}</div>
                        <div className="lead-info">
                          <div className="lead-name flex items-center gap-2">
                            {lead.name}
                            {lead.qualified && (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ background: 'rgba(52, 199, 89, 0.15)' }}>
                                <Check size={10} style={{ color: '#34C759' }} />
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
                              zIndex: 50
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
                          <a href={`mailto:${lead.email}`} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[#007AFF] transition-all" title={lead.email}>
                            <Mail size={16} />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[#34C759] transition-all" title={lead.phone}>
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
                      <div className="flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className={`p-2 rounded-lg transition-all ${!lead.reviewed ? 'hover:bg-[rgba(52,199,89,0.1)] text-muted hover:text-[#34C759]' : 'hover:bg-[rgba(255,149,0,0.1)] text-muted hover:text-[#FF9500]'}`}
                          onClick={() => handleMarkReviewed(lead.id, !lead.reviewed)}
                          title={lead.reviewed ? 'Zurück in Inbox' : 'Als Ready markieren'}
                        >
                          {lead.reviewed ? <Inbox size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-muted hover:text-[var(--color-text)] transition-all" onClick={() => setEditingLead(lead)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-[rgba(255,59,48,0.1)] text-muted hover:text-[#FF3B30] transition-all" onClick={() => handleDelete(lead.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7}>
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

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Neuen Lead erstellen" size="lg">
        <LeadForm onSuccess={() => setIsCreateModalOpen(false)} onCancel={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingLead} onClose={() => setEditingLead(null)} title="Lead bearbeiten" size="lg">
        {editingLead && <LeadForm lead={editingLead} onSuccess={() => setEditingLead(null)} onCancel={() => setEditingLead(null)} />}
      </Modal>

      {activeDropdown && <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />}
    </>
  )
}
