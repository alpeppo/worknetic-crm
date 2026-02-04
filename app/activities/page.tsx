import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { ActivitiesClient } from '@/components/ActivitiesClient'

export default async function ActivitiesPage() {
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get all leads for the dropdown
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, company')
    .is('deleted_at', null)
    .order('name')

  const allActivities = activities || []
  const allLeads = leads || []

  const totalActivities = allActivities.length

  // Group activities by date
  const groupedActivities: Record<string, typeof allActivities> = {}
  allActivities.forEach((activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    if (!groupedActivities[date]) groupedActivities[date] = []
    groupedActivities[date].push(activity)
  })

  // Count by type
  const typeCount = allActivities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <Header
        title="Activities"
        subtitle={`${totalActivities} Aktivitäten`}
      />

      <div className="page-content">
        <ActivitiesClient
          activities={allActivities}
          leads={allLeads}
          groupedActivities={groupedActivities}
          typeCount={typeCount}
        />
      </div>
    </>
  )
}
