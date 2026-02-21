import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { DirectiveViewer } from '@/components/DirectiveViewer'
import {
  Target,
  Settings,
  Users,
  DollarSign,
  Building2,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

export default async function VerticalsPage() {
  const { data: verticals, error } = await supabase
    .from('verticals')
    .select('*')
    .order('name')

  // Count leads per vertical
  const { data: leadCounts } = await supabase
    .from('leads')
    .select('vertical')
    .is('deleted_at', null)

  const verticalLeadCounts = leadCounts?.reduce((acc, l) => {
    if (l.vertical) {
      acc[l.vertical] = (acc[l.vertical] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>) || {}

  const activeVerticals = verticals?.filter(v => v.active).length || 0
  const totalVerticals = verticals?.length || 0
  const totalLeadsInVerticals = Object.values(verticalLeadCounts).reduce((sum, count) => sum + count, 0)

  // Color palette for verticals
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#818CF8', '#EF4444', '#60A5FA', '#EF4444', '#60A5FA']

  return (
    <>
      <Header
        title="Verticals"
        subtitle={`${activeVerticals} aktive Zielgruppen`}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ maxWidth: '780px', marginBottom: '36px' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Gesamt</span>
              <div className="stat-icon stat-icon-blue">
                <Target size={20} />
              </div>
            </div>
            <div className="stat-value">{totalVerticals}</div>
            <p className="stat-subtitle">Zielgruppen</p>
          </div>
          <div className="stat-card" style={{ '--stat-accent': '#10B981' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Aktiv</span>
              <div className="stat-icon stat-icon-green">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#10B981' }}>{activeVerticals}</div>
            <p className="stat-subtitle">In Bearbeitung</p>
          </div>
          <div className="stat-card" style={{ '--stat-accent': '#818CF8' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-label">Leads</span>
              <div className="stat-icon stat-icon-purple">
                <Users size={20} />
              </div>
            </div>
            <div className="stat-value">{totalLeadsInVerticals}</div>
            <p className="stat-subtitle">In Verticals</p>
          </div>
        </div>

        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>Zielgruppen</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{totalVerticals} Verticals konfiguriert</p>
          </div>
        </div>

        {/* Verticals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {verticals?.map((vertical, index) => {
            const leadCount = verticalLeadCounts[vertical.slug] || 0
            const color = colors[index % colors.length]

            return (
              <div
                key={vertical.slug}
                className="vertical-card"
                style={{ '--vertical-accent': color } as React.CSSProperties}
              >
                {/* Header */}
                <div className="vertical-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      className="vertical-card-icon"
                      style={{ background: `${color}12` }}
                    >
                      <Building2 size={24} style={{ color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                        {vertical.name}
                      </h3>
                      <span className={`badge ${vertical.active ? 'badge-success' : 'badge-default'}`}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: vertical.active ? '#10B981' : 'var(--color-text-tertiary)'
                          }}
                        />
                        {vertical.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="vertical-card-body">
                  {vertical.description && (
                    <p className="vertical-card-description">
                      {vertical.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="vertical-stats-row">
                    <div className="vertical-stat">
                      <div className="vertical-stat-label">
                        <div className="vertical-stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)' }}>
                          <Users size={16} style={{ color: '#4F46E5' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Leads</span>
                      </div>
                      <p className="vertical-stat-value">{leadCount}</p>
                    </div>

                    <div className="vertical-stat">
                      <div className="vertical-stat-label">
                        <div className="vertical-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                          <DollarSign size={16} style={{ color: '#10B981' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Target</span>
                      </div>
                      <p className="vertical-stat-value" style={{ color: '#10B981' }}>
                        €{((vertical.target_deal_size_min || 0) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Directive Link */}
                  {vertical.directive_path && (
                    <div style={{ marginBottom: '20px' }}>
                      <DirectiveViewer
                        directivePath={vertical.directive_path}
                        verticalName={vertical.name}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="vertical-card-actions">
                    <button className="btn btn-secondary" style={{ flex: 1 }}>
                      <Settings size={16} />
                      Bearbeiten
                    </button>
                    <Link
                      href={`/leads?vertical=${vertical.slug}`}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Users size={16} />
                      Leads ansehen
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
