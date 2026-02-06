import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { InboxClient } from '@/components/InboxClient'

export default async function InboxPage() {
  const { data: activities } = await supabase
    .from('activities')
    .select('*, leads:lead_id(id, name, company, stage)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <>
      <Header
        title="Inbox"
        subtitle="Alle Kommunikation auf einen Blick"
      />

      <div className="page-content">
        <InboxClient activities={activities || []} />
      </div>
    </>
  )
}
