'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  BarChart3,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface ReportsClientProps {
  leads: any[]
  deals: any[]
  activities: any[]
}

const STAGE_ORDER = ['discovery', 'qualification', 'proposal', 'negotiation', 'won']
const STAGE_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Gewonnen',
}
const STAGE_COLORS: Record<string, string> = {
  discovery: '#007AFF',
  qualification: '#AF52DE',
  proposal: '#FF9500',
  negotiation: '#FF3B30',
  won: '#34C759',
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: 'Notizen',
  call: 'Anrufe',
  email_sent: 'E-Mails gesendet',
  email_received: 'E-Mails erhalten',
  meeting: 'Meetings',
  linkedin_message: 'LinkedIn',
  follow_up: 'Follow-ups',
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  note: '#86868b',
  call: '#007AFF',
  email_sent: '#5AC8FA',
  email_received: '#AF52DE',
  meeting: '#FF9500',
  linkedin_message: '#0A66C2',
  follow_up: '#34C759',
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return value.toLocaleString('de-DE')
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}

function getLast6Months(): { label: string; start: Date; end: Date }[] {
  const months: { label: string; start: Date; end: Date }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    months.push({
      label: getMonthLabel(d),
      start: d,
      end,
    })
  }
  return months
}

function getLast6Weeks(): { label: string; start: Date; end: Date }[] {
  const weeks: { label: string; start: Date; end: Date }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const end = new Date(now)
    end.setDate(end.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    weeks.push({
      label: `KW ${getWeekNumber(end)}`,
      start,
      end,
    })
  }
  return weeks
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function ReportsClient({ leads, deals, activities }: ReportsClientProps) {
  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    const totalPipeline = deals
      .filter((d) => d.stage !== 'lost')
      .reduce((sum: number, d: any) => sum + (d.value || 0), 0)
    const wonDeals = deals.filter((d) => d.stage === 'won')
    const wonRevenue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
    const totalDeals = deals.filter((d) => d.stage !== 'lost').length
    const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0
    const avgDealSize = totalDeals > 0 ? totalPipeline / totalDeals : 0

    return { totalPipeline, wonRevenue, winRate, avgDealSize, wonCount: wonDeals.length, totalDeals }
  }, [deals])

  // ── Pipeline Funnel ──
  const funnelData = useMemo(() => {
    const data = STAGE_ORDER.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage)
      const value = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      return { stage, count: stageDeals.length, value }
    })
    const maxCount = Math.max(...data.map((d) => d.count), 1)
    return { data, maxCount }
  }, [deals])

  // ── Lead Source Analysis ──
  const sourceData = useMemo(() => {
    const sourceMap: Record<string, { total: number; qualified: number }> = {}
    leads.forEach((lead) => {
      const source = lead.source || 'Unbekannt'
      if (!sourceMap[source]) sourceMap[source] = { total: 0, qualified: 0 }
      sourceMap[source].total++
      if (lead.qualified) sourceMap[source].qualified++
    })
    const entries = Object.entries(sourceMap)
      .map(([source, data]) => ({
        source,
        total: data.total,
        qualified: data.qualified,
        conversionRate: data.total > 0 ? (data.qualified / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
    const maxTotal = Math.max(...entries.map((e) => e.total), 1)
    return { entries, maxTotal }
  }, [leads])

  // ── Time-based: Leads per month ──
  const leadsPerMonth = useMemo(() => {
    const months = getLast6Months()
    return months.map((m) => {
      const count = leads.filter((l) => {
        const d = new Date(l.created_at)
        return d >= m.start && d <= m.end
      }).length
      return { ...m, count }
    })
  }, [leads])

  const leadsMonthMax = Math.max(...leadsPerMonth.map((m) => m.count), 1)

  // ── Time-based: Deals closed per month ──
  const dealsPerMonth = useMemo(() => {
    const months = getLast6Months()
    return months.map((m) => {
      const monthDeals = deals.filter((d) => {
        if (d.stage !== 'won') return false
        const closed = new Date(d.updated_at || d.created_at)
        return closed >= m.start && closed <= m.end
      })
      const value = monthDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      return { ...m, count: monthDeals.length, value }
    })
  }, [deals])

  const dealsMonthMax = Math.max(...dealsPerMonth.map((m) => m.count), 1)

  // ── Vertical Performance ──
  const verticalData = useMemo(() => {
    const verticals: Record<
      string,
      { leadCount: number; qualifiedCount: number; totalScore: number; scoredCount: number; pipelineValue: number; wonValue: number }
    > = {}

    leads.forEach((lead) => {
      const v = lead.vertical || 'Ohne Zielgruppe'
      if (!verticals[v])
        verticals[v] = { leadCount: 0, qualifiedCount: 0, totalScore: 0, scoredCount: 0, pipelineValue: 0, wonValue: 0 }
      verticals[v].leadCount++
      if (lead.qualified) verticals[v].qualifiedCount++
      if (lead.lead_score != null) {
        verticals[v].totalScore += lead.lead_score
        verticals[v].scoredCount++
      }
    })

    deals.forEach((deal) => {
      const lead = leads.find((l: any) => l.id === deal.lead_id)
      const v = lead?.vertical || 'Ohne Zielgruppe'
      if (!verticals[v])
        verticals[v] = { leadCount: 0, qualifiedCount: 0, totalScore: 0, scoredCount: 0, pipelineValue: 0, wonValue: 0 }
      if (deal.stage !== 'lost') verticals[v].pipelineValue += deal.value || 0
      if (deal.stage === 'won') verticals[v].wonValue += deal.value || 0
    })

    return Object.entries(verticals)
      .map(([name, data]) => ({
        name,
        leadCount: data.leadCount,
        qualifiedPct: data.leadCount > 0 ? (data.qualifiedCount / data.leadCount) * 100 : 0,
        avgScore: data.scoredCount > 0 ? data.totalScore / data.scoredCount : 0,
        pipelineValue: data.pipelineValue,
        wonValue: data.wonValue,
      }))
      .sort((a, b) => b.pipelineValue - a.pipelineValue)
  }, [leads, deals])

  // ── Activity Summary ──
  const activityTypeData = useMemo(() => {
    const typeMap: Record<string, number> = {}
    activities.forEach((a) => {
      const t = a.type || 'other'
      typeMap[t] = (typeMap[t] || 0) + 1
    })
    const entries = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
    const total = entries.reduce((s, e) => s + e.count, 0)
    const maxCount = Math.max(...entries.map((e) => e.count), 1)
    return { entries, total, maxCount }
  }, [activities])

  const activityWeekData = useMemo(() => {
    const weeks = getLast6Weeks()
    return weeks.map((w) => {
      const count = activities.filter((a) => {
        const d = new Date(a.created_at)
        return d >= w.start && d <= w.end
      }).length
      return { ...w, count }
    })
  }, [activities])

  const activityWeekMax = Math.max(...activityWeekData.map((w) => w.count), 1)

  // ── Shared styles ──
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg)',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  }

  const cardHeaderStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }

  const cardBodyStyle: React.CSSProperties = {
    padding: '24px',
  }

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div>
      {/* ═══════════ 1. KPI Overview Row ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Pipeline Value */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span className="stat-label">Pipeline-Wert</span>
            <div
              className="stat-icon"
              style={{ background: 'rgba(0, 122, 255, 0.1)' }}
            >
              <BarChart3 size={22} style={{ color: '#007AFF' }} />
            </div>
          </div>
          <div className="stat-value">{'\u20AC'}{formatCurrency(kpis.totalPipeline)}</div>
          <div
            className="stat-change positive"
            style={{ marginTop: '12px' }}
          >
            <ArrowUpRight size={14} />
            {kpis.totalDeals} Deals aktiv
          </div>
        </div>

        {/* Won Revenue */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span className="stat-label">Gewonnener Umsatz</span>
            <div
              className="stat-icon"
              style={{ background: 'rgba(52, 199, 89, 0.1)' }}
            >
              <DollarSign size={22} style={{ color: '#34C759' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#34C759' }}>{'\u20AC'}{formatCurrency(kpis.wonRevenue)}</div>
          <div className="stat-change positive" style={{ marginTop: '12px' }}>
            <ArrowUpRight size={14} />
            {kpis.wonCount} Deals gewonnen
          </div>
        </div>

        {/* Win Rate */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span className="stat-label">Win Rate</span>
            <div
              className="stat-icon"
              style={{ background: 'rgba(175, 82, 222, 0.1)' }}
            >
              <Target size={22} style={{ color: '#AF52DE' }} />
            </div>
          </div>
          <div className="stat-value">{kpis.winRate.toFixed(1)}%</div>
          <div
            className={`stat-change ${kpis.winRate >= 25 ? 'positive' : 'negative'}`}
            style={{ marginTop: '12px' }}
          >
            {kpis.winRate >= 25 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {kpis.wonCount} von {kpis.totalDeals}
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span className="stat-label">{'\u00D8'} Deal-Gr{'\u00F6'}{'\u00DF'}e</span>
            <div
              className="stat-icon"
              style={{ background: 'rgba(255, 149, 0, 0.1)' }}
            >
              <TrendingUp size={22} style={{ color: '#FF9500' }} />
            </div>
          </div>
          <div className="stat-value">{'\u20AC'}{formatCurrency(kpis.avgDealSize)}</div>
          <div className="stat-change positive" style={{ marginTop: '12px' }}>
            <DollarSign size={14} />
            Pro Deal
          </div>
        </div>
      </div>

      {/* ═══════════ 2. Pipeline Funnel ═══════════ */}
      <div style={{ ...cardStyle, marginBottom: '32px' }}>
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>
            <BarChart3 size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            Pipeline-Funnel
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            {deals.filter((d) => d.stage !== 'lost').length} Deals gesamt
          </span>
        </div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {funnelData.data.map((item) => (
              <div key={item.stage} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Stage label */}
                <div style={{ width: '120px', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                    {STAGE_LABELS[item.stage]}
                  </div>
                </div>

                {/* Bar */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <div
                    style={{
                      height: '36px',
                      background: 'var(--color-bg-secondary)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max((item.count / funnelData.maxCount) * 100, item.count > 0 ? 8 : 0)}%`,
                        background: `linear-gradient(90deg, ${STAGE_COLORS[item.stage]}, ${STAGE_COLORS[item.stage]}dd)`,
                        borderRadius: '10px',
                        transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '14px',
                        minWidth: item.count > 0 ? '60px' : '0',
                      }}
                    >
                      {item.count > 0 && (
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Value */}
                <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {'\u20AC'}{formatCurrency(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 3. Lead Source Analysis ═══════════ */}
      <div style={{ ...cardStyle, marginBottom: '32px' }}>
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>
            <Users size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            Lead-Quellen Analyse
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            {leads.length} Leads gesamt
          </span>
        </div>
        <div style={cardBodyStyle}>
          {sourceData.entries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sourceData.entries.map((item, index) => {
                const barColors = ['#007AFF', '#AF52DE', '#FF9500', '#34C759', '#FF3B30', '#5AC8FA', '#86868b']
                const color = barColors[index % barColors.length]
                return (
                  <div key={item.source}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                          {item.source}
                        </span>
                        <span className="badge badge-default">{item.total} Leads</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: item.conversionRate >= 50 ? '#34C759' : item.conversionRate >= 25 ? '#FF9500' : 'var(--color-text-tertiary)',
                          }}
                        >
                          {item.conversionRate.toFixed(0)}% Konversion
                        </span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div style={{ height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(item.total / sourceData.maxTotal) * 100}%`,
                          background: color,
                          borderRadius: '100px',
                          transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
              Keine Lead-Quellen vorhanden
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ 4. Time-based Analysis (2 columns) ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Leads per Month */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardTitleStyle}>
              <Calendar size={18} style={{ color: 'var(--color-text-tertiary)' }} />
              Neue Leads pro Monat
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px' }}>
              {leadsPerMonth.map((m) => (
                <div
                  key={m.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* Count label */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginBottom: '6px',
                    }}
                  >
                    {m.count > 0 ? m.count : ''}
                  </span>
                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: `${Math.max((m.count / leadsMonthMax) * 140, m.count > 0 ? 8 : 4)}px`,
                      background: m.count > 0
                        ? 'linear-gradient(180deg, #007AFF, #007AFFcc)'
                        : 'var(--color-bg-tertiary)',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  />
                  {/* Month label */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--color-text-tertiary)',
                      marginTop: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deals closed per Month */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardTitleStyle}>
              <DollarSign size={18} style={{ color: 'var(--color-text-tertiary)' }} />
              Gewonnene Deals pro Monat
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px' }}>
              {dealsPerMonth.map((m) => (
                <div
                  key={m.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* Count + value label */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#34C759',
                      marginBottom: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.count > 0 ? `${m.count}` : ''}
                  </span>
                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: `${Math.max((m.count / dealsMonthMax) * 140, m.count > 0 ? 8 : 4)}px`,
                      background: m.count > 0
                        ? 'linear-gradient(180deg, #34C759, #34C759cc)'
                        : 'var(--color-bg-tertiary)',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  />
                  {/* Month label */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--color-text-tertiary)',
                      marginTop: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ 5. Vertical Performance ═══════════ */}
      <div style={{ ...cardStyle, marginBottom: '32px' }}>
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>
            <Target size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            Zielgruppen-Performance
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            {verticalData.length} Zielgruppen
          </span>
        </div>
        <div style={{ overflow: 'auto' }}>
          {verticalData.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    Zielgruppe
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    Leads
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    Qualifiziert
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    {'\u00D8'} Score
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    Pipeline
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'var(--color-bg-secondary)' }}>
                    Gewonnen
                  </th>
                </tr>
              </thead>
              <tbody>
                {verticalData.map((v) => (
                  <tr
                    key={v.name}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#AF52DE',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                          {v.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {v.leadCount}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <span
                        className="badge"
                        style={{
                          background: v.qualifiedPct >= 50 ? 'rgba(52, 199, 89, 0.12)' : v.qualifiedPct >= 25 ? 'rgba(255, 149, 0, 0.12)' : 'var(--color-bg-tertiary)',
                          color: v.qualifiedPct >= 50 ? '#34C759' : v.qualifiedPct >= 25 ? '#FF9500' : 'var(--color-text-secondary)',
                        }}
                      >
                        {v.qualifiedPct.toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: v.avgScore >= 7 ? '#34C759' : v.avgScore >= 5 ? '#FF9500' : 'var(--color-text-tertiary)',
                          }}
                        >
                          {v.avgScore > 0 ? v.avgScore.toFixed(1) : '–'}
                        </span>
                        {v.avgScore > 0 && (
                          <div style={{ width: '40px', height: '5px', background: 'var(--color-bg-tertiary)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${(v.avgScore / 10) * 100}%`,
                                background: v.avgScore >= 7 ? '#34C759' : v.avgScore >= 5 ? '#FF9500' : 'var(--color-bg-tertiary)',
                                borderRadius: '100px',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#007AFF' }}>
                      {v.pipelineValue > 0 ? `\u20AC${formatCurrency(v.pipelineValue)}` : '–'}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#34C759' }}>
                      {v.wonValue > 0 ? `\u20AC${formatCurrency(v.wonValue)}` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
              Keine Zielgruppen-Daten vorhanden
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ 6. Activity Summary (2 columns) ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Activity Types Distribution */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardTitleStyle}>
              <Activity size={18} style={{ color: 'var(--color-text-tertiary)' }} />
              Aktivit{'\u00E4'}ten nach Typ
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              {activityTypeData.total} gesamt
            </span>
          </div>
          <div style={cardBodyStyle}>
            {activityTypeData.entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activityTypeData.entries.map((item) => {
                  const color = ACTIVITY_TYPE_COLORS[item.type] || '#86868b'
                  const label = ACTIVITY_TYPE_LABELS[item.type] || item.type
                  const pct = activityTypeData.total > 0 ? (item.count / activityTypeData.total) * 100 : 0
                  return (
                    <div key={item.type}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                            {item.count}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: 'var(--color-bg-secondary)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(item.count / activityTypeData.maxCount) * 100}%`,
                            background: color,
                            borderRadius: '100px',
                            transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
                Keine Aktivit{'\u00E4'}ten vorhanden
              </div>
            )}
          </div>
        </div>

        {/* Activities per Week Trend */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardTitleStyle}>
              <Calendar size={18} style={{ color: 'var(--color-text-tertiary)' }} />
              Aktivit{'\u00E4'}ten pro Woche
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px' }}>
              {activityWeekData.map((w) => (
                <div
                  key={w.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* Count */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginBottom: '6px',
                    }}
                  >
                    {w.count > 0 ? w.count : ''}
                  </span>
                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: `${Math.max((w.count / activityWeekMax) * 140, w.count > 0 ? 8 : 4)}px`,
                      background: w.count > 0
                        ? 'linear-gradient(180deg, #AF52DE, #AF52DEcc)'
                        : 'var(--color-bg-tertiary)',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  />
                  {/* Week label */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--color-text-tertiary)',
                      marginTop: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
