import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { DirectiveViewer } from '@/components/DirectiveViewer'
import {
  Target,
  Settings,
  Users,
  DollarSign,
  MoreHorizontal,
  Building2,
  TrendingUp
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
  const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#FF2D55', '#64D2FF']

  return (
    <>
      <Header
        title="Verticals"
        subtitle={`${activeVerticals} aktive Zielgruppen`}
      />

      <div className="page-content">
        {/* Stats - Modern Cards */}
        <div className="grid grid-cols-3 gap-5 mb-8" style={{ maxWidth: '720px' }}>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Gesamt</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
                <Target size={20} style={{ color: '#007AFF' }} />
              </div>
            </div>
            <div className="stat-value">{totalVerticals}</div>
            <p className="text-sm text-muted mt-2">Zielgruppen</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Aktiv</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                <TrendingUp size={20} style={{ color: '#34C759' }} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34C759' }}>{activeVerticals}</div>
            <p className="text-sm text-muted mt-2">In Bearbeitung</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Leads</span>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(175, 82, 222, 0.1)' }}>
                <Users size={20} style={{ color: '#AF52DE' }} />
              </div>
            </div>
            <div className="stat-value">{totalLeadsInVerticals}</div>
            <p className="text-sm text-muted mt-2">In Verticals</p>
          </div>
        </div>

        {/* Verticals Grid - Modern Spacious Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {verticals?.map((vertical, index) => {
            const leadCount = verticalLeadCounts[vertical.slug] || 0
            const color = colors[index % colors.length]

            return (
              <div
                key={vertical.slug}
                style={{
                  background: 'var(--color-bg)',
                  borderRadius: '20px',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.3s ease'
                }}
                className="hover:shadow-lg hover:border-[var(--color-border-strong)]"
              >
                {/* Header with Color Accent */}
                <div
                  style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Icon with colored background */}
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Building2 size={24} style={{ color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                        {vertical.name}
                      </h3>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: vertical.active ? 'rgba(52, 199, 89, 0.12)' : 'var(--color-bg-secondary)',
                          color: vertical.active ? '#34C759' : 'var(--color-text-tertiary)'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: vertical.active ? '#34C759' : 'var(--color-text-tertiary)'
                          }}
                        />
                        {vertical.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>

                  {/* More Options */}
                  <button
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* Body - Clean Stats */}
                <div style={{ padding: '24px' }}>
                  {vertical.description && (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                      {vertical.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                    {/* Leads Count */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(0, 122, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Users size={16} style={{ color: '#007AFF' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Leads</span>
                      </div>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>{leadCount}</p>
                    </div>

                    {/* Target Deal */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(52, 199, 89, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <DollarSign size={16} style={{ color: '#34C759' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Target</span>
                      </div>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: '#34C759' }}>
                        €{((vertical.target_deal_size_min || 0) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Directive Link */}
                  {vertical.directive_path && (
                    <DirectiveViewer
                      directivePath={vertical.directive_path}
                      verticalName={vertical.name}
                    />
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      className="hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)]"
                    >
                      <Settings size={16} />
                      Bearbeiten
                    </button>
                    <Link
                      href={`/leads?vertical=${vertical.slug}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: '#007AFF',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'white',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
                      }}
                      className="hover:bg-[#0066d6] hover:shadow-lg"
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
