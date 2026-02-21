import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { DealDetailClient, DealStagePipeline } from '@/components/DealDetailClient'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Building2,
  Mail,
  Phone,
  User,
  Clock,
  MessageSquare,
  PhoneCall,
  Send,
  CalendarCheck
} from 'lucide-react'

const STAGES = [
  { id: 'discovery', name: 'Discovery', color: '#4F46E5' },
  { id: 'qualification', name: 'Qualification', color: '#818CF8' },
  { id: 'proposal', name: 'Proposal', color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', color: '#EF4444' },
  { id: 'won', name: 'Won', color: '#10B981' },
]

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single()

  if (dealError || !deal) {
    notFound()
  }

  // Fetch associated lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', deal.lead_id)
    .single()

  // Fetch activities for this deal
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('deal_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  // If no deal-specific activities, also fetch lead activities as fallback
  let allActivities = activities || []
  if (allActivities.length === 0 && deal.lead_id) {
    const { data: leadActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', deal.lead_id)
      .order('created_at', { ascending: false })
      .limit(20)
    allActivities = leadActivities || []
  }

  const stage = STAGES.find(s => s.id === deal.stage)
  const stageColor = stage?.color || '#64748B'
  const stageName = stage?.name || deal.stage

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneCall size={16} />
      case 'email_sent': return <Send size={16} />
      case 'email_received': return <Mail size={16} />
      case 'meeting': return <CalendarCheck size={16} />
      case 'note': return <MessageSquare size={16} />
      default: return <Clock size={16} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return '#10B981'
      case 'email_sent': case 'email_received': return '#4F46E5'
      case 'meeting': return '#818CF8'
      case 'note': return '#64748B'
      default: return '#64748B'
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'call': return 'Anruf'
      case 'email_sent': return 'E-Mail gesendet'
      case 'email_received': return 'E-Mail erhalten'
      case 'meeting': return 'Meeting'
      case 'note': return 'Notiz'
      case 'stage_change': return 'Stage-Wechsel'
      default: return type
    }
  }

  return (
    <>
      <Header
        title={deal.name}
        subtitle={`${stageName} · €${(deal.value || 0).toLocaleString()}`}
        actions={<DealDetailClient deal={deal} />}
      />

      <div className="page-content">
        {/* Back Link */}
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 mb-8 text-sm hover:text-[var(--color-blue)] transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <ArrowLeft size={16} />
          Zurück zu Deals
        </Link>

        {/* Interactive Stage Pipeline */}
        <DealStagePipeline deal={deal} />

        <div className="detail-grid">
          {/* Main Content */}
          <div className="detail-main">
            {/* Deal Info Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Deal-Details</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-8">
                  {/* Value */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Wert</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#4F46E5', letterSpacing: '-0.5px' }}>
                      €{(deal.value || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Probability */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Wahrscheinlichkeit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                        {deal.probability || 0}%
                      </div>
                      <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '100px' }}>
                        <div
                          style={{
                            width: `${deal.probability || 0}%`,
                            height: '100%',
                            borderRadius: '100px',
                            background: (deal.probability || 0) >= 70 ? '#10B981' : (deal.probability || 0) >= 40 ? '#F59E0B' : '#EF4444',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stage */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Stage</span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: stageColor,
                        background: `${stageColor}15`,
                        border: `1px solid ${stageColor}30`
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: stageColor
                        }}
                      />
                      {stageName}
                    </span>
                  </div>

                  {/* Expected Close Date */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Erwarteter Abschluss</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text)' }}>
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })
                        : <span style={{ color: 'var(--color-text-tertiary)' }}>Nicht gesetzt</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Weighted Value */}
                <div
                  style={{
                    marginTop: '28px',
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>Gewichteter Wert</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>
                      €{Math.round((deal.value || 0) * ((deal.probability || 0) / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {deal.notes && (
                  <div style={{ marginTop: '28px' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Notizen</span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {deal.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activities Timeline */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Aktivitäten</h3>
              </div>
              <div className="card-body">
                {allActivities.length > 0 ? (
                  <div>
                    {allActivities.map((activity) => {
                      const color = getActivityColor(activity.type)
                      return (
                        <div key={activity.id} className="timeline-item">
                          <div
                            className="timeline-icon"
                            style={{ background: `${color}12`, color }}
                          >
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="timeline-content">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="badge badge-default" style={{ fontSize: '12px' }}>
                                {getActivityLabel(activity.type)}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                {new Date(activity.created_at).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                              {activity.subject || activity.type}
                            </p>
                            {activity.body && (
                              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
                                {activity.body}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '48px 24px' }}>
                    <div className="empty-state-icon">
                      <Clock size={24} />
                    </div>
                    <div className="empty-state-title">Noch keine Aktivitäten</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            {/* Lead Info Card */}
            {lead && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Kontakt</h3>
                </div>
                <div className="card-body">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-start gap-4 p-3 -m-3 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--color-indigo), var(--color-indigo-light))' }}
                    >
                      {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{lead.name}</div>
                      {lead.company && (
                        <div className="flex items-center gap-1.5 mt-1" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                          <Building2 size={13} />
                          {lead.company}
                        </div>
                      )}
                      {lead.headline && (
                        <div className="truncate" style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{lead.headline}</div>
                      )}
                    </div>
                  </Link>

                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="contact-link">
                        <Mail size={16} />
                        <span className="truncate">{lead.email}</span>
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="contact-link">
                        <Phone size={16} />
                        <span>{lead.phone}</span>
                      </a>
                    )}
                    {!lead.email && !lead.phone && (
                      <div style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>Keine Kontaktdaten vorhanden</div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                    <Link
                      href={`/leads/${lead.id}`}
                      style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-blue)', textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      Lead-Profil anzeigen →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Deal Metadata */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Informationen</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Erstellt am</div>
                  <span className="pipeline-info-value">
                    {new Date(deal.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Zuletzt aktualisiert</div>
                  <span className="pipeline-info-value">
                    {new Date(deal.updated_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {deal.closed_at && (
                  <div className="pipeline-info-item">
                    <div className="pipeline-info-label">Abgeschlossen am</div>
                    <span className="pipeline-info-value">
                      {new Date(deal.closed_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {deal.package_type && (
                  <div className="pipeline-info-item">
                    <div className="pipeline-info-label">Paket-Typ</div>
                    <span className="badge badge-primary">{deal.package_type}</span>
                  </div>
                )}
                {deal.assigned_to && (
                  <div className="pipeline-info-item">
                    <div className="pipeline-info-label">Zugewiesen an</div>
                    <div className="flex items-center gap-2">
                      <User size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span className="pipeline-info-value">{deal.assigned_to}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
