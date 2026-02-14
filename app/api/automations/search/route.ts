import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { searchLeadsPerplexity } from '@/lib/lead-search'
import { enrichLead } from '@/lib/enrichment'
import { generateOutreachEmail } from '@/lib/email-generation'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.vertical) {
    return new Response(JSON.stringify({ error: 'vertical is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const vertical = body.vertical as string
  const maxLeads = Math.min(Math.max(body.maxLeads ?? 20, 1), 50)

  console.log(`[SearchAPI] Request: vertical=${vertical}, maxLeads=${maxLeads}`)

  // Pre-load existing leads for dedup
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('linkedin_url, name, company')
    .is('deleted_at', null)

  const existingUrls = new Set<string>()
  const existingNameCompany = new Set<string>()
  for (const lead of existingLeads ?? []) {
    if (lead.linkedin_url) existingUrls.add(lead.linkedin_url.toLowerCase())
    const key = `${(lead.name || '').toLowerCase()}|${(lead.company || '').toLowerCase()}`
    existingNameCompany.add(key)
  }

  // Stream NDJSON events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let imported = 0
      let duplicates = 0
      let errors = 0
      let total = 0
      let enriched = 0
      const importedLeads: { id: string; lead: { name: string; company: string | null; website: string | null; email: string | null; phone: string | null; linkedin_url: string | null; headline: string | null } }[] = []

      function send(event: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // Controller might be closed if client disconnected
        }
      }

      try {
        // ========== PHASE 1: Search & Import ==========
        for await (const event of searchLeadsPerplexity(vertical, maxLeads)) {
          if (event.type === 'start') {
            send({ type: 'start', vertical: event.vertical, max_leads: event.max_leads })
            continue
          }

          if (event.type === 'error') {
            send({ type: 'error', error: event.error })
            errors++
            continue
          }

          if (event.type === 'batch_done') {
            continue
          }

          if (event.type === 'profile') {
            const lead = event.lead
            total++

            // Dedup check
            const urlDup = lead.linkedin_url
              ? existingUrls.has(lead.linkedin_url.toLowerCase())
              : false
            const nameKey = `${lead.name.toLowerCase()}|${(lead.company || '').toLowerCase()}`
            const nameDup = existingNameCompany.has(nameKey)

            if (urlDup || nameDup) {
              duplicates++
              send({
                type: 'profile',
                name: lead.name,
                company: lead.company,
                linkedin_url: lead.linkedin_url,
                imported: false,
                duplicate: true,
              })
              continue
            }

            // Insert into Supabase via RPC (bypasses the VIEW RETURNING issue)
            try {
              const leadId = crypto.randomUUID()
              console.log(`[SearchAPI] Inserting lead via RPC: ${lead.name} (id=${leadId})`)

              const { error: insertError } = await supabase.rpc('insert_lead', {
                p_id: leadId,
                p_name: lead.name,
                p_company: lead.company,
                p_linkedin_url: lead.linkedin_url,
                p_website: lead.website,
                p_email: lead.email,
                p_phone: lead.phone,
                p_headline: lead.headline,
                p_vertical: vertical,
                p_source: 'perplexity_search',
                p_stage: 'new',
                p_created_by: 'system',
                p_updated_by: 'system',
              })

              if (insertError) {
                console.log(`[SearchAPI] Insert error for ${lead.name}:`, insertError.message)
                throw new Error(`Insert failed: ${insertError.message}`)
              }

              imported++
              console.log(`[SearchAPI] Inserted ${lead.name} successfully`)

              // Add to dedup sets
              if (lead.linkedin_url) existingUrls.add(lead.linkedin_url.toLowerCase())
              existingNameCompany.add(nameKey)

              // Collect for enrichment phase
              importedLeads.push({ id: leadId, lead })

              send({
                type: 'profile',
                lead_id: leadId,
                name: lead.name,
                company: lead.company,
                linkedin_url: lead.linkedin_url,
                website: lead.website,
                email: lead.email,
                phone: lead.phone,
                imported: true,
                duplicate: false,
              })
            } catch (err) {
              errors++
              const errMsg = err instanceof Error ? err.message : 'Insert fehlgeschlagen'
              console.log(`[SearchAPI] Failed to insert ${lead.name}: ${errMsg}`)
              send({
                type: 'profile',
                name: lead.name,
                company: lead.company,
                linkedin_url: lead.linkedin_url,
                imported: false,
                duplicate: false,
                error: errMsg.slice(0, 200),
              })
            }
          }
        }
      } catch (err) {
        console.log('[SearchAPI] Pipeline error:', err instanceof Error ? err.message : String(err))
        send({ type: 'error', error: err instanceof Error ? err.message : 'Pipeline-Fehler' })
      }

      // ========== PHASE 2: Enrichment (inline, not fire-and-forget) ==========
      if (importedLeads.length > 0) {
        send({ type: 'enrichment_start', count: importedLeads.length })
        console.log(`[SearchAPI] Starting enrichment for ${importedLeads.length} leads`)

        for (const { id: leadId, lead } of importedLeads) {
          try {
            console.log(`[SearchAPI] Enriching ${lead.name}...`)
            send({ type: 'enrichment_progress', name: lead.name, status: 'running' })

            // Step 1: Enrich
            const enrichmentResult = await enrichLead({
              name: lead.name,
              company: lead.company,
              website: lead.website,
              email: lead.email,
              phone: lead.phone,
              linkedin_url: lead.linkedin_url,
              headline: lead.headline,
            })

            // Step 2: Update lead fields (only if currently empty)
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (enrichmentResult.email && !lead.email) updates.email = enrichmentResult.email
            if (enrichmentResult.phone && !lead.phone) updates.phone = enrichmentResult.phone
            if (enrichmentResult.website && !lead.website) updates.website = enrichmentResult.website
            if (Object.keys(updates).length > 1) {
              await supabase.from('leads').update(updates).eq('id', leadId)
            }

            // Step 3: Store enrichment activity via RPC (bypass VIEW INSERT RETURNING issue)
            await supabase.rpc('insert_activity', {
              p_lead_id: leadId,
              p_type: 'enrichment',
              p_subject: `Lead angereichert (${enrichmentResult.status})`,
              p_body: enrichmentResult.company_description || null,
              p_metadata: { enrichment: enrichmentResult },
              p_created_by: 'system',
            })

            // Step 4: Generate email
            const email = await generateOutreachEmail({
              lead: {
                name: lead.name,
                company: lead.company,
                headline: lead.headline,
                vertical,
                website: lead.website || enrichmentResult.website,
              },
              enrichment: {
                company_description: enrichmentResult.company_description,
                business_processes: enrichmentResult.business_processes,
              },
            })

            // Step 5: Store email draft via RPC (bypass VIEW INSERT RETURNING issue)
            await supabase.rpc('insert_activity', {
              p_lead_id: leadId,
              p_type: 'email_draft',
              p_subject: email.subject,
              p_body: email.body,
              p_metadata: { email_draft: email },
              p_created_by: 'system',
            })

            enriched++
            console.log(`[SearchAPI] Enriched ${lead.name} successfully (${enrichmentResult.status})`)
            send({
              type: 'enrichment_progress',
              name: lead.name,
              status: 'done',
              enrichment_status: enrichmentResult.status,
              email_generated: true,
              found_email: enrichmentResult.email || null,
              found_website: enrichmentResult.website || null,
            })
          } catch (err) {
            console.error(`[SearchAPI] Enrichment error for ${lead.name}:`, err)
            send({
              type: 'enrichment_progress',
              name: lead.name,
              status: 'error',
              error: err instanceof Error ? err.message : 'Enrichment fehlgeschlagen',
            })
          }
        }
      }

      // Summary event
      send({
        type: 'summary',
        total,
        imported_count: imported,
        duplicate_count: duplicates,
        error_count: errors,
        enriched_count: enriched,
      })

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
