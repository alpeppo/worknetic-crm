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

  if (!['enrichment', 'email', 'pipeline'].includes(automation)) {
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
          let enrichmentResult = null
          let emailResult = null

          // Step 1: Enrichment (for 'enrichment' and 'pipeline')
          if (automation === 'enrichment' || automation === 'pipeline') {
            enrichmentResult = await enrichLead({
              name: lead.name,
              company: lead.company,
              website: lead.website,
              email: lead.email,
              phone: lead.phone,
              linkedin_url: lead.linkedin_url,
              headline: lead.headline,
            })

            // Update lead fields (only if currently empty)
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (enrichmentResult.email && !lead.email) updates.email = enrichmentResult.email
            if (enrichmentResult.phone && !lead.phone) updates.phone = enrichmentResult.phone
            if (enrichmentResult.website && !lead.website) updates.website = enrichmentResult.website
            if (Object.keys(updates).length > 1) {
              await supabase.from('leads').update(updates).eq('id', lead.id)
            }

            // Store enrichment activity
            await supabase.from('activities').insert({
              lead_id: lead.id,
              type: 'enrichment',
              subject: `Lead angereichert (${enrichmentResult.status})`,
              body: enrichmentResult.company_description || null,
              metadata: { enrichment: enrichmentResult },
              created_by: 'system',
              created_at: new Date().toISOString(),
            })
          }

          // Step 2: Email generation (for 'email' and 'pipeline')
          if (automation === 'email' || automation === 'pipeline') {
            // For email-only, fetch existing enrichment data
            let enrichmentData = {
              company_description: enrichmentResult?.company_description ?? null,
              business_processes: enrichmentResult?.business_processes ?? null,
            }

            if (!enrichmentResult) {
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
              }
            }

            emailResult = await generateOutreachEmail({
              lead: {
                name: lead.name,
                company: lead.company,
                headline: lead.headline,
                vertical: lead.vertical,
                website: lead.website || enrichmentResult?.website,
                location: lead.location,
              },
              enrichment: enrichmentData,
            })

            // Store email draft activity
            await supabase.from('activities').insert({
              lead_id: lead.id,
              type: 'email_draft',
              subject: emailResult.subject,
              body: emailResult.body,
              metadata: { email_draft: emailResult },
              created_by: 'system',
              created_at: new Date().toISOString(),
            })
          }

          // Stream success event
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                leadId: lead.id,
                leadName: lead.name,
                success: true,
                enrichmentStatus: enrichmentResult?.status,
                emailGenerated: !!emailResult,
              }) + '\n'
            )
          )
        } catch (err) {
          // Stream error event (continue processing other leads)
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
