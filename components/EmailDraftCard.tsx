'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Mail,
  Copy,
  ExternalLink,
  Edit3,
  RefreshCw,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react'

interface EmailDraftCardProps {
  emailActivity: any | null
  lead: {
    id: string
    name: string
    email?: string | null
  }
}

export function EmailDraftCard({ emailActivity, lead }: EmailDraftCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const emailDraft = emailActivity?.metadata?.email_draft
  const [editSubject, setEditSubject] = useState(emailDraft?.subject || '')
  const [editBody, setEditBody] = useState(emailDraft?.body || '')

  if (!emailActivity || !emailDraft) return null

  const subject = emailDraft.subject || ''
  const body = emailDraft.body || ''

  const handleCopy = async () => {
    const text = `Betreff: ${isEditing ? editSubject : subject}\n\n${isEditing ? editBody : body}`
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)

      // Log activity
      await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'email_sent',
        subject: `E-Mail kopiert: ${isEditing ? editSubject : subject}`,
        body: isEditing ? editBody : body,
        metadata: { action: 'clipboard_copy' },
        created_by: 'system',
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleMailto = async () => {
    if (!lead.email) return
    const currentSubject = isEditing ? editSubject : subject
    const currentBody = isEditing ? editBody : body
    const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(currentSubject)}&body=${encodeURIComponent(currentBody)}`
    window.open(mailtoUrl, '_blank')

    // Log activity
    await supabase.from('activities').insert({
      lead_id: lead.id,
      type: 'email_sent',
      subject: `E-Mail geoeffnet in Mail: ${currentSubject}`,
      body: currentBody,
      metadata: { action: 'mailto_opened', recipient: lead.email },
      created_by: 'system',
      created_at: new Date().toISOString(),
    })
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      router.refresh()
    } catch (err) {
      console.error('Regeneration failed:', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleEdit = () => {
    setEditSubject(subject)
    setEditBody(body)
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedMetadata = {
        ...emailActivity.metadata,
        email_draft: {
          ...emailDraft,
          subject: editSubject,
          body: editBody,
          edited_at: new Date().toISOString(),
        },
      }

      await supabase
        .from('activities')
        .update({
          subject: editSubject,
          body: editBody,
          metadata: updatedMetadata,
        })
        .eq('id', emailActivity.id)

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditSubject(subject)
    setEditBody(body)
    setIsEditing(false)
  }

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle gradient accent at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, var(--color-purple), var(--color-blue))',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}
      />

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
              color: 'var(--color-purple)',
              background: 'rgba(129, 140, 248, 0.10)',
            }}
          >
            <Sparkles size={16} />
          </div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}
          >
            Personalisierte E-Mail
          </h3>
        </div>

        {/* Personalization hooks badge */}
        {emailDraft.personalization_hooks?.length > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--color-purple)',
              background: 'rgba(129, 140, 248, 0.08)',
            }}
          >
            <Sparkles size={12} />
            {emailDraft.personalization_hooks.length} Datenpunkte
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '24px' }}>
        {/* Recipient */}
        {lead.email && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            <Mail size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
              An:
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
              {lead.email}
            </span>
          </div>
        )}

        {isEditing ? (
          /* ===== Edit Mode ===== */
          <div>
            {/* Subject Input */}
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Betreff
              </label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-purple)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                }}
              />
            </div>

            {/* Body Textarea */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Nachricht
              </label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-purple)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                }}
              />
            </div>

            {/* Edit Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-purple)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Check size={14} />
                )}
                Speichern
              </button>
            </div>
          </div>
        ) : (
          /* ===== Preview Mode ===== */
          <div>
            {/* Subject Line */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '6px',
                }}
              >
                Betreff
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {subject}
              </div>
            </div>

            {/* Email Body */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                marginBottom: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.7,
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {body}
              </p>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {/* Copy to Clipboard */}
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg)',
                  color: isCopied ? 'var(--color-green)' : 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)'
                }}
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                {isCopied ? 'Kopiert' : 'In Zwischenablage'}
              </button>

              {/* Open in Mail */}
              {lead.email && (
                <button
                  onClick={handleMailto}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg)'
                  }}
                >
                  <ExternalLink size={14} />
                  In Mail oeffnen
                </button>
              )}

              {/* Edit */}
              <button
                onClick={handleEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)'
                }}
              >
                <Edit3 size={14} />
                Bearbeiten
              </button>

              {/* Regenerate */}
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'rgba(129, 140, 248, 0.10)',
                  color: 'var(--color-purple)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  opacity: isRegenerating ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isRegenerating) {
                    e.currentTarget.style.background = 'rgba(129, 140, 248, 0.18)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(129, 140, 248, 0.10)'
                }}
              >
                {isRegenerating ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                Neu generieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
