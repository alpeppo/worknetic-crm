import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import CalendarView from '@/components/CalendarView'

export default async function CalendarPage() {
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, company, next_follow_up_at')

  return (
    <>
      <Header
        title="Kalender"
        subtitle="Aktivitäten und Follow-ups im Überblick"
      />

      <div className="page-content">
        <CalendarView
          activities={activities || []}
          leads={leads || []}
        />
      </div>
    </>
  )
}
