import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { DealsClient } from '@/components/DealsClient'
import { TrendingUp, DollarSign, Briefcase, Target } from 'lucide-react'

export default async function DealsPage() {
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, company')
    .is('deleted_at', null)

  const allDeals = deals || []
  const allLeads = leads || []

  const totalDeals = allDeals.length
  const pipelineValue = allDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonValue = allDeals.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0)
  const avgDealSize = allDeals.length ? Math.round(pipelineValue / allDeals.length) : 0

  return (
    <>
      <Header
        title="Deals"
        subtitle={`${totalDeals} Deals in der Pipeline`}
        actions={
          <DealsClient deals={allDeals} leads={allLeads} headerOnly />
        }
      />

      <div className="page-content">
        {/* Stats - Verticals Style */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline</span>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 122, 255, 0.1)' }}>
                <TrendingUp size={22} style={{ color: '#007AFF' }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#007AFF', letterSpacing: '-0.5px' }}>€{(pipelineValue / 1000).toFixed(0)}k</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>Gesamtwert</p>
          </div>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gewonnen</span>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52, 199, 89, 0.1)' }}>
                <DollarSign size={22} style={{ color: '#34C759' }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#34C759', letterSpacing: '-0.5px' }}>€{(wonValue / 1000).toFixed(0)}k</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>Abgeschlossen</p>
          </div>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deals</span>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(175, 82, 222, 0.1)' }}>
                <Briefcase size={22} style={{ color: '#AF52DE' }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>{totalDeals}</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>In der Pipeline</p>
          </div>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ø Deal</span>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 149, 0, 0.1)' }}>
                <Target size={22} style={{ color: '#FF9500' }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>€{avgDealSize.toLocaleString()}</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>Durchschnitt</p>
          </div>
        </div>

        {/* Kanban Board */}
        <DealsClient deals={allDeals} leads={allLeads} />
      </div>
    </>
  )
}
