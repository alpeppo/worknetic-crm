import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { LeadsClient } from '@/components/LeadsClient'
import { Inbox } from 'lucide-react'

export default async function LeadsPage() {
  const { data: leads, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('lead_score', { ascending: false })

  const allLeads = leads || []
  const totalLeads = count || 0
  const qualifiedLeads = allLeads.filter(l => l.qualified).length
  const highScoreLeads = allLeads.filter(l => (l.lead_score || 0) >= 7).length
  const avgScore = allLeads.length ?
    (allLeads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / allLeads.length).toFixed(1) : '0'

  // Count inbox (not reviewed) and ready (reviewed) leads
  const inboxCount = allLeads.filter(l => !l.reviewed).length
  const readyCount = allLeads.filter(l => l.reviewed).length

  return (
    <>
      <Header
        title="Leads"
        subtitle={`${totalLeads} Leads insgesamt`}
        actions={
          inboxCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(245,158,11,0.1)] text-[#f59e0b] rounded-lg text-sm font-medium">
              <Inbox size={16} />
              {inboxCount} in Inbox
            </div>
          ) : null
        }
      />

      <div className="page-content">
        <LeadsClient
          leads={allLeads}
          totalLeads={totalLeads}
          qualifiedLeads={qualifiedLeads}
          highScoreLeads={highScoreLeads}
          avgScore={avgScore}
          inboxCount={inboxCount}
          readyCount={readyCount}
        />
      </div>
    </>
  )
}
