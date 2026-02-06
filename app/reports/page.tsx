import { Header } from '@/components/Header'
import { ReportsClient } from '@/components/ReportsClient'
import { getReportData } from '@/lib/actions'

export default async function ReportsPage() {
  const { leads, deals, activities } = await getReportData()

  return (
    <>
      <Header
        title="Reports"
        subtitle="Analysen und Kennzahlen auf einen Blick"
      />

      <div className="page-content">
        <ReportsClient leads={leads} deals={deals} activities={activities} />
      </div>
    </>
  )
}
