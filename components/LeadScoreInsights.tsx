'use client'

import { useMemo } from 'react'
import {
  Flame,
  Sun,
  Snowflake,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Mail,
  Linkedin,
  ArrowRight,
  Target,
} from 'lucide-react'

interface LeadScoreInsightsProps {
  lead: {
    id: string
    name: string
    lead_score: number | null
    pain_score: number | null
    fit_score: number | null
    buying_score: number | null
    stage: string
    created_at: string
    last_contacted_at: string | null
    next_follow_up_at: string | null
    company: string | null
    vertical: string | null
    email: string | null
    phone: string | null
    linkedin_url: string | null
    website: string | null
    connections: number | null
    deal_value: number | null
    qualified: boolean
  }
  activityCount: number
  lastActivityDate: string | null
}

interface Recommendation {
  icon: React.ReactNode
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  color: string
}

function daysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function LeadScoreInsights({ lead, activityCount, lastActivityDate }: LeadScoreInsightsProps) {
  const engagementScore = useMemo(() => {
    let score = 0
    if (lead.email) score += 1
    if (lead.phone) score += 1
    if (lead.linkedin_url) score += 1
    if (lead.website) score += 0.5
    if (lead.connections !== null && lead.connections > 500) score += 1
    if (activityCount > 3) score += 1
    const daysSinceContact = daysSince(lead.last_contacted_at)
    if (daysSinceContact !== null && daysSinceContact <= 7) score += 1
    if (lead.next_follow_up_at) score += 0.5
    return score
  }, [lead, activityCount])

  const engagementColor = useMemo(() => {
    if (engagementScore >= 5) return 'var(--color-green)'
    if (engagementScore >= 3) return 'var(--color-orange)'
    return 'var(--color-text-tertiary)'
  }, [engagementScore])

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = []

    if (!lead.next_follow_up_at) {
      recs.push({
        icon: <Calendar size={16} />,
        title: 'Follow-up setzen',
        description: 'Kein Follow-up geplant',
        priority: 'high',
        color: 'var(--color-red)',
      })
    }

    const daysSinceContact = daysSince(lead.last_contacted_at)
    if (daysSinceContact !== null && daysSinceContact > 14) {
      recs.push({
        icon: <AlertTriangle size={16} />,
        title: 'Kontakt aufnehmen',
        description: `Seit ${daysSinceContact} Tagen kein Kontakt`,
        priority: 'high',
        color: 'var(--color-orange)',
      })
    }

    if (!lead.email) {
      recs.push({
        icon: <Mail size={16} />,
        title: 'E-Mail hinzufuegen',
        description: 'Ermogelicht E-Mail Outreach',
        priority: 'medium',
        color: 'var(--color-blue)',
      })
    }

    if (!lead.linkedin_url) {
      recs.push({
        icon: <Linkedin size={16} />,
        title: 'LinkedIn verknuepfen',
        description: 'Fuer Social Selling',
        priority: 'medium',
        color: 'var(--color-blue)',
      })
    }

    if (lead.stage === 'new' && activityCount === 0) {
      recs.push({
        icon: <ArrowRight size={16} />,
        title: 'Erstansprache starten',
        description: 'Lead ist noch unbearbeitet',
        priority: 'high',
        color: 'var(--color-red)',
      })
    }

    if (lead.pain_score !== null && lead.pain_score >= 3 && !lead.qualified) {
      recs.push({
        icon: <Target size={16} />,
        title: 'Als qualifiziert markieren',
        description: 'Hoher Pain Score',
        priority: 'medium',
        color: 'var(--color-green)',
      })
    }

    if (
      lead.deal_value !== null &&
      lead.deal_value > 0 &&
      lead.stage !== 'won' &&
      lead.stage !== 'lost'
    ) {
      recs.push({
        icon: <TrendingUp size={16} />,
        title: 'Deal nachfassen',
        description: 'Offener Deal vorhanden',
        priority: 'medium',
        color: 'var(--color-green)',
      })
    }

    return recs.slice(0, 4)
  }, [lead, activityCount])

  const trend = useMemo(() => {
    const leadScore = lead.lead_score ?? 0
    const daysSinceActivity = daysSince(lastActivityDate)
    const recentlyActive = daysSinceActivity !== null && daysSinceActivity <= 7

    if (leadScore >= 7 && recentlyActive) {
      return {
        label: 'Heisser Lead',
        icon: <Flame size={18} />,
        color: 'var(--color-red)',
        bg: 'rgba(239, 68, 68, 0.10)',
      }
    }

    if (leadScore >= 4 || recentlyActive) {
      return {
        label: 'Warmer Lead',
        icon: <Sun size={18} />,
        color: 'var(--color-orange)',
        bg: 'rgba(245, 158, 11, 0.10)',
      }
    }

    return {
      label: 'Kalter Lead',
      icon: <Snowflake size={18} />,
      color: 'var(--color-blue)',
      bg: 'rgba(79, 70, 229, 0.10)',
    }
  }, [lead.lead_score, lastActivityDate])

  // SVG progress ring calculations
  const ringSize = 80
  const strokeWidth = 6
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const maxScore = 7
  const normalizedScore = Math.min(engagementScore / maxScore, 1)
  const strokeDashoffset = circumference * (1 - normalizedScore)

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Score Analysis Card */}
      <div
        style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}
          >
            Score Analyse
          </h3>
          {/* Trend Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: 500,
              color: trend.color,
              background: trend.bg,
            }}
          >
            {trend.icon}
            {trend.label}
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {/* Progress Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Background circle */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--color-bg-tertiary)"
                  strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke={engagementColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
              </svg>
              {/* Score number in center */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: engagementColor,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {engagementScore.toFixed(1)}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                    marginTop: '2px',
                  }}
                >
                  von {maxScore}
                </span>
              </div>
            </div>

            {/* Score Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: '4px',
                }}
              >
                Engagement Score
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 1.5,
                }}
              >
                Basierend auf Kontaktdaten, Aktivitaeten und Erreichbarkeit.
              </div>

              {/* Sub-scores if available */}
              {(lead.pain_score !== null ||
                lead.fit_score !== null ||
                lead.buying_score !== null) && (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  {lead.pain_score !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: lead.pain_score >= 3 ? 'var(--color-red)' : 'var(--color-bg-tertiary)',
                        }}
                      />
                      Pain: {lead.pain_score}/5
                    </div>
                  )}
                  {lead.fit_score !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: lead.fit_score >= 3 ? 'var(--color-green)' : 'var(--color-bg-tertiary)',
                        }}
                      />
                      Fit: {lead.fit_score}/5
                    </div>
                  )}
                  {lead.buying_score !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: lead.buying_score >= 3 ? 'var(--color-orange)' : 'var(--color-bg-tertiary)',
                        }}
                      />
                      Buying: {lead.buying_score}/5
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Card */}
      {recommendations.length > 0 && (
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              Empfehlungen
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {recommendations.length} offen
            </span>
          </div>

          <div style={{ padding: '12px 16px' }}>
            {[...recommendations]
              .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
              .map((rec, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 8px',
                    borderBottom:
                      index < recommendations.length - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: rec.color,
                      background:
                        rec.color === 'var(--color-red)'
                          ? 'rgba(239, 68, 68, 0.10)'
                          : rec.color === 'var(--color-orange)'
                            ? 'rgba(245, 158, 11, 0.10)'
                            : rec.color === 'var(--color-blue)'
                              ? 'rgba(79, 70, 229, 0.10)'
                              : 'rgba(16, 185, 129, 0.10)',
                    }}
                  >
                    {rec.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        marginBottom: '2px',
                      }}
                    >
                      {rec.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {rec.description}
                    </div>
                  </div>

                  {/* Priority indicator */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 8px',
                      borderRadius: '100px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      flexShrink: 0,
                      color:
                        rec.priority === 'high'
                          ? 'var(--color-red)'
                          : rec.priority === 'medium'
                            ? 'var(--color-orange)'
                            : 'var(--color-text-tertiary)',
                      background:
                        rec.priority === 'high'
                          ? 'rgba(239, 68, 68, 0.10)'
                          : rec.priority === 'medium'
                            ? 'rgba(245, 158, 11, 0.10)'
                            : 'var(--color-bg-tertiary)',
                    }}
                  >
                    {rec.priority === 'high'
                      ? 'Hoch'
                      : rec.priority === 'medium'
                        ? 'Mittel'
                        : 'Niedrig'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state when no recommendations */}
      {recommendations.length === 0 && (
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              background: 'rgba(16, 185, 129, 0.10)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-green)',
            }}
          >
            <CheckCircle size={24} />
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '4px',
            }}
          >
            Alles im gruenen Bereich
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Keine offenen Empfehlungen fuer diesen Lead.
          </div>
        </div>
      )}
    </div>
  )
}
