import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { AutomationsClient } from '@/components/AutomationsClient'

export const metadata = {
  title: 'Automatisierungen | Worknetic CRM',
}

export default async function AutomationsPage() {
  // Fetch all non-deleted leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, company, email, phone, website, headline, linkedin_url, vertical, stage, location, lead_score, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Fetch enrichment + email_draft activities to determine lead status
  const { data: enrichmentActivities } = await supabase
    .from('activities')
    .select('lead_id, type')
    .in('type', ['enrichment', 'email_draft'])

  // Fetch active verticals for filter dropdown
  const { data: verticals } = await supabase
    .from('verticals')
    .select('slug, name')
    .eq('active', true)
    .order('name')

  // Build status map: { leadId: { hasEnrichment, hasEmailDraft } }
  const statusMap: Record<string, { hasEnrichment: boolean; hasEmailDraft: boolean }> = {}
  for (const activity of enrichmentActivities || []) {
    if (!statusMap[activity.lead_id]) {
      statusMap[activity.lead_id] = { hasEnrichment: false, hasEmailDraft: false }
    }
    if (activity.type === 'enrichment') statusMap[activity.lead_id].hasEnrichment = true
    if (activity.type === 'email_draft') statusMap[activity.lead_id].hasEmailDraft = true
  }

  return (
    <>
      <Header title="Automatisierungen" subtitle="Vertriebsautomatisierungen starten" />
      <div className="page-content">
        <AutomationsClient
          leads={leads || []}
          enrichmentStatus={statusMap}
          verticals={verticals || []}
        />
      </div>
    </>
  )
}
