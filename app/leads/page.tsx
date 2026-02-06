import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { LeadsClient } from '@/components/LeadsClient'
import { Inbox } from 'lucide-react'

const PAGE_SIZE = 25

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10))
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch paginated leads
  const { data: leads, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('lead_score', { ascending: false })
    .range(from, to)

  // Fetch aggregate stats separately (across all leads, not just the current page)
  const { data: allLeadsForStats } = await supabase
    .from('leads')
    .select('qualified, lead_score, reviewed, outreach_priority, contact_score')
    .is('deleted_at', null)

  const allStats = allLeadsForStats || []
  const allLeads = leads || []
  const totalLeads = count || 0
  const qualifiedLeads = allStats.filter(l => l.qualified).length
  const highScoreLeads = allStats.filter(l => (l.lead_score || 0) >= 7).length
  const avgScore = allStats.length ?
    (allStats.reduce((sum, l) => sum + (l.lead_score || 0), 0) / allStats.length).toFixed(1) : '0'

  // Count inbox (not reviewed) and ready (reviewed) leads across ALL leads
  const inboxCount = allStats.filter(l => !l.reviewed).length
  const readyCount = allStats.filter(l => l.reviewed).length

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
          totalCount={totalLeads}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  )
}
