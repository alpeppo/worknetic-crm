import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { DealsClient } from '@/components/DealsClient'

export const dynamic = 'force-dynamic'

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

  return (
    <>
      <Header
        title="Deals"
        subtitle={`${allDeals.length} Deals in der Pipeline`}
        actions={
          <DealsClient deals={allDeals} leads={allLeads} headerOnly />
        }
      />

      <div className="page-content">
        <DealsClient deals={allDeals} leads={allLeads} />
      </div>
    </>
  )
}
