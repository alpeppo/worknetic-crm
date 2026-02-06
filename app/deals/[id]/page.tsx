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
  { id: 'discovery', name: 'Discovery', color: '#3b82f6' },
  { id: 'qualification', name: 'Qualification', color: '#8b5cf6' },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', color: '#ef4444' },
  { id: 'won', name: 'Won', color: '#10b981' },
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
  const stageColor = stage?.color || '#6b7280'
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
        subtitle={`${stageName} \u00b7 \u20ac${(deal.value || 0).toLocaleString()}`}
        actions={<DealDetailClient deal={deal} />}
      />

      <div className="page-content">
        {/* Back Link */}
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 mb-6 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Zuruck zu Deals
        </Link>

        {/* Interactive Stage Pipeline */}
        <DealStagePipeline deal={deal} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Deal Info Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Deal-Details</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-6">
                  {/* Value */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={16} className="text-muted" />
                      <span className="text-xs text-muted font-medium uppercase tracking-wide">Wert</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#007AFF', letterSpacing: '-0.5px' }}>
                      &euro;{(deal.value || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Probability */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-muted" />
                      <span className="text-xs text-muted font-medium uppercase tracking-wide">Wahrscheinlichkeit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                        {deal.probability || 0}%
                      </div>
                      <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px' }}>
                        <div
                          style={{
                            width: `${deal.probability || 0}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: (deal.probability || 0) >= 70 ? '#34C759' : (deal.probability || 0) >= 40 ? '#FF9500' : '#FF3B30',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stage */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted font-medium uppercase tracking-wide">Stage</span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
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
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-muted" />
                      <span className="text-xs text-muted font-medium uppercase tracking-wide">Erwarteter Abschluss</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })
                        : <span className="text-muted">Nicht gesetzt</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Weighted Value */}
                <div
                  style={{
                    marginTop: '24px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Gewichteter Wert</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#34C759' }}>
                      &euro;{Math.round((deal.value || 0) * ((deal.probability || 0) / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {deal.notes && (
                  <div style={{ marginTop: '24px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className="text-muted" />
                      <span className="text-xs text-muted font-medium uppercase tracking-wide">Notizen</span>
                    </div>
                    <p className="text-sm text-secondary" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {deal.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activities Timeline */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Aktivitaten</h3>
              </div>
              <div className="card-body">
                {allActivities.length > 0 ? (
                  <div className="space-y-4">
                    {allActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-4 pb-4 border-b border-[var(--border-light)] last:border-0 last:pb-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-muted flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-default text-xs">
                              {getActivityLabel(activity.type)}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(activity.created_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm font-medium">
                            {activity.subject || activity.type}
                          </p>
                          {activity.body && (
                            <p className="text-sm text-secondary mt-1">{activity.body}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
                      <Clock size={20} className="text-muted" />
                    </div>
                    <p className="text-muted">Noch keine Aktivitaten</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                      style={{ background: 'linear-gradient(135deg, var(--brand-primary), #1a7fb3)' }}
                    >
                      {lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-primary">{lead.name}</div>
                      {lead.company && (
                        <div className="flex items-center gap-1.5 text-sm text-secondary mt-0.5">
                          <Building2 size={13} />
                          {lead.company}
                        </div>
                      )}
                      {lead.headline && (
                        <div className="text-xs text-muted mt-1 truncate">{lead.headline}</div>
                      )}
                    </div>
                  </Link>

                  <div className="mt-4 pt-4 border-t border-[var(--border-light)] space-y-3">
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                      >
                        <Mail size={16} className="text-muted flex-shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                      >
                        <Phone size={16} className="text-muted flex-shrink-0" />
                        <span>{lead.phone}</span>
                      </a>
                    )}
                    {!lead.email && !lead.phone && (
                      <div className="text-sm text-muted">Keine Kontaktdaten vorhanden</div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Lead-Profil anzeigen &rarr;
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
              <div className="card-body space-y-4">
                <div>
                  <div className="text-xs text-muted mb-1">Erstellt am</div>
                  <span className="text-sm font-medium">
                    {new Date(deal.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Zuletzt aktualisiert</div>
                  <span className="text-sm font-medium">
                    {new Date(deal.updated_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {deal.closed_at && (
                  <div>
                    <div className="text-xs text-muted mb-1">Abgeschlossen am</div>
                    <span className="text-sm font-medium">
                      {new Date(deal.closed_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {deal.package_type && (
                  <div>
                    <div className="text-xs text-muted mb-1">Paket-Typ</div>
                    <span className="badge badge-primary">{deal.package_type}</span>
                  </div>
                )}
                {deal.assigned_to && (
                  <div>
                    <div className="text-xs text-muted mb-1">Zugewiesen an</div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-muted" />
                      <span className="text-sm font-medium">{deal.assigned_to}</span>
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
