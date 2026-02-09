import * as cheerio from 'cheerio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoundContact {
  value: string
  source: 'website' | 'ai' | 'existing'
}

export interface EnrichmentResult {
  email: string | null
  phone: string | null
  website: string | null
  company_description: string | null
  business_processes: string | null
  enrichment_source: 'website' | 'perplexity' | 'both' | null
  all_emails_found: FoundContact[]
  all_phones_found: FoundContact[]
  enriched_at: string
  status: 'complete' | 'partial' | 'failed'
  error?: string
}

interface ScrapedData {
  emails: string[]
  phones: string[]
  description: string | null
}

interface PerplexityData {
  email: string | null
  phone: string | null
  website: string | null
  company_description: string | null
  business_processes: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const CONTACT_PATHS = [
  '/impressum',
  '/kontakt',
  '/contact',
  '/about',
  '/ueber-uns',
  '/',
]

const GENERIC_EMAIL_PREFIXES = [
  'info@',
  'kontakt@',
  'noreply@',
  'no-reply@',
  'office@',
  'mail@',
  'hello@',
  'hallo@',
  'support@',
  'webmaster@',
  'admin@',
  'postmaster@',
]

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// German phone patterns:
// +49 xxx ... | 0049 xxx ... | 0xxx ... with optional separators
// Also matches lines labelled Tel/Telefon/Fon/Phone/Mobil
const PHONE_REGEX =
  /(?:(?:Tel(?:efon)?|Fon|Phone|Mobil)\s*[:.]\s*)?(\+49[\s.\-/]?[\d\s.\-/]{6,15}|0049[\s.\-/]?[\d\s.\-/]{6,15}|0[1-9][\d\s.\-/]{5,15})/gi

const FETCH_TIMEOUT_MS = 10_000
const INTER_PAGE_DELAY_MS = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeUrl(raw: string): string {
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  // Strip trailing slash for consistent path joining
  return url.replace(/\/+$/, '')
}

function normalizePhone(raw: string): string {
  // Remove everything except digits and leading +
  return raw.replace(/[^\d+]/g, '')
}

function isGenericEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return GENERIC_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function pickBestEmail(emails: string[]): string | null {
  if (emails.length === 0) return null
  const personal = emails.filter((e) => !isGenericEmail(e))
  if (personal.length > 0) return personal[0]
  return emails[0]
}

function pickBestPhone(phones: string[]): string | null {
  if (phones.length === 0) return null
  // Prefer mobile numbers (starting with +491 or 01)
  const mobile = phones.find(
    (p) => /^\+491/.test(p) || /^01/.test(p) || /^00491/.test(p),
  )
  return mobile ?? phones[0]
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null
    }
    return await res.text()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Website scraping
// ---------------------------------------------------------------------------

function extractFromHtml(html: string): { emails: string[]; phones: string[] } {
  const $ = cheerio.load(html)

  // Remove script/style to avoid false positives
  $('script, style, noscript').remove()

  const text = $.text()

  const emails = dedupe(
    (text.match(EMAIL_REGEX) ?? []).map((e) => e.toLowerCase()),
  )

  const rawPhones = text.match(PHONE_REGEX) ?? []
  const phones = dedupe(
    rawPhones.map((p) => {
      // Strip label prefix if captured
      const cleaned = p.replace(
        /^(?:Tel(?:efon)?|Fon|Phone|Mobil)\s*[:.]\s*/i,
        '',
      )
      return normalizePhone(cleaned)
    }).filter((p) => p.length >= 8),
  )

  return { emails, phones }
}

function extractDescription(html: string): string | null {
  const $ = cheerio.load(html)

  // Try meta description first
  const metaDesc =
    $('meta[name="description"]').attr('content') ??
    $('meta[property="og:description"]').attr('content') ??
    null

  if (metaDesc && metaDesc.trim().length > 20) {
    return metaDesc.trim()
  }

  // Fallback: first substantial paragraph
  const paragraphs = $('p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 50)

  if (paragraphs.length > 0) {
    return paragraphs[0].slice(0, 500)
  }

  return null
}

async function scrapeWebsite(websiteUrl: string): Promise<ScrapedData> {
  const baseUrl = normalizeUrl(websiteUrl)
  const allEmails: string[] = []
  const allPhones: string[] = []
  let description: string | null = null

  for (let i = 0; i < CONTACT_PATHS.length; i++) {
    const path = CONTACT_PATHS[i]
    const url = path === '/' ? baseUrl + '/' : baseUrl + path

    if (i > 0) {
      await sleep(INTER_PAGE_DELAY_MS)
    }

    const html = await fetchPage(url)
    if (!html) continue

    const { emails, phones } = extractFromHtml(html)
    allEmails.push(...emails)
    allPhones.push(...phones)

    // Grab description from the homepage
    if (path === '/' && !description) {
      description = extractDescription(html)
    }
  }

  return {
    emails: dedupe(allEmails),
    phones: dedupe(allPhones),
    description,
  }
}

// ---------------------------------------------------------------------------
// Perplexity Sonar API
// ---------------------------------------------------------------------------

function buildPerplexityQuery(lead: {
  name: string
  company?: string | null
  website?: string | null
  linkedin_url?: string | null
  headline?: string | null
}): string {
  let query = `Recherchiere ${lead.name}`

  if (lead.company) {
    query += ` von der Firma "${lead.company}"`
  }
  if (lead.website) {
    query += ` (Website: ${lead.website})`
  }
  if (lead.linkedin_url) {
    query += ` (LinkedIn: ${lead.linkedin_url})`
  }
  if (lead.headline) {
    query += ` (Beschreibung: ${lead.headline})`
  }

  query += `. Finde: 1) Was macht die Firma/Person genau? 2) Welche typischen Geschäftsprozesse hat dieses Unternehmen? 3) E-Mail-Adresse 4) Telefonnummer 5) Website`

  return query
}

function parsePerplexityResponse(content: string): PerplexityData {
  const result: PerplexityData = {
    email: null,
    phone: null,
    website: null,
    company_description: null,
    business_processes: null,
  }

  // Extract email
  const emailMatch = content.match(EMAIL_REGEX)
  if (emailMatch) {
    const candidates = emailMatch.map((e) => e.toLowerCase())
    const personal = candidates.filter((e) => !isGenericEmail(e))
    result.email = personal.length > 0 ? personal[0] : candidates[0]
  }

  // Extract phone
  const phoneMatch = content.match(PHONE_REGEX)
  if (phoneMatch) {
    const cleaned = phoneMatch[0].replace(
      /^(?:Tel(?:efon)?|Fon|Phone|Mobil)\s*[:.]\s*/i,
      '',
    )
    result.phone = normalizePhone(cleaned)
  }

  // Extract website (look for URLs that are not email-related or API urls)
  const urlMatch = content.match(
    /https?:\/\/(?!api\.perplexity)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s)}\]"]*/g,
  )
  if (urlMatch) {
    // Pick the first URL that looks like a company website (not linkedin, not social)
    const companyUrl = urlMatch.find(
      (u) =>
        !u.includes('linkedin.com') &&
        !u.includes('facebook.com') &&
        !u.includes('twitter.com') &&
        !u.includes('instagram.com') &&
        !u.includes('xing.com'),
    )
    result.website = companyUrl ?? urlMatch[0]
  }

  // Extract company description – text between question 1 marker and question 2 marker
  const descMatch = content.match(
    /(?:1\)|1\.|Was macht)[^\n]*\n([\s\S]*?)(?=(?:2\)|2\.|Welche typischen|Geschäftsprozesse))/i,
  )
  if (descMatch) {
    result.company_description = descMatch[1].trim().slice(0, 1000) || null
  }

  // If we didn't capture with numbered format, try a more lenient approach
  if (!result.company_description) {
    // Take the first paragraph-like block as a description
    const lines = content.split('\n').filter((l) => l.trim().length > 30)
    if (lines.length > 0) {
      result.company_description = lines[0].trim().slice(0, 1000)
    }
  }

  // Extract business processes
  const processMatch = content.match(
    /(?:2\)|2\.|Geschäftsprozesse|typischen Prozesse)[^\n]*\n([\s\S]*?)(?=(?:3\)|3\.|E-Mail|Email|Mail))/i,
  )
  if (processMatch) {
    result.business_processes = processMatch[1].trim().slice(0, 1000) || null
  }

  return result
}

