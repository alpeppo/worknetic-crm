import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { WorkflowBuilder } from '@/components/WorkflowBuilder'

export default async function WorkflowsPage() {
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <Header title="Automatisierung" subtitle="Workflows erstellen und verwalten" />
      <div className="page-content">
        <WorkflowBuilder workflows={workflows || []} />
      </div>
    </>
  )
}
