'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { getDirectiveContent } from '@/lib/actions'
import {
  FileText,
  Loader2,
  ExternalLink,
  Users,
  Zap,
  MessageSquare,
  ShieldAlert,
  Phone,
  Target,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface DirectiveViewerProps {
  directivePath: string
  verticalName: string
}

interface ParsedDirective {
  title: string
  subtitle: string
  targetDealSize: string
  icp: string[]
  painSignals: string[]
  disqualifiers: string[]
  valueProposition: string
  workflows: { title: string; description: string; timeBack: string }[]
  outreachTemplates: { type: string; content: string }[]
  discoveryCallScript: string[]
  objectionHandling: { objection: string; response: string }[]
  rawContent: string
}

export function DirectiveViewer({ directivePath, verticalName }: DirectiveViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [parsedContent, setParsedContent] = useState<ParsedDirective | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'scripts' | 'objections'>('overview')

  const handleOpen = async () => {
    setIsOpen(true)
    setIsLoading(true)
    setError(null)

    const result = await getDirectiveContent(directivePath)

    if (result.success && result.content) {
      setContent(result.content)
      setParsedContent(parseDirective(result.content))
    } else {
      setError(result.error || 'Fehler beim Laden')
    }

    setIsLoading(false)
  }

  const fileName = directivePath.split('/').pop() || directivePath

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: Target },
    { id: 'workflows', label: 'Workflows', icon: Zap },
    { id: 'scripts', label: 'Sales-Skripte', icon: MessageSquare },
    { id: 'objections', label: 'Einwände', icon: ShieldAlert },
  ] as const

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid transparent',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'all 0.2s'
        }}
        className="hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]"
      >
        <FileText size={16} style={{ color: '#4F46E5', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#4F46E5', flex: 1, fontWeight: 500 }}>
          Kundenprofil ansehen
        </span>
        <ExternalLink size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`${verticalName} - Sales Playbook`}
        size="lg"
      >
        <div style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#4F46E5' }} />
            </div>
          )}

          {error && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              {error}
            </div>
          )}

          {parsedContent && !isLoading && (
            <>
              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '16px 0',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: '20px',
                flexShrink: 0
              }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? '#4F46E5' : 'var(--color-bg-secondary)',
                        color: isActive ? 'white' : 'var(--color-text-secondary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                {activeTab === 'overview' && (
                  <OverviewTab data={parsedContent} />
                )}
                {activeTab === 'workflows' && (
                  <WorkflowsTab data={parsedContent} />
                )}
                {activeTab === 'scripts' && (
                  <ScriptsTab data={parsedContent} />
                )}
                {activeTab === 'objections' && (
                  <ObjectionsTab data={parsedContent} />
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

// Parse the markdown content into structured data
function parseDirective(content: string): ParsedDirective {
  const lines = content.split('\n')

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1] : 'Kundenprofil'

  // Extract subtitle (target vertical from blockquote)
  const subtitleMatch = content.match(/\*\*Vertical:\*\*\s*(.+)/i)
  const subtitle = subtitleMatch ? subtitleMatch[1] : ''

  // Extract target deal size
  const dealSizeMatch = content.match(/\*\*Target Deal Size:\*\*\s*(.+)/i)
  const targetDealSize = dealSizeMatch ? dealSizeMatch[1] : ''

  // Extract ICP points
  const icp: string[] = []
  const icpSection = content.match(/ICP-Definition[\s\S]*?(?=##|---)/i)
  if (icpSection) {
    const icpMatches = icpSection[0].match(/\*\*[^*]+\*\*:\s*[^\n]+/g)
    if (icpMatches) {
      icp.push(...icpMatches.map(m => m.replace(/\*\*/g, '')))
    }
  }

  // Extract pain signals
  const painSignals: string[] = []
  const painSection = content.match(/Pain Signals[\s\S]*?(?=Disqualification|##|---)/i)
  if (painSection) {
    const painMatches = painSection[0].match(/✅[^\n]+/g)
    if (painMatches) {
      painSignals.push(...painMatches.map(m => m.replace('✅', '').trim()))
    }
  }

  // Extract disqualifiers
  const disqualifiers: string[] = []
  const disqualSection = content.match(/Disqualification[\s\S]*?(?=##|---)/i)
  if (disqualSection) {
    const disqualMatches = disqualSection[0].match(/❌[^\n]+/g)
    if (disqualMatches) {
      disqualifiers.push(...disqualMatches.map(m => m.replace('❌', '').trim()))
    }
  }

  // Extract value proposition
  const vpMatch = content.match(/Kernbotschaft:[\s\S]*?>\s*"([^"]+)"/i) ||
                  content.match(/Kernbotschaft[\s\S]*?>\s*(.+)/i)
  const valueProposition = vpMatch ? vpMatch[1].replace(/"/g, '') : ''

  // Extract workflows
  const workflows: { title: string; description: string; timeBack: string }[] = []
  const workflowMatches = content.matchAll(/###\s*Workflow\s*\d+:\s*([^\n]+)[\s\S]*?(?=###|##|---)/gi)
  for (const match of workflowMatches) {
    const title = match[1].replace(/\([^)]+\)/g, '').trim()
    const timeMatch = match[0].match(/\((\d+-?\d*h\/Woche[^)]*)\)/i)
    const timeBack = timeMatch ? timeMatch[1] : ''

    // Extract bullet points as description
    const bullets = match[0].match(/-\s+[^\n]+/g)
    const description = bullets ? bullets.slice(0, 3).map(b => b.replace(/^-\s+/, '')).join('\n') : ''

    workflows.push({ title, description, timeBack })
  }

  // Extract outreach templates
  const outreachTemplates: { type: string; content: string }[] = []

  // LinkedIn Connection Request
  const linkedinMatch = content.match(/LinkedIn Connection Request[\s\S]*?```([^`]+)```/i)
  if (linkedinMatch) {
    outreachTemplates.push({
      type: 'LinkedIn Connection',
      content: linkedinMatch[1].trim()
    })
  }

  // Follow-up Message
  const followupMatch = content.match(/Follow-up Message[\s\S]*?```([^`]+)```/i)
  if (followupMatch) {
    outreachTemplates.push({
      type: 'Follow-up (3 Tage)',
      content: followupMatch[1].trim()
    })
  }

  // Cold Email
  const coldEmailMatch = content.match(/Cold Email[\s\S]*?Body:\s*```([^`]+)```/i)
  if (coldEmailMatch) {
    outreachTemplates.push({
      type: 'Cold Email',
      content: coldEmailMatch[1].trim()
    })
  }

  // Extract discovery call script
  const discoveryCallScript: string[] = []
  const callSection = content.match(/Discovery Call[\s\S]*?(?=##\s*\d+\.|---)/i)
  if (callSection) {
    // Extract key questions
    const questionMatches = callSection[0].match(/-\s*"[^"]+"/g)
    if (questionMatches) {
      discoveryCallScript.push(...questionMatches.map(q => q.replace(/^-\s*"?|"?$/g, '')))
    }

    // Also extract script blocks
    const scriptBlocks = callSection[0].match(/```([^`]+)```/g)
    if (scriptBlocks) {
      scriptBlocks.forEach(block => {
        discoveryCallScript.push(block.replace(/```/g, '').trim())
      })
    }
  }

  // Extract objection handling
  const objectionHandling: { objection: string; response: string }[] = []
  const objectionSection = content.match(/Objection Handling[\s\S]*?(?=##\s*\d+\.|---)/i)
  if (objectionSection) {
    const objectionBlocks = objectionSection[0].matchAll(/###\s*"([^"]+)"[\s\S]*?```([^`]+)```/gi)
    for (const match of objectionBlocks) {
      objectionHandling.push({
        objection: match[1],
        response: match[2].trim()
      })
    }
  }

  return {
    title,
    subtitle,
    targetDealSize,
    icp,
    painSignals,
    disqualifiers,
    valueProposition,
    workflows,
    outreachTemplates,
    discoveryCallScript,
    objectionHandling,
    rawContent: content
  }
}

// Overview Tab Component
function OverviewTab({ data }: { data: ParsedDirective }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Value Proposition */}
      {data.valueProposition && (
        <div style={{
          padding: '20px',
          background: 'rgba(79, 70, 229, 0.08)',
          borderRadius: '16px',
          borderLeft: '4px solid #4F46E5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Target size={18} style={{ color: '#4F46E5' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase' }}>
              Kernbotschaft
            </span>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
            "{data.valueProposition}"
          </p>
        </div>
      )}

      {/* Target Deal & Quick Stats */}
      {data.targetDealSize && (
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{
            flex: 1,
            padding: '16px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={20} style={{ color: '#10B981' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Target Deal Size</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#10B981', margin: 0 }}>{data.targetDealSize}</p>
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: '16px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(129, 140, 248, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: '#818CF8' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Zeitersparnis</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#818CF8', margin: 0 }}>15-23h/Woche</p>
            </div>
          </div>
        </div>
      )}

      {/* ICP */}
      {data.icp.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Users size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              Ideal Customer Profile (ICP)
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.icp.slice(0, 6).map((item, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: '10px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pain Signals & Disqualifiers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Pain Signals */}
        {data.painSignals.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <CheckCircle2 size={16} style={{ color: '#10B981' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#10B981', margin: 0 }}>Pain Signals</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.painSignals.map((signal, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4
                }}>
                  ✅ {signal}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disqualifiers */}
        {data.disqualifiers.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <XCircle size={16} style={{ color: '#EF4444' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444', margin: 0 }}>Disqualifiers</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.disqualifiers.map((item, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4
                }}>
                  ❌ {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Workflows Tab Component
function WorkflowsTab({ data }: { data: ParsedDirective }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', margin: 0 }}>
        Diese Workflows können wir automatisieren, um Zeit zurückzugewinnen:
      </p>

      {data.workflows.length > 0 ? (
        data.workflows.map((workflow, i) => (
          <div key={i} style={{
            padding: '20px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(129, 140, 248, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 600, color: '#818CF8'
                }}>
                  {i + 1}
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {workflow.title}
                </h4>
              </div>
              {workflow.timeBack && (
                <span style={{
                  padding: '6px 12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#10B981'
                }}>
                  {workflow.timeBack}
                </span>
              )}
            </div>
            {workflow.description && (
              <div style={{ paddingLeft: '48px' }}>
                {workflow.description.split('\n').map((line, j) => (
                  <p key={j} style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    margin: '8px 0',
                    paddingLeft: '12px',
                    borderLeft: '2px solid var(--color-border)',
                    lineHeight: 1.5
                  }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Workflows werden noch hinzugefügt</p>
        </div>
      )}

      {/* Total Time Savings */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
          Gesamt-Zeitersparnis:
        </span>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
          15-23 Stunden/Woche
        </span>
      </div>
    </div>
  )
}

// Scripts Tab Component
function ScriptsTab({ data }: { data: ParsedDirective }) {
  const [activeScript, setActiveScript] = useState(0)

  const allScripts = [
    ...data.outreachTemplates,
    ...(data.discoveryCallScript.length > 0 ? [{
      type: 'Discovery Call',
      content: data.discoveryCallScript.join('\n\n')
    }] : [])
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', margin: 0 }}>
        Kopiere diese Templates für deine Outreach-Aktivitäten:
      </p>

      {allScripts.length > 0 ? (
        <>
          {/* Script Selector */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allScripts.map((script, i) => (
              <button
                key={i}
                onClick={() => setActiveScript(i)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  border: activeScript === i ? '1px solid #4F46E5' : '1px solid var(--color-border)',
                  background: activeScript === i ? 'rgba(79, 70, 229, 0.1)' : 'var(--color-bg)',
                  color: activeScript === i ? '#4F46E5' : 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {script.type}
              </button>
            ))}
          </div>

          {/* Script Content */}
          <div style={{
            padding: '20px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                {allScripts[activeScript]?.type}
              </h4>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(allScripts[activeScript]?.content || '')
                }}
                style={{
                  padding: '6px 12px',
                  background: '#4F46E5',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Kopieren
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '16px',
              background: 'var(--color-bg)',
              borderRadius: '12px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit'
            }}>
              {allScripts[activeScript]?.content}
            </pre>
          </div>
        </>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Sales-Skripte werden noch hinzugefügt</p>
        </div>
      )}

      {/* Discovery Call Tips */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(245, 158, 11, 0.1)',
        borderRadius: '12px',
        borderLeft: '4px solid #F59E0B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Phone size={16} style={{ color: '#F59E0B' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#F59E0B' }}>Discovery Call Tipps</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <li>Immer Fragen stellen, nicht pitchen</li>
          <li>Pain quantifizieren: "Wie viele Stunden pro Woche?"</li>
          <li>ROI berechnen: Zeitersparnis × Stundensatz</li>
        </ul>
      </div>
    </div>
  )
}

// Objections Tab Component
function ObjectionsTab({ data }: { data: ParsedDirective }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', margin: 0 }}>
        Typische Einwände und wie du sie entkräftest:
      </p>

      {data.objectionHandling.length > 0 ? (
        data.objectionHandling.map((item, i) => (
          <div key={i} style={{
            padding: '20px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <ShieldAlert size={18} style={{ color: '#F59E0B' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                "{item.objection}"
              </h4>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: '12px',
              borderLeft: '3px solid #10B981'
            }}>
              <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, marginBottom: '8px' }}>
                ANTWORT:
              </p>
              <pre style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}>
                {item.response}
              </pre>
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          <ShieldAlert size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Objection Handling wird noch hinzugefügt</p>
        </div>
      )}

      {/* General Tips */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(79, 70, 229, 0.08)',
        borderRadius: '12px'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#4F46E5', marginBottom: '12px' }}>
          Allgemeine Tipps bei Einwänden:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          <li><strong>Erst verstehen:</strong> "Verstehe ich richtig, dass...?"</li>
          <li><strong>Validieren:</strong> "Das ist ein guter Punkt..."</li>
          <li><strong>Reframen:</strong> "Lass mich anders fragen..."</li>
          <li><strong>ROI zeigen:</strong> Immer mit konkreten Zahlen argumentieren</li>
        </ul>
      </div>
    </div>
  )
}
