import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { enrichLead } from '@/lib/enrichment'
import { generateOutreachEmail } from '@/lib/email-generation'

export async function POST(request: NextRequest) {
  const { automation, leadIds } = await request.json()

  if (!automation || !leadIds?.length) {
    return new Response(JSON.stringify({ error: 'automation and leadIds required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (automation !== 'email') {
    return new Response(JSON.stringify({ error: 'Invalid automation type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch all requested leads in one query
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds)
    .is('deleted_at', null)

  if (error || !leads) {
    return new Response(JSON.stringify({ error: 'Failed to fetch leads' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Stream NDJSON progress events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      for (const lead of leads) {
        try {
          // Step 1: Check for existing enrichment data, or run enrichment first
          let enrichmentData = {
            company_description: null as string | null,
            business_processes: null as string | null,
          }

          const { data: existing } = await supabase
            .from('activities')
            .select('metadata')
            .eq('lead_id', lead.id)
            .eq('type', 'enrichment')
            .order('created_at', { ascending: false })
            .limit(1)

          if (existing?.[0]?.metadata?.enrichment) {
            enrichmentData = {
              company_description: existing[0].metadata.enrichment.company_description,
              business_processes: existing[0].metadata.enrichment.business_processes,
            }
          } else {
            // No enrichment yet — run it first for better email quality
            const enrichmentResult = await enrichLead({
              name: lead.name,
              company: lead.company,
              website: lead.website,
              email: lead.email,
              phone: lead.phone,
              linkedin_url: lead.linkedin_url,
              headline: lead.headline,
            })

            // Update lead fields
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (enrichmentResult.email && !lead.email) updates.email = enrichmentResult.email
            if (enrichmentResult.phone && !lead.phone) updates.phone = enrichmentResult.phone
            if (enrichmentResult.website && !lead.website) updates.website = enrichmentResult.website
            if (Object.keys(updates).length > 1) {
              await supabase.from('leads').update(updates).eq('id', lead.id)
            }

            // Store enrichment activity via RPC (bypass VIEW INSERT RETURNING issue)
            await supabase.rpc('insert_activity', {
              p_lead_id: lead.id,
              p_type: 'enrichment',
              p_subject: `Lead angereichert (${enrichmentResult.status})`,
              p_body: enrichmentResult.company_description || null,
              p_metadata: { enrichment: enrichmentResult },
              p_created_by: 'system',
            })

            enrichmentData = {
              company_description: enrichmentResult.company_description,
              business_processes: enrichmentResult.business_processes,
            }
          }

          // Step 2: Generate personalized email
          const emailResult = await generateOutreachEmail({
            lead: {
              name: lead.name,
              company: lead.company,
              headline: lead.headline,
              vertical: lead.vertical,
              website: lead.website,
              location: lead.location,
            },
            enrichment: enrichmentData,
          })

          // Store email draft activity via RPC (bypass VIEW INSERT RETURNING issue)
          await supabase.rpc('insert_activity', {
            p_lead_id: lead.id,
            p_type: 'email_draft',
            p_subject: emailResult.subject,
            p_body: emailResult.body,
            p_metadata: { email_draft: emailResult },
            p_created_by: 'system',
          })

          // Stream success event
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                leadId: lead.id,
                leadName: lead.name,
                success: true,
                emailGenerated: true,
              }) + '\n'
            )
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                leadId: lead.id,
                leadName: lead.name,
                success: false,
                error: err instanceof Error ? err.message : 'Unbekannter Fehler',
              }) + '\n'
            )
          )
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  })
}
