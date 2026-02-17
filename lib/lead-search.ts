/**
 * Perplexity Sonar Lead Discovery
 * ================================
 * Three-phase approach:
 *   1. Find real people (name, company, role) via Perplexity Sonar
 *   2. For each person: targeted LinkedIn profile search (site: operator)
 *   3. For each person: targeted company website search
 *
 * All via Perplexity Sonar (OpenRouter). No Serper, no Google API.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveredLead {
  name: string
  company: string | null
  linkedin_url: string | null
  website: string | null
  email: string | null
  phone: string | null
  headline: string | null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = 'perplexity/sonar'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// ---------------------------------------------------------------------------
// Vertical-specific search prompts (English for better Perplexity search)
// ---------------------------------------------------------------------------

const VERTICAL_SEARCH_CONFIG: Record<string, { base: string; variations: string[] }> = {
  coaches_berater: {
    base: 'independent business coaches and management consultants in the DACH region (Germany, Austria, Switzerland)',
    variations: [
      'who are founders or owners of their own coaching business, especially executive coaching or leadership coaching',
      'who work as solo entrepreneurs or freelance consultants advising C-level executives and business leaders',
      'specializing in strategy consulting, change management, or organizational development in Germany',
      'based in Berlin, Munich, Hamburg, or Frankfurt who have their own coaching practice',
      'based in Stuttgart, Düsseldorf, Cologne, Vienna, or Zurich with their own consulting firm',
      'who are active on LinkedIn and have their own business website, specializing in business coaching',
      'specializing in digital transformation consulting or startup mentoring in the DACH region',
      'who run small coaching firms with under 10 employees in German-speaking countries',
    ],
  },
  immobilienmakler: {
    base: 'independent real estate agents and agency owners in the DACH region (Germany, Austria, Switzerland)',
    variations: [
      'who own or manage their own real estate agency (Maklerbüro) in major German cities',
      'specializing in premium residential or commercial real estate in Germany',
      'based in Berlin, Munich, Hamburg, or Frankfurt with their own real estate office',
      'based in Stuttgart, Düsseldorf, Cologne, or Leipzig running their own agency',
      'who work as independent Immobilienmakler with a small team of under 10 people',
      'who are active on LinkedIn and have their own company website for real estate services',
    ],
  },
  recruiting_headhunter: {
    base: 'independent recruiters and headhunters in the DACH region (Germany, Austria, Switzerland)',
    variations: [
      'who own or are partners in their own recruiting or executive search firm',
      'specializing in IT recruiting, tech talent acquisition, or executive search',
      'who run boutique recruiting agencies with under 20 employees in Germany',
      'based in Berlin, Munich, Hamburg, or Frankfurt with their own Personalberatung',
      'based in Stuttgart, Düsseldorf, Cologne, or Vienna specializing in C-level placement',
      'who are active on LinkedIn and have their own business website for recruiting services',
    ],
  },
  steuerberater: {
    base: 'independent tax advisors and accounting firm owners (Steuerberater) in the DACH region',
    variations: [
      'who own their own tax practice (Steuerkanzlei) and advise entrepreneurs and startups',
      'with a digital or online tax advisory practice in Germany',
      'based in Berlin, Munich, Hamburg, or Frankfurt with their own Kanzlei',
      'based in Stuttgart, Düsseldorf, Cologne, Vienna, or Zurich running their own firm',
      'who run a small to medium Steuerkanzlei with under 15 employees',
      'who specialize in e-commerce, digital businesses, or freelancer taxation',
    ],
  },
  architekten: {
    base: 'independent architects and architecture firm owners in the DACH region (Germany, Austria, Switzerland)',
    variations: [
      'who are founders or owners of their own architecture studio (Architekturbüro)',
      'specializing in residential construction, single-family homes, or sustainable building',
      'specializing in commercial construction, office buildings, or interior architecture',
      'based in Berlin, Munich, Hamburg, or Frankfurt with their own architecture practice',
      'based in Stuttgart, Düsseldorf, Cologne, Vienna, or Zurich running their own studio',
      'who run a small Architekturbüro with under 15 employees, active on LinkedIn',
      'specializing in renovation, historic preservation, or sustainable architecture in Germany',
    ],
  },
  marketing_agenturen: {
    base: 'independent marketing agency owners in the DACH region (Germany, Austria, Switzerland)',
    variations: [
      'who are founders or CEOs of their own marketing or digital agency',
      'specializing in performance marketing, SEO, or social media marketing',
      'who run boutique agencies with under 20 employees focusing on B2B marketing',
      'based in Berlin, Munich, Hamburg, or Frankfurt with their own marketing agency',
      'based in Stuttgart, Düsseldorf, or Cologne specializing in branding or web design',
      'who run a full-service digital agency and are active on LinkedIn',
    ],
  },
}

// ---------------------------------------------------------------------------
// Shared API caller
// ---------------------------------------------------------------------------

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 45_000,
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY nicht gesetzt')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://crm.worknetic.de',
        'X-Title': 'Worknetic CRM',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[LeadSearch] API error: ${response.status}`, errorText.slice(0, 200))
      throw new Error(`API Fehler: ${response.status}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content ?? null
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Perplexity Timeout')
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Find people
// ---------------------------------------------------------------------------

function buildDiscoveryPrompt(
  base: string,
  variation: string,
  count: number,
  excludeNames: string[],
): string {
  let prompt = `Search the web and find ${count} real ${base}, ${variation}.\n\n`
  prompt += `For each person provide:\n`
  prompt += `- Full name (as used professionally)\n`
  prompt += `- Company name (their firm/business)\n`
  prompt += `- Professional headline (their role, e.g. "Founder & CEO of XYZ GmbH")\n`
  prompt += `- LinkedIn profile URL if you can find it (search linkedin.com/in/)\n`
  prompt += `- Company website URL (the actual business domain, NOT linkedin or xing)\n`
  prompt += `- Business email if publicly available (from website impressum/kontakt)\n`
  prompt += `- Business phone if publicly available\n\n`

  if (excludeNames.length > 0) {
    prompt += `DO NOT include these people (already known): ${excludeNames.join(', ')}\n\n`
  }

  prompt += `IMPORTANT RULES:\n`
  prompt += `- Only return REAL, verifiable people. No made-up data.\n`
  prompt += `- For LinkedIn: search "site:linkedin.com/in/ firstname lastname" to find their profile URL.\n`
  prompt += `- For website: search "firstname lastname company website" to find their business domain (e.g. firma.de).\n`
  prompt += `- For email: check the company website's /impressum or /kontakt page for a contact email.\n`
  prompt += `- LinkedIn URL format must be: https://www.linkedin.com/in/slug\n`
  prompt += `- Website must be the actual business domain, NOT linkedin.com, xing.com, or social media.\n`
  prompt += `- Every person MUST have at least a company name.\n`
  prompt += `- PRIORITIZE finding LinkedIn URL and website for each person — these are the most important fields.\n\n`

  prompt += `Reply ONLY with a JSON array (no explanation, no markdown, no code blocks):\n`
  prompt += `[{"name":"Max Mustermann","company":"Firma GmbH","headline":"Gründer & Geschäftsführer","linkedin_url":"https://www.linkedin.com/in/maxmustermann","website":"https://firma.de","email":"max@firma.de","phone":"+49 123 456789"}]\n\n`
  prompt += `Set fields to null if not found.`

  return prompt
}

async function discoverPeople(
  base: string,
  variation: string,
  count: number,
  excludeNames: string[],
): Promise<DiscoveredLead[]> {
  const prompt = buildDiscoveryPrompt(base, variation, count, excludeNames)

  console.log('[LeadSearch] Phase 1: Discovering people...')
  const content = await callPerplexity(
    'You are a B2B lead researcher specializing in finding real business professionals in the DACH region (Germany, Austria, Switzerland). You have access to web search. Search actively on LinkedIn and company websites. Always respond with valid JSON only — no markdown, no code blocks, just the raw JSON array.',
    prompt,
  )

  if (!content) return []

  console.log('[LeadSearch] Response preview:', content.slice(0, 400))
  const leads = parseLeadsFromResponse(content)
  console.log(`[LeadSearch] Phase 1 found ${leads.length} people`)
  return leads
}

// ---------------------------------------------------------------------------
// Phase 2: Find LinkedIn profile for a specific person
// ---------------------------------------------------------------------------

async function searchLinkedIn(
  name: string,
  company: string | null,
  headline: string | null,
): Promise<string | null> {
  const prompt = `Find the LinkedIn profile URL for ${name}${company ? `, ${company}` : ''}${headline ? ` (${headline})` : ''} in Germany/Austria/Switzerland. Search google for: site:linkedin.com/in/ ${name}

Reply with ONLY the URL or null.`

  try {
    const content = await callPerplexity(
      'Search the web to find this persons LinkedIn profile URL. Reply with ONLY the URL or null.',
      prompt,
      20_000,
    )

    if (!content) return null
    // Clean up response — Sonar sometimes adds citation markers like [1] or extra text
    const cleaned = content.trim().replace(/\[\d+\]/g, '').replace(/["`']/g, '').trim()

    const validated = validateLinkedInUrl(cleaned, name)
    if (validated) {
      console.log(`[LeadSearch] LinkedIn found for ${name}: ${validated}`)
    } else {
      console.log(`[LeadSearch] LinkedIn NOT found for ${name} (response: ${cleaned.slice(0, 80)})`)
    }
    return validated
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Find company website for a specific person/company
// ---------------------------------------------------------------------------

async function searchWebsite(
  name: string,
  company: string | null,
): Promise<string | null> {
  if (!company) return null

  const prompt = `Search for: "${company}" ${name} official website

Find the official business website of "${company}"${name ? ` (run by ${name})` : ''} in Germany/Austria/Switzerland.

I need the actual company domain (like firma.de, firma.com, firma-name.de). NOT linkedin.com, xing.com, facebook.com, or any directory/listing site.

Reply with ONLY the URL (nothing else). Example: https://firma.de
If you cannot find it, reply with: null`

  try {
    const content = await callPerplexity(
      'You search the web to find official company websites. Reply with ONLY the URL or null. No explanation, no extra text.',
      prompt,
      20_000,
    )

    if (!content) return null
    const cleaned = content.trim().replace(/\[\d+\]/g, '').replace(/["`']/g, '').trim()
    const validated = validateWebsiteUrl(cleaned)
    if (validated) {
      console.log(`[LeadSearch] Website found for ${name}/${company}: ${validated}`)
    } else {
      console.log(`[LeadSearch] Website NOT found for ${name}/${company} (response: ${cleaned.slice(0, 80)})`)
    }
    return validated
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

function validateLinkedInUrl(url: unknown, personName?: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (trimmed === 'null' || trimmed === 'NULL' || trimmed.length < 10) return null

  // Extract the LinkedIn slug
  const match = trimmed.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/)
  if (!match) return null

  const slug = match[1].toLowerCase()
  const fullUrl = `https://www.linkedin.com/in/${slug}`

  // If we have the person's name, verify the slug is plausible
  if (personName) {
    const nameParts = personName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
      .split(/[\s\-]+/)
      .filter((p) => p.length >= 2 && !['dr', 'prof', 'von', 'van', 'de'].includes(p))

    const slugNormalized = slug.replace(/[\-%_]/g, '')
    const hasNameMatch = nameParts.some((part) => slugNormalized.includes(part))

    if (!hasNameMatch) {
      console.log(`[LeadSearch] LinkedIn slug "${slug}" doesn't match name "${personName}" — rejected`)
      return null
    }
  }

  return fullUrl
}

function validateWebsiteUrl(url: unknown): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (trimmed === 'null' || trimmed === 'NULL' || trimmed.length < 5) return null

  // Reject social media URLs
  if (/linkedin\.com|xing\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com/i.test(trimmed)) {
    return null
  }
  // Reject directory/listing sites
  if (/kununu\.de|northdata\.de|stepstone|indeed|glassdoor|wlw\.de|gelbeseiten|wikipedia/i.test(trimmed)) {
    return null
  }

  if (/^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-z]{2,}/.test(trimmed)) {
    return trimmed
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseLeadsFromResponse(content: string): DiscoveredLead[] {
  let jsonStr = content.trim()
  jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '')

  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonStr = arrayMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item: Record<string, unknown>) => {
        if (!item || typeof item.name !== 'string' || item.name.trim().length < 3) return false
        if (!item.company || typeof item.company !== 'string' || item.company.trim().length < 2) return false
        return true
      })
      .map((item: Record<string, unknown>) => ({
        name: String(item.name).trim(),
        company: item.company ? String(item.company).trim() : null,
        linkedin_url: validateLinkedInUrl(item.linkedin_url, String(item.name)),
        website: validateWebsiteUrl(item.website),
        email: item.email ? String(item.email).trim().toLowerCase() : null,
        phone: item.phone ? String(item.phone).trim() : null,
        headline: item.headline ? String(item.headline).trim() : null,
      }))
  } catch {
    console.error('[LeadSearch] Failed to parse JSON:', content.slice(0, 500))
    return []
  }
}

// ---------------------------------------------------------------------------
// Fallback config for unknown verticals
// ---------------------------------------------------------------------------

function generateFallbackConfig(vertical: string): { base: string; variations: string[] } {
  const readableName = vertical
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    base: `independent ${readableName} professionals in the DACH region (Germany, Austria, Switzerland)`,
    variations: [
      'who are founders or owners of their own business',
      'who are self-employed or freelancers active on LinkedIn',
      'based in Berlin, Munich, Hamburg, or Frankfurt',
      'based in Stuttgart, Düsseldorf, Cologne, Vienna, or Zurich',
      'who run a small business with under 15 employees',
      'who are active on LinkedIn and have their own company website',
    ],
  }
}

// ---------------------------------------------------------------------------
// Main search function (async generator for streaming)
// ---------------------------------------------------------------------------

export async function* searchLeadsPerplexity(
  vertical: string,
  maxLeads: number,
): AsyncGenerator<
  | { type: 'start'; vertical: string; max_leads: number }
  | { type: 'profile'; lead: DiscoveredLead }
  | { type: 'batch_done'; batch: number; found: number }
  | { type: 'error'; error: string }
> {
  const config = VERTICAL_SEARCH_CONFIG[vertical] ?? generateFallbackConfig(vertical)

  console.log(`[LeadSearch] Starting search: vertical=${vertical}, maxLeads=${maxLeads}, model=${MODEL}`)
  yield { type: 'start', vertical, max_leads: maxLeads }

  const foundNames: string[] = []
  let totalFound = 0
  const leadsPerBatch = 8

  for (let i = 0; i < config.variations.length && totalFound < maxLeads; i++) {
    const variation = config.variations[i]

    try {
      console.log(`[LeadSearch] === Batch ${i + 1}/${config.variations.length} ===`)

      // Phase 1: Discover people
      const leads = await discoverPeople(
        config.base,
        variation,
        Math.min(leadsPerBatch, maxLeads - totalFound),
        foundNames,
      )

      for (const lead of leads) {
        if (totalFound >= maxLeads) break

        // Skip duplicates
        const nameLower = lead.name.toLowerCase()
        if (foundNames.some((n) => n.toLowerCase() === nameLower)) continue

        // Phase 2 + 3: Find LinkedIn + Website in PARALLEL
        const needsLinkedIn = !lead.linkedin_url
        const needsWebsite = !lead.website && lead.company

        if (needsLinkedIn || needsWebsite) {
          console.log(`[LeadSearch] Phase 2+3 for ${lead.name}: needLI=${needsLinkedIn}, needWeb=${needsWebsite}`)

          const promises: Promise<void>[] = []

          if (needsLinkedIn) {
            promises.push(
              searchLinkedIn(lead.name, lead.company, lead.headline).then((url) => {
                if (url) lead.linkedin_url = url
              }),
            )
          }

          if (needsWebsite) {
            promises.push(
              searchWebsite(lead.name, lead.company).then((url) => {
                if (url) lead.website = url
              }),
            )
          }

          await Promise.allSettled(promises)
        }

        // Quality check: must have at least one contact channel
        const hasContact = lead.linkedin_url || lead.website || lead.email || lead.phone
        const quality = [
          lead.linkedin_url ? 'LI' : null,
          lead.website ? 'WEB' : null,
          lead.email ? 'EMAIL' : null,
          lead.phone ? 'PHONE' : null,
        ]
          .filter(Boolean)
          .join('+')

        console.log(
          `[LeadSearch] ${hasContact ? 'OK' : 'SKIP'} ${lead.name} @ ${lead.company} [${quality || 'NO_CONTACT'}] linkedin=${lead.linkedin_url || '-'} website=${lead.website || '-'}`,
        )

        // Skip leads with zero contact data
        if (!hasContact) continue

        foundNames.push(lead.name)
        totalFound++
        yield { type: 'profile', lead }
      }

      yield { type: 'batch_done', batch: i + 1, found: totalFound }
    } catch (err) {
      console.error(`[LeadSearch] Batch ${i + 1} error:`, err)
      yield {
        type: 'error',
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      }
    }

    // Delay between batches
    if (totalFound < maxLeads) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`[LeadSearch] Search complete: ${totalFound} leads found`)
}
