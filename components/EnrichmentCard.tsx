'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'

interface EnrichmentCardProps {
  enrichmentActivity: any | null
  leadId: string
}

export function EnrichmentCard({ enrichmentActivity, leadId }: EnrichmentCardProps) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)

  if (!enrichmentActivity) return null

  const enrichment = enrichmentActivity.metadata?.enrichment
  if (!enrichment) return null

  const status = enrichment.status as 'complete' | 'partial' | 'failed'
  const enrichedAt = enrichment.enriched_at || enrichmentActivity.created_at

  const statusConfig = {
    complete: {
      label: 'Vollständig',
      color: 'var(--color-green)',
      bg: 'rgba(16, 185, 129, 0.10)',
      icon: <CheckCircle size={14} />,
    },
    partial: {
      label: 'Teilweise gefunden',
      color: 'var(--color-orange)',
      bg: 'rgba(245, 158, 11, 0.10)',
      icon: <CheckCircle size={14} />,
    },
    failed: {
      label: 'Fehlgeschlagen',
      color: 'var(--color-red)',
      bg: 'rgba(239, 68, 68, 0.10)',
      icon: <XCircle size={14} />,
    },
  }

  const currentStatus = statusConfig[status] || statusConfig.failed

  const handleReEnrich = async () => {
    setIsEnriching(true)
    try {
      await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      router.refresh()
    } catch (err) {
      console.error('Re-enrichment failed:', err)
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-blue)',
              background: 'rgba(79, 70, 229, 0.10)',
            }}
          >
            <Globe size={16} />
          </div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}
          >
            Recherche
          </h3>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '100px',
            fontSize: '11px',
            fontWeight: 600,
            color: currentStatus.color,
            background: currentStatus.bg,
          }}
        >
          {currentStatus.icon}
          {currentStatus.label}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* Company Description */}
        {enrichment.company_description && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <Building2 size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Unternehmen
              </span>
            </div>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {enrichment.company_description}
            </p>
          </div>
        )}

        {/* Business Processes */}
        {enrichment.business_processes && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <RefreshCw size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Geschäftsprozesse
              </span>
            </div>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {enrichment.business_processes}
            </p>
          </div>
        )}

        {/* Found Contact Data */}
        {(enrichment.all_emails_found?.length > 0 || enrichment.all_phones_found?.length > 0) && (
          <div
            style={{
              marginBottom: '16px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                display: 'block',
                marginBottom: '10px',
              }}
            >
              Gefundene Kontaktdaten
            </span>

            {/* Emails */}
            {enrichment.all_emails_found?.map((entry: any, idx: number) => {
              // Support both old format (string) and new format ({ value, source })
              const email = typeof entry === 'string' ? entry : entry.value
              const source = typeof entry === 'string' ? null : entry.source
              const sourceConfig = source === 'website'
                ? { label: 'Website', color: 'var(--color-green)', bg: 'rgba(16, 185, 129, 0.10)', icon: <ShieldCheck size={10} /> }
                : source === 'ai'
                  ? { label: 'KI-Recherche', color: 'var(--color-orange)', bg: 'rgba(245, 158, 11, 0.10)', icon: <AlertTriangle size={10} /> }
                  : source === 'existing'
                    ? { label: 'Vorhanden', color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)', icon: null }
                    : null

              return (
                <div
                  key={`email-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 0',
                    borderBottom:
                      idx < enrichment.all_emails_found.length - 1 ||
                      enrichment.all_phones_found?.length > 0
                        ? '1px solid var(--color-border)'
                        : 'none',
                  }}
                >
                  <Mail size={14} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {email}
                  </span>
                  {sourceConfig && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '100px',
                        color: sourceConfig.color,
                        background: sourceConfig.bg,
                        flexShrink: 0,
                      }}
                    >
                      {sourceConfig.icon}
                      {sourceConfig.label}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Phones */}
            {enrichment.all_phones_found?.map((entry: any, idx: number) => {
              const phone = typeof entry === 'string' ? entry : entry.value
              const source = typeof entry === 'string' ? null : entry.source
              const sourceConfig = source === 'website'
                ? { label: 'Website', color: 'var(--color-green)', bg: 'rgba(16, 185, 129, 0.10)', icon: <ShieldCheck size={10} /> }
                : source === 'ai'
                  ? { label: 'KI-Recherche', color: 'var(--color-orange)', bg: 'rgba(245, 158, 11, 0.10)', icon: <AlertTriangle size={10} /> }
                  : source === 'existing'
                    ? { label: 'Vorhanden', color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)', icon: null }
                    : null

              return (
                <div
                  key={`phone-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 0',
                    borderBottom:
                      idx < enrichment.all_phones_found.length - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                  }}
                >
                  <Phone size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      flex: 1,
                    }}
                  >
                    {phone}
                  </span>
                  {sourceConfig && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '100px',
                        color: sourceConfig.color,
                        background: sourceConfig.bg,
                        flexShrink: 0,
                      }}
                    >
                      {sourceConfig.icon}
                      {sourceConfig.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Enriched At Timestamp */}
        {enrichedAt && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-tertiary)',
              marginBottom: '16px',
            }}
          >
            Angereichert am{' '}
            {new Date(enrichedAt).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Re-enrich Button */}
        <button
          onClick={handleReEnrich}
          disabled={isEnriching}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-strong)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isEnriching ? 'not-allowed' : 'pointer',
            opacity: isEnriching ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isEnriching) {
              e.currentTarget.style.background = 'var(--color-bg-secondary)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg)'
          }}
        >
          {isEnriching ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <RefreshCw size={16} />
          )}
          Neu anreichern
        </button>
      </div>
    </div>
  )
}