async function callPerplexity(lead: {
  name: string
  company?: string | null
  website?: string | null
  linkedin_url?: string | null
  headline?: string | null
}): Promise<PerplexityData | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return null
  }

  const query = buildPerplexityQuery(lead)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://crm.worknetic.de',
        'X-Title': 'Worknetic CRM',
      },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein Research-Assistent. Beantworte die Fragen präzise und auf Deutsch.',
          },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
      )
      return null
    }

    const data = await response.json()
    const content: string | undefined =
      data?.choices?.[0]?.message?.content

    if (!content) return null

    return parsePerplexityResponse(content)
  } catch (err) {
    console.error('OpenRouter API call failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Main enrichment function
// ---------------------------------------------------------------------------

export async function enrichLead(lead: {
  name: string
  company?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  headline?: string | null
}): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    website: lead.website ?? null,
    company_description: null,
    business_processes: null,
    enrichment_source: null,
    all_emails_found: [],
    all_phones_found: [],
    enriched_at: new Date().toISOString(),
    status: 'failed',
  }

  try {
    let scraped: ScrapedData | null = null
    let perplexityData: PerplexityData | null = null

    // ------------------------------------------------------------------
    // Step 1: Scrape website if available
    // ------------------------------------------------------------------
    if (lead.website) {
      try {
        scraped = await scrapeWebsite(lead.website)
      } catch (err) {
        console.error('Website scraping failed:', err)
      }
    }

    // ------------------------------------------------------------------
    // Step 2: Call Perplexity Sonar API
    // ------------------------------------------------------------------
    try {
      perplexityData = await callPerplexity(lead)
    } catch (err) {
      console.error('Perplexity enrichment failed:', err)
    }

    // ------------------------------------------------------------------
    // Step 3: Combine results
    // ------------------------------------------------------------------

    // Collect all emails with source tagging
    const allEmails: FoundContact[] = []
    const seenEmails = new Set<string>()
    if (lead.email) {
      const val = lead.email.toLowerCase()
      allEmails.push({ value: val, source: 'existing' })
      seenEmails.add(val)
    }
    if (scraped?.emails) {
      for (const e of scraped.emails) {
        const val = e.toLowerCase()
        if (!seenEmails.has(val)) {
          allEmails.push({ value: val, source: 'website' })
          seenEmails.add(val)
        }
      }
    }
    if (perplexityData?.email) {
      const val = perplexityData.email.toLowerCase()
      if (!seenEmails.has(val)) {
        allEmails.push({ value: val, source: 'ai' })
        seenEmails.add(val)
      }
    }
    result.all_emails_found = allEmails

    // Collect all phones with source tagging
    const allPhones: FoundContact[] = []
    const seenPhones = new Set<string>()
    if (lead.phone) {
      const val = normalizePhone(lead.phone)
      allPhones.push({ value: val, source: 'existing' })
      seenPhones.add(val)
    }
    if (scraped?.phones) {
      for (const p of scraped.phones) {
        if (!seenPhones.has(p)) {
          allPhones.push({ value: p, source: 'website' })
          seenPhones.add(p)
        }
      }
    }
    if (perplexityData?.phone) {
      const val = perplexityData.phone
      if (!seenPhones.has(val)) {
        allPhones.push({ value: val, source: 'ai' })
        seenPhones.add(val)
      }
    }
    result.all_phones_found = allPhones.filter((p) => p.value.length >= 8)

    // Pick the best email (prefer existing > website > ai, personal over generic)
    if (!result.email) {
      const emailValues = result.all_emails_found.map((e) => e.value)
      result.email = pickBestEmail(emailValues)
    }

    // Pick the best phone (prefer existing > website > ai)
    if (!result.phone) {
      const phoneValues = result.all_phones_found.map((p) => p.value)
      result.phone = pickBestPhone(phoneValues)
    }

    // Website: prefer what we already have, fall back to Perplexity
    if (!result.website && perplexityData?.website) {
      result.website = perplexityData.website
    }

    // Company description: prefer Perplexity (richer), fall back to scraped
    result.company_description =
      perplexityData?.company_description ?? scraped?.description ?? null

    // Business processes: only from Perplexity
    result.business_processes = perplexityData?.business_processes ?? null

    // Determine enrichment source
    const hasWebsiteData =
      scraped !== null &&
      (scraped.emails.length > 0 ||
        scraped.phones.length > 0 ||
        scraped.description !== null)
    const hasPerplexityData = perplexityData !== null

    if (hasWebsiteData && hasPerplexityData) {
      result.enrichment_source = 'both'
    } else if (hasWebsiteData) {
      result.enrichment_source = 'website'
    } else if (hasPerplexityData) {
      result.enrichment_source = 'perplexity'
    } else {
      result.enrichment_source = null
    }

    // Determine status
    const hasAnyNewData =
      result.email !== null ||
      result.phone !== null ||
      result.company_description !== null ||
      result.business_processes !== null

    if (
      result.email &&
      result.phone &&
      result.company_description &&
      result.business_processes
    ) {
      result.status = 'complete'
    } else if (hasAnyNewData) {
      result.status = 'partial'
    } else {
      result.status = 'failed'
    }
  } catch (err) {
    result.status = 'failed'
    result.error =
      err instanceof Error ? err.message : 'Unknown enrichment error'
    console.error('Enrichment failed:', err)
  }

  return result
}
