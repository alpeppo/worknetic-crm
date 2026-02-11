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

      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
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

            // Insert into Supabase
            // Note: 'leads' is a VIEW — the JS client always adds RETURNING
            // which views don't support. Use direct REST API with return=minimal.
            try {
              const leadId = crypto.randomUUID()
              const insertPayload = {
                id: leadId,
                name: lead.name,
                company: lead.company,
                linkedin_url: lead.linkedin_url,
                website: lead.website,
                email: lead.email,
                phone: lead.phone,
                headline: lead.headline,
                vertical,
                source: 'perplexity_search',
                stage: 'new',
                created_by: 'system',
                updated_by: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              console.log(`[SearchAPI] Inserting lead: ${lead.name} (id=${leadId})`)

              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
              const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              const insertRes = await fetch(`${supabaseUrl}/rest/v1/leads`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify(insertPayload),
              })

              if (!insertRes.ok) {
                const errBody = await insertRes.text()
                console.log(`[SearchAPI] Insert error for ${lead.name}: ${insertRes.status} ${errBody}`)
                throw new Error(`Insert failed: ${insertRes.status}`)
              }

              imported++
              console.log(`[SearchAPI] Inserted ${lead.name} successfully`)

              // Add to dedup sets
              if (lead.linkedin_url) existingUrls.add(lead.linkedin_url.toLowerCase())
              existingNameCompany.add(nameKey)

              send({
                type: 'profile',
                name: lead.name,
                company: lead.company,
                linkedin_url: lead.linkedin_url,
                website: lead.website,
                email: lead.email,
                phone: lead.phone,
                imported: true,
                duplicate: false,
              })

              // Fire-and-forget: enrichment + email generation
              runEnrichmentForLead(leadId, lead, vertical).catch((err) =>
                console.error(`Enrichment error for ${lead.name}:`, err),
              )
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

      // Summary event
      send({
        type: 'summary',
        total,
        imported_count: imported,
        duplicate_count: duplicates,
        error_count: errors,
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

// Fire-and-forget enrichment + email generation for a newly imported lead
async function runEnrichmentForLead(
  leadId: string,
  lead: { name: string; company: string | null; website: string | null; email: string | null; phone: string | null; linkedin_url: string | null; headline: string | null },
  vertical: string,
) {
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

  // Step 3: Store enrichment activity
  await supabase.from('activities').insert({
    lead_id: leadId,
    type: 'enrichment',
    subject: `Lead angereichert (${enrichmentResult.status})`,
    body: enrichmentResult.company_description || null,
    metadata: { enrichment: enrichmentResult },
    created_by: 'system',
    created_at: new Date().toISOString(),
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

  // Step 5: Store email draft
  await supabase.from('activities').insert({
    lead_id: leadId,
    type: 'email_draft',
    subject: email.subject,
    body: email.body,
    metadata: { email_draft: email },
    created_by: 'system',
    created_at: new Date().toISOString(),
  })
}
