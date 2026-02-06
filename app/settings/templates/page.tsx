import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { EmailTemplateEditor } from '@/components/EmailTemplateEditor'

export default async function TemplatesPage() {
  const { data: templates } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <Header
        title="E-Mail Templates"
        subtitle="Vorlagen für Outreach, Follow-ups und Proposals verwalten"
      />

      <div className="page-content">
        <EmailTemplateEditor templates={templates || []} />
      </div>
    </>
  )
}
