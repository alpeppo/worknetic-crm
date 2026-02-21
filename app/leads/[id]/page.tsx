import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { LeadDetailClient } from '@/components/LeadDetailClient'
import { LeadScoreInsights } from '@/components/LeadScoreInsights'
import { DocumentManager } from '@/components/DocumentManager'
import { EnrichmentCard } from '@/components/EnrichmentCard'
import { EmailDraftCard } from '@/components/EmailDraftCard'
import { getLeadDocuments } from '@/lib/documents'
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
    .limit(50)

  const documents = await getLeadDocuments(id)

  // Extract enrichment and email draft activities (latest of each)
  const enrichmentActivity = activities?.find((a) => a.type === 'enrichment') || null
  const emailDraftActivity = activities?.find((a) => a.type === 'email_draft') || null
  // Filter out enrichment/email_draft from the regular timeline
  const timelineActivities = activities?.filter(
    (a) => a.type !== 'enrichment' && a.type !== 'email_draft'
  ) || []

  const activityCount = activities?.length || 0
  const lastActivityDate = activities && activities.length > 0 ? activities[0].created_at : null

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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return '#10B981'
      case 'email_sent': case 'email_received': return '#4F46E5'
      case 'meeting': return '#818CF8'
      case 'note': return '#64748B'
      default: return '#64748B'
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            fontSize: '14px',
            color: 'var(--color-text-tertiary)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          className="hover:text-[var(--color-blue)]"
        >
          <ArrowLeft size={16} />
          Zurück zu Leads
        </Link>

        <div className="detail-grid">
          {/* Main Content */}
          <div className="detail-main">
            {/* Lead Card — Hero section */}
            <div className="card">
              <div className="card-body" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-indigo), var(--color-indigo-light))',
                    }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                      {lead.name}
                    </h2>
                    {lead.headline && (
                      <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                        {lead.headline}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

            {/* Score Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Lead Score</h3>
                <div
                  className={`score-color-${scoreClass}`}
                  style={{ fontSize: '20px', fontWeight: 700 }}
                >
                  {score.toFixed(1)}/10
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  {/* Pain Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div className="score-color-red" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>
                      {lead.pain_score || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '10px' }}>Pain /4</div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '100px' }}>
                      <div
                        className="bg-score-red"
                        style={{ height: '100%', borderRadius: '100px', width: `${((lead.pain_score || 0) / 4) * 100}%`, transition: 'width 0.4s ease' }}
                      />
                    </div>
                  </div>

                  {/* Fit Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div className="score-color-high" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>
                      {lead.fit_score || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '10px' }}>Fit /3</div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '100px' }}>
                      <div
                        className="bg-score-high"
                        style={{ height: '100%', borderRadius: '100px', width: `${((lead.fit_score || 0) / 3) * 100}%`, transition: 'width 0.4s ease' }}
                      />
                    </div>
                  </div>

                  {/* Buying Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div className="score-color-purple" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>
                      {lead.buying_score || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '10px' }}>Buying /3</div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '100px' }}>
                      <div
                        className="bg-score-purple"
                        style={{ height: '100%', borderRadius: '100px', width: `${((lead.buying_score || 0) / 3) * 100}%`, transition: 'width 0.4s ease' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Score Notes */}
                {scoreNotes && Object.keys(scoreNotes).length > 0 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '28px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {scoreNotes.pain_signals && scoreNotes.pain_signals.length > 0 && (
                        <div>
                          <h4 className="score-color-red" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-red)' }} />
                            Pain Signals
                          </h4>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {scoreNotes.pain_signals.map((signal: string, i: number) => (
                              <li key={i} style={{ fontSize: '14px', color: 'var(--color-text-secondary)', paddingLeft: '20px' }}>
                                • {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {scoreNotes.fit_signals && scoreNotes.fit_signals.length > 0 && (
                        <div>
                          <h4 className="score-color-high" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-green)' }} />
                            Fit Signals
                          </h4>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {scoreNotes.fit_signals.map((signal: string, i: number) => (
                              <li key={i} style={{ fontSize: '14px', color: 'var(--color-text-secondary)', paddingLeft: '20px' }}>
                                • {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {scoreNotes.buying_power && scoreNotes.buying_power.length > 0 && (
                        <div>
                          <h4 className="score-color-purple" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818CF8' }} />
                            Buying Power
                          </h4>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {scoreNotes.buying_power.map((signal: string, i: number) => (
                              <li key={i} style={{ fontSize: '14px', color: 'var(--color-text-secondary)', paddingLeft: '20px' }}>
                                • {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Personalized Email Draft */}
            <EmailDraftCard
              emailActivity={emailDraftActivity}
              lead={{ id, name: lead.name, email: lead.email }}
            />

            {/* Activities */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Aktivitäten</h3>
              </div>
              <div className="card-body">
                {timelineActivities.length > 0 ? (
                  <div>
                    {timelineActivities.map((activity) => {
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
                              <span className="badge badge-default" style={{ fontSize: '12px' }}>{activity.type}</span>
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
            {/* Contact Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Kontakt</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '20px 24px' }}>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="contact-link">
                    <Mail size={18} />
                    <span className="truncate">{lead.email}</span>
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="contact-link">
                    <Phone size={18} />
                    <span>{lead.phone}</span>
                  </a>
                )}
                {lead.linkedin_url && (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    <Linkedin size={18} />
                    <span>LinkedIn Profil</span>
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    <Globe size={18} />
                    <span className="truncate">{lead.website}</span>
                  </a>
                )}
                {lead.location && (
                  <div className="contact-link" style={{ cursor: 'default' }}>
                    <MapPin size={18} />
                    <span>{lead.location}</span>
                  </div>
                )}
                {lead.connections !== null && (
                  <div className="contact-link" style={{ cursor: 'default' }}>
                    <Users size={18} />
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
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Stage</div>
                  <span className="badge badge-primary">{lead.stage}</span>
                </div>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Vertical</div>
                  <span className="pipeline-info-value">{lead.vertical || '–'}</span>
                </div>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Source</div>
                  <span className="pipeline-info-value">{lead.source || '–'}</span>
                </div>
                <div className="pipeline-info-item">
                  <div className="pipeline-info-label">Erstellt am</div>
                  <span className="pipeline-info-value">
                    {new Date(lead.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {lead.deal_value && (
                  <div className="pipeline-info-item" style={{ paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                    <div className="pipeline-info-label">Deal Value</div>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-green)' }}>
                      €{lead.deal_value.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Enrichment / Recherche */}
            <EnrichmentCard
              enrichmentActivity={enrichmentActivity}
              leadId={id}
            />

            {/* Lead Score Insights */}
            <LeadScoreInsights
              lead={lead}
              activityCount={activityCount}
              lastActivityDate={lastActivityDate}
            />

            {/* Document Manager */}
            <DocumentManager
              leadId={id}
              documents={documents}
            />
          </div>
        </div>
      </div>
    </>
  )
}
