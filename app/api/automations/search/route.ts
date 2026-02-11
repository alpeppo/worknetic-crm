import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { searchVertical, SMART_QUERIES, type SearchEvent } from '@/lib/lead-search'
import { enrichLead } from '@/lib/enrichment'
import { generateOutreachEmail } from '@/lib/email-generation'

export async function POST(request: NextRequest) {
  const { vertical, maxLeads = 20 } = await request.json()

  if (!vertical) {
    return new Response(JSON.stringify({ error: 'vertical is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!SMART_QUERIES[vertical]) {
    return new Response(JSON.stringify({ error: `Unknown vertical: ${vertical}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cap = Math.min(Math.max(maxLeads, 1), 50)

  // Pre-load existing LinkedIn URLs for dedup
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('linkedin_url, name, company')
    .is('deleted_at', null)

  const existingUrls = new Set(
    (existingLeads ?? [])
      .map(l => l.linkedin_url?.toLowerCase())
      .filter(Boolean)
  )
  const existingNames = new Set(
    (existingLeads ?? [])
      .map(l => `${l.name?.toLowerCase()}|${(l.company ?? '').toLowerCase()}`)
  )

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let importedCount = 0
      let duplicateCount = 0
      let errorCount = 0
      let totalCount = 0

      try {
        for await (const profile of searchVertical(vertical, cap)) {
          totalCount++

          try {
            // Check for duplicates
            const urlDup = profile.linkedin_url && existingUrls.has(profile.linkedin_url.toLowerCase())
            const nameDup = existingNames.has(`${profile.name.toLowerCase()}|${(profile.company ?? '').toLowerCase()}`)

            if (urlDup || nameDup) {
              duplicateCount++
              const event: SearchEvent = {
                type: 'profile',
                name: profile.name,
                company: profile.company,
                linkedin_url: profile.linkedin_url,
                website: profile.website,
                email: profile.email,
                phone: profile.phone,
                imported: false,
                duplicate: true,
              }
              controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
              continue
            }

            // Insert new lead
            const { data: newLead, error: insertError } = await supabase
              .from('leads')
              .insert({
                name: profile.name,
                company: profile.company,
                headline: profile.headline,
                linkedin_url: profile.linkedin_url,
                website: profile.website,
                email: profile.email,
                phone: profile.phone,
                vertical,
                stage: 'new',
                source: 'lead_search',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single()

            if (insertError || !newLead) {
              errorCount++
              const event: SearchEvent = {
                type: 'profile',
                name: profile.name,
                company: profile.company,
                linkedin_url: profile.linkedin_url,
                imported: false,
                duplicate: false,
                error: insertError?.message ?? 'Insert failed',
              }
              controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
              continue
            }

            importedCount++

            // Add to dedup sets
            if (profile.linkedin_url) existingUrls.add(profile.linkedin_url.toLowerCase())
            existingNames.add(`${profile.name.toLowerCase()}|${(profile.company ?? '').toLowerCase()}`)

            // Stream success event immediately
            const event: SearchEvent = {
              type: 'profile',
              name: profile.name,
              company: profile.company,
              linkedin_url: profile.linkedin_url,
              website: profile.website,
              email: profile.email,
              phone: profile.phone,
              imported: true,
              duplicate: false,
            }
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

            // Fire-and-forget: enrichment + email generation
            runEnrichmentForLead(newLead.id, profile).catch(err =>
              console.error(`Enrichment failed for ${profile.name}:`, err)
            )
          } catch (err) {
            errorCount++
            const event: SearchEvent = {
              type: 'profile',
              name: profile.name,
              company: profile.company,
              imported: false,
              duplicate: false,
              error: err instanceof Error ? err.message : 'Unbekannter Fehler',
            }
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          }
        }
      } catch (err) {
        console.error('Search stream error:', err)
      }

      // Summary event
      const summary: SearchEvent = {
        type: 'summary',
        total: totalCount,
        imported_count: importedCount,
        duplicate_count: duplicateCount,
        error_count: errorCount,
      }
      controller.enqueue(encoder.encode(JSON.stringify(summary) + '\n'))
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

async function runEnrichmentForLead(
  leadId: string,
  profile: { name: string; company: string | null; website: string | null; email: string | null; phone: string | null; linkedin_url: string; headline: string }
) {
  // Step 1: Enrich
  const enrichmentResult = await enrichLead({
    name: profile.name,
    company: profile.company ?? undefined,
    website: profile.website ?? undefined,
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
    linkedin_url: profile.linkedin_url,
    headline: profile.headline,
  })

  // Step 2: Update lead fields (only if currently empty)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (enrichmentResult.email && !profile.email) updates.email = enrichmentResult.email
  if (enrichmentResult.phone && !profile.phone) updates.phone = enrichmentResult.phone
  if (enrichmentResult.website && !profile.website) updates.website = enrichmentResult.website

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
      name: profile.name,
      company: profile.company ?? undefined,
      headline: profile.headline,
      vertical: undefined,
      website: profile.website || enrichmentResult.website,
      location: undefined,
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
