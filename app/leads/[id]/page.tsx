import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { LeadDetailClient } from '@/components/LeadDetailClient'
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Globe,
  MapPin,
  Users,
  Building2,
  Clock,
  MessageSquare,
  PhoneCall,
  Send,
  CalendarCheck
} from 'lucide-react'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    notFound()
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const scoreNotes = lead.score_notes || {}
  const score = lead.lead_score || 0
  const scoreClass = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low'
  const initials = lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

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

  return (
    <>
      <Header
        title={lead.name}
        subtitle={lead.company || lead.headline}
        actions={<LeadDetailClient lead={lead} />}
      />

      <div className="page-content">
        {/* Back Link */}
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 mb-6 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Zurück zu Leads
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Card */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand-primary), #1a7fb3)' }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-primary mb-1">{lead.name}</h2>
                        {lead.headline && (
                          <p className="text-secondary mb-3">{lead.headline}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {lead.company && (
                            <span className="badge badge-default">
                              <Building2 size={12} />
                              {lead.company}
                            </span>
                          )}
                          {lead.vertical && (
                            <span className="badge badge-primary">
                              {lead.vertical}
                            </span>
                          )}
                          {lead.qualified && (
                            <span className="badge badge-success">
                              ✓ Qualifiziert
                            </span>
                          )}
                          <span className="badge badge-default">
                            {lead.stage}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Lead Score</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-4 gap-6 mb-6">
                  {/* Total Score */}
                  <div className="text-center">
                    <div
                      className="text-5xl font-bold mb-2"
                      style={{
                        color: scoreClass === 'high' ? 'var(--success)' :
                               scoreClass === 'medium' ? 'var(--warning)' : 'var(--text-muted)'
                      }}
                    >
                      {score.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted">Gesamt</div>
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mt-2">
                      <div
                        className={`h-full rounded-full score-fill ${scoreClass}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Pain Score */}
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 text-danger">
                      {lead.pain_score || 0}
                    </div>
                    <div className="text-sm text-muted">Pain /4</div>
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mt-2">
                      <div
                        className="h-full rounded-full bg-[var(--danger)]"
                        style={{ width: `${((lead.pain_score || 0) / 4) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Fit Score */}
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 text-success">
                      {lead.fit_score || 0}
                    </div>
                    <div className="text-sm text-muted">Fit /3</div>
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mt-2">
                      <div
                        className="h-full rounded-full bg-[var(--success)]"
                        style={{ width: `${((lead.fit_score || 0) / 3) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Buying Score */}
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2" style={{ color: '#8b5cf6' }}>
                      {lead.buying_score || 0}
                    </div>
                    <div className="text-sm text-muted">Buying /3</div>
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mt-2">
                      <div
                        className="h-full rounded-full"
                        style={{ background: '#8b5cf6', width: `${((lead.buying_score || 0) / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Score Notes */}
                {scoreNotes && Object.keys(scoreNotes).length > 0 && (
                  <div className="border-t border-[var(--border-light)] pt-6 space-y-4">
                    {scoreNotes.pain_signals && scoreNotes.pain_signals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-danger mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                          Pain Signals
                        </h4>
                        <ul className="space-y-1">
                          {scoreNotes.pain_signals.map((signal: string, i: number) => (
                            <li key={i} className="text-sm text-secondary pl-4">
                              • {signal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreNotes.fit_signals && scoreNotes.fit_signals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                          Fit Signals
                        </h4>
                        <ul className="space-y-1">
                          {scoreNotes.fit_signals.map((signal: string, i: number) => (
                            <li key={i} className="text-sm text-secondary pl-4">
                              • {signal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreNotes.buying_power && scoreNotes.buying_power.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#8b5cf6' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                          Buying Power
                        </h4>
                        <ul className="space-y-1">
                          {scoreNotes.buying_power.map((signal: string, i: number) => (
                            <li key={i} className="text-sm text-secondary pl-4">
                              • {signal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Activities */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Aktivitäten</h3>
              </div>
              <div className="card-body">
                {activities && activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-4 pb-4 border-b border-[var(--border-light)] last:border-0 last:pb-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-muted flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-default text-xs">{activity.type}</span>
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
                          <p className="text-sm font-medium">{activity.subject || activity.type}</p>
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
                    <p className="text-muted">Noch keine Aktivitäten</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Kontakt</h3>
              </div>
              <div className="card-body space-y-4">
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <Mail size={18} className="text-muted" />
                    <span className="truncate">{lead.email}</span>
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <Phone size={18} className="text-muted" />
                    <span>{lead.phone}</span>
                  </a>
                )}
                {lead.linkedin_url && (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <Linkedin size={18} className="text-muted" />
                    <span>LinkedIn Profil</span>
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <Globe size={18} className="text-muted" />
                    <span className="truncate">{lead.website}</span>
                  </a>
                )}
                {lead.location && (
                  <div className="flex items-center gap-3 text-sm text-secondary">
                    <MapPin size={18} className="text-muted" />
                    <span>{lead.location}</span>
                  </div>
                )}
                {lead.connections !== null && (
                  <div className="flex items-center gap-3 text-sm text-secondary">
                    <Users size={18} className="text-muted" />
                    <span>{lead.connections?.toLocaleString()} Connections</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pipeline</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <div className="text-xs text-muted mb-1">Stage</div>
                  <span className="badge badge-primary">{lead.stage}</span>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Vertical</div>
                  <span className="text-sm font-medium">{lead.vertical || '–'}</span>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Source</div>
                  <span className="text-sm font-medium">{lead.source || '–'}</span>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Erstellt am</div>
                  <span className="text-sm font-medium">
                    {new Date(lead.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {lead.deal_value && (
                  <div>
                    <div className="text-xs text-muted mb-1">Deal Value</div>
                    <span className="text-sm font-bold text-success">
                      €{lead.deal_value.toLocaleString()}
                    </span>
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
