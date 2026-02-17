import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enrichLead } from '@/lib/enrichment'

const SECRET = 'enrich-test-2026-worknetic'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (token !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch all leads without email that have a website
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .is('email', null)
    .not('website', 'is', null)

  if (error || !leads) {
    return NextResponse.json({ error: 'Failed to fetch leads', details: error }, { status: 500 })
  }

  const results: { name: string; email: string | null; phone: string | null; method: string; status: string }[] = []

  for (const lead of leads) {
    try {
      const result = await enrichLead({
        name: lead.name,
        company: lead.company,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
        linkedin_url: lead.linkedin_url,
        headline: lead.headline,
      })

      // Update lead in DB
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (result.email && !lead.email) updates.email = result.email
      if (result.phone && !lead.phone) updates.phone = result.phone
      if (Object.keys(updates).length > 1) {
        await supabase.from('leads').update(updates).eq('id', lead.id)
      }

      // Store enrichment activity
      await supabase.rpc('insert_activity', {
        p_lead_id: lead.id,
        p_type: 'enrichment',
        p_subject: `Lead angereichert (${result.status})`,
        p_body: result.company_description || null,
        p_metadata: { enrichment: result },
        p_created_by: 'system',
      })

      const method = result.email
        ? result.all_emails_found.find((e) => e.value === result.email)?.source || 'unknown'
        : 'none'

      results.push({
        name: lead.name,
        email: result.email,
        phone: result.phone,
        method,
        status: result.status,
      })
    } catch (err) {
      results.push({
        name: lead.name,
        email: null,
        phone: null,
        method: 'error',
        status: err instanceof Error ? err.message : 'error',
      })
    }
  }

  const emailsFound = results.filter((r) => r.email).length
  const phonesFound = results.filter((r) => r.phone).length

  return NextResponse.json({
    total: leads.length,
    emails_found: emailsFound,
    phones_found: phonesFound,
    email_rate: `${((emailsFound / leads.length) * 100).toFixed(0)}%`,
    results,
  })
}
