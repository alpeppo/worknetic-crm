import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { enrichLead } from '@/lib/enrichment'
import { generateOutreachEmail } from '@/lib/email-generation'

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    // 1. Fetch lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()
    if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // 2. Run enrichment
    const enrichmentResult = await enrichLead({
      name: lead.name,
      company: lead.company,
      website: lead.website,
      email: lead.email,
      phone: lead.phone,
      linkedin_url: lead.linkedin_url,
      headline: lead.headline,
    })

    // 3. Update lead fields (only if currently empty)
    const leadUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (enrichmentResult.email && !lead.email) leadUpdates.email = enrichmentResult.email
    if (enrichmentResult.phone && !lead.phone) leadUpdates.phone = enrichmentResult.phone
    if (enrichmentResult.website && !lead.website) leadUpdates.website = enrichmentResult.website

    if (Object.keys(leadUpdates).length > 1) {
      await supabase.from('leads').update(leadUpdates).eq('id', leadId)
    }

    // 4. Store enrichment activity via RPC (bypass VIEW INSERT RETURNING issue)
    await supabase.rpc('insert_activity', {
      p_lead_id: leadId,
      p_type: 'enrichment',
      p_subject: `Lead angereichert (${enrichmentResult.status})`,
      p_body: enrichmentResult.company_description || null,
      p_metadata: { enrichment: enrichmentResult },
      p_created_by: 'system',
    })

    // 5. Generate email
    const email = await generateOutreachEmail({
      lead: {
        name: lead.name,
        company: lead.company,
        headline: lead.headline,
        vertical: lead.vertical,
        website: lead.website || enrichmentResult.website,
        location: lead.location,
      },
      enrichment: {
        company_description: enrichmentResult.company_description,
        business_processes: enrichmentResult.business_processes,
      },
    })

    // 6. Store email draft activity via RPC (bypass VIEW INSERT RETURNING issue)
    await supabase.rpc('insert_activity', {
      p_lead_id: leadId,
      p_type: 'email_draft',
      p_subject: email.subject,
      p_body: email.body,
      p_metadata: { email_draft: email },
      p_created_by: 'system',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, enrichment: enrichmentResult, email })
  } catch (err) {
    console.error('Enrichment pipeline error:', err)
    return NextResponse.json({ success: false, error: 'Pipeline failed' }, { status: 500 })
  }
}
