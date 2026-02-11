/**
 * Lead Search — TypeScript port of linkedin_scraper_smart.py
 *
 * Searches Google (via Serper API) for LinkedIn profiles by vertical,
 * parses headlines, finds company websites, scrapes contact info.
 */

import * as cheerio from 'cheerio'

// ============================================
// Config
// ============================================

const SERPER_API_KEY = process.env.SERPER_API_KEY ?? ''

const GENERIC_EMAIL_PREFIXES = [
  'info@', 'kontakt@', 'contact@', 'office@', 'mail@', 'hello@', 'hallo@',
  'support@', 'service@', 'team@', 'post@', 'empfang@', 'zentrale@',
  'noreply@', 'no-reply@', 'webmaster@', 'admin@', 'postmaster@',
  'datenschutz@', 'privacy@', 'impressum@', 'buchhaltung@', 'rechnung@',
  'bewerbung@', 'jobs@', 'karriere@', 'presse@', 'pr@', 'marketing@',
  'vertrieb@', 'sales@', 'billing@', 'abuse@',
]

const SKIP_DOMAINS = [
  // Social media
  'linkedin.com', 'xing.com', 'facebook.com', 'twitter.com', 'x.com',
  'instagram.com', 'youtube.com', 'tiktok.com', 'threads.net',
  // Review & directory
  'kununu.com', 'whofinance.de', 'provenexpert.com', 'trustpilot.com',
  'yelp.com', 'yelp.de', 'google.com', 'google.de', 'gelbeseiten.de',
  'dasoertliche.de', 'dastelefonbuch.de', 'personensuche.de', '11880.com',
  'meinestadt.de', 'branchenbuch.de', 'stadtbranchenbuch.com',
  // Business databases
  'northdata.com', 'northdata.de', 'firmenwissen.de', 'unternehmensregister.de',
  'bundesanzeiger.de', 'dnb.com', 'creditreform.de', 'companyhouse.de',
  'wer-zu-wem.de', 'implisense.com', 'ecoda.de', 'handelsregister.de',
  // Job portals
  'stepstone.de', 'indeed.com', 'indeed.de', 'glassdoor.com', 'glassdoor.de',
  'monster.de', 'karriere.de', 'jobs.de', 'gehalt.de',
  // Large portals
  'wikipedia.org', 'wikidata.org', 'amazon.com', 'amazon.de',
  'ebay.de', 'ebay.com', 'apple.com', 'microsoft.com',
  'fuer-gruender.de', 'gruenderszene.de', 'deutsche-startups.de',
  'springerprofessional.de', 'springer.com', 'thieme-connect.com',
  'rocketreach.co', 'zoominfo.com', 'apollo.io', 'lusha.com',
  // Presentation & tools
  'prezi.com', 'slideshare.net', 'scribd.com', 'issuu.com',
  // Misc
  'native-instruments.com', 'iubenda.com', 'ionos.de', 'strato.de',
  'datenschutz.de', 'dsgvo-portal.de', 'e-recht24.de',
  // News
  'spiegel.de', 'focus.de', 'welt.de', 'bild.de', 'zeit.de',
  'handelsblatt.com', 'wiwo.de', 'faz.net', 'sueddeutsche.de',
  't-online.de', 'n-tv.de', 'tagesschau.de',
]

// ============================================
// Smart Queries — Decision-Maker Focused
// ============================================

export const SMART_QUERIES: Record<string, string[]> = {
  coaches_berater: [
    'site:linkedin.com/in/ "Business Coach" "Inhaber" OR "Gründer" OR "Founder"',
    'site:linkedin.com/in/ "Unternehmensberater" "selbstständig" OR "freiberuflich"',
    'site:linkedin.com/in/ "Executive Coach" "Founder" OR "Owner" Deutschland',
    'site:linkedin.com/in/ "Leadership Coach" "selbstständig" Deutschland',
    'site:linkedin.com/in/ "Business Coach" "www." Deutschland',
    'site:linkedin.com/in/ "Berater" "meine Website" OR "mein Unternehmen"',
    'site:linkedin.com/in/ "Executive Coach" "C-Level" OR "Führungskräfte"',
    'site:linkedin.com/in/ "Business Coach" "Premium" OR "High-Ticket"',
    'site:linkedin.com/in/ "Solopreneur" Coach Deutschland',
    'site:linkedin.com/in/ "Einzelunternehmer" Berater Deutschland',
    'site:linkedin.com/in/ "Business Coach" "Inhaber" Berlin',
    'site:linkedin.com/in/ "Unternehmensberater" "Gründer" München',
    'site:linkedin.com/in/ "Coach" "selbstständig" Hamburg',
  ],
  immobilienmakler: [
    'site:linkedin.com/in/ "Immobilienmakler" "Inhaber" OR "Geschäftsführer"',
    'site:linkedin.com/in/ "Immobilienbüro" "Gründer" OR "Owner"',
    'site:linkedin.com/in/ "Real Estate" "selbstständig" Deutschland',
    'site:linkedin.com/in/ "Makler" "eigenes Büro" OR "mein Unternehmen"',
  ],
  recruiting_headhunter: [
    'site:linkedin.com/in/ "Personalberater" "Inhaber" OR "Partner" OR "Gründer"',
    'site:linkedin.com/in/ "Headhunter" "selbstständig" OR "eigene Beratung" Deutschland',
    'site:linkedin.com/in/ "Executive Search" "Founder" OR "Managing Partner"',
    'site:linkedin.com/in/ "Recruiting" "Geschäftsführer" OR "Owner" Deutschland',
    'site:linkedin.com/in/ "Personalberatung" "Partner" OR "Director"',
    'site:linkedin.com/in/ "Talent Acquisition" "Head of" OR "selbstständig"',
    'site:linkedin.com/in/ "Recruiting Boutique" Deutschland',
    'site:linkedin.com/in/ "Executive Recruiter" "Gründer" OR "Inhaber"',
    'site:linkedin.com/in/ "IT Recruiter" "selbstständig" OR "Inhaber" Deutschland',
    'site:linkedin.com/in/ "Tech Recruiter" "Founder" OR "Owner"',
    'site:linkedin.com/in/ "Personalberater" "Inhaber" München',
    'site:linkedin.com/in/ "Headhunter" "Gründer" Berlin',
    'site:linkedin.com/in/ "Executive Search" "Partner" Frankfurt',
  ],
  steuerberater_kanzlei: [
    'site:linkedin.com/in/ "Steuerberater" "Inhaber" OR "Kanzleiinhaber" OR "Partner"',
    'site:linkedin.com/in/ "Steuerkanzlei" "Gründer" OR "Geschäftsführer"',
    'site:linkedin.com/in/ "Steuerberatung" "selbstständig" OR "eigene Kanzlei"',
    'site:linkedin.com/in/ "Steuerberater" "digital" OR "modern" Deutschland',
    'site:linkedin.com/in/ "Steuerkanzlei" "Innovation" OR "Digitalisierung"',
    'site:linkedin.com/in/ "Steuerberater" "Unternehmer" OR "Mittelstand"',
    'site:linkedin.com/in/ "WP" "StB" "Partner" Deutschland',
    'site:linkedin.com/in/ "Steuerberater" "Inhaber" München',
    'site:linkedin.com/in/ "Steuerkanzlei" "Partner" Hamburg',
    'site:linkedin.com/in/ "Steuerberatung" "Geschäftsführer" Düsseldorf',
  ],
  marketing_agenturen: [
    'site:linkedin.com/in/ "Agentur" "Inhaber" OR "Gründer" OR "Geschäftsführer" Marketing',
    'site:linkedin.com/in/ "Digitalagentur" "Founder" OR "Owner" Deutschland',
    'site:linkedin.com/in/ "Marketing Agentur" "CEO" OR "Managing Director"',
    'site:linkedin.com/in/ "Content Agentur" "Inhaber" OR "Gründer" Deutschland',
    'site:linkedin.com/in/ "Social Media Agentur" "Geschäftsführer" OR "Founder"',
    'site:linkedin.com/in/ "Performance Marketing" "Agentur" "Inhaber"',
    'site:linkedin.com/in/ "SEO Agentur" "Gründer" OR "Owner" Deutschland',
    'site:linkedin.com/in/ "Kreativagentur" "Gründer" OR "Inhaber"',
    'site:linkedin.com/in/ "Werbeagentur" "selbstständig" OR "eigene Agentur"',
    'site:linkedin.com/in/ "Agentur" "Head of Operations" OR "COO"',
    'site:linkedin.com/in/ "Marketing Agentur" "Gründer" Berlin',
    'site:linkedin.com/in/ "Digitalagentur" "Inhaber" München',
    'site:linkedin.com/in/ "Agentur" "Geschäftsführer" Hamburg',
  ],
}

// ============================================
// Types
// ============================================

export interface SearchProfile {
  name: string
  headline: string
  linkedin_url: string
  company: string | null
  role: string | null
  is_owner: boolean
  website: string | null
  email: string | null
  phone: string | null
  source: string
}

export interface SearchEvent {
  type: 'profile' | 'summary'
  name?: string
  company?: string | null
  linkedin_url?: string
  website?: string | null
  email?: string | null
  phone?: string | null
  imported?: boolean
  duplicate?: boolean
  error?: string
  // Summary fields
  total?: number
  imported_count?: number
  duplicate_count?: number
  error_count?: number
}

// ============================================
// Headline Parsing
// ============================================

export function parseHeadline(headline: string): {
  company: string | null
  role: string | null
  is_owner: boolean
  is_freelance: boolean
} {
  const result = { company: null as string | null, role: null as string | null, is_owner: false, is_freelance: false }
  if (!headline) return result

  const lower = headline.toLowerCase()

  // Owner/Founder detection
  const ownerPatterns = [
    /inhaber\s*(?:von|bei|@)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
    /gründer(?:in)?\s*(?:von|bei|@)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
    /founder\s*(?:of|at|@)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
    /owner\s*(?:of|at|@)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
    /geschäftsführer(?:in)?\s*(?:von|bei|@)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
    /ceo\s*(?:of|at|@|bei)?\s*([A-Za-zäöüÄÖÜß\s&\-.]+)/i,
  ]

  for (const pattern of ownerPatterns) {
    const match = headline.match(pattern)
    if (match) {
      result.is_owner = true
      let company = match[1].trim()
      company = company.replace(/\s*(gmbh|ug|ag|kg|ohg|e\.k\.|coaching|consulting|beratung).*$/i, '')
      if (company.length > 2) {
        result.company = company.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      }
      break
    }
  }

  // Freelance detection
  const freelanceIndicators = ['selbstständig', 'freiberuflich', 'freelance', 'independent', 'selbständig', 'freier']
  if (freelanceIndicators.some(ind => lower.includes(ind))) {
    result.is_freelance = true
    result.is_owner = true
  }

  // Company from "bei/at" pattern
  if (!result.company) {
    const beiMatch = headline.match(/(?:bei|at|@)\s+([A-Za-zäöüÄÖÜß\s&\-.]+?)(?:\s*[|•·\-]|\s*$)/i)
    if (beiMatch) {
      result.company = beiMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }
  }

  // Role extraction
  const rolePatterns = [
    /(business coach|executive coach|leadership coach|career coach|life coach)/i,
    /(unternehmensberater|strategieberater|managementberater)/i,
    /(consultant|berater|trainer|speaker)/i,
    /(personalberater|headhunter|recruiter|executive search|talent acquisition)/i,
    /(recruiting|personalvermittlung|personalberatung)/i,
    /(immobilienmakler|makler|real estate|immobilienberater)/i,
    /(steuerberater|wirtschaftsprüfer|tax advisor)/i,
    /(buchhalter|bilanzbuchhalter|kanzlei)/i,
    /(agentur|agency|digital marketing|content marketing|social media)/i,
    /(kreativdirektor|art director|marketing director)/i,
  ]
  for (const pattern of rolePatterns) {
    const match = headline.match(pattern)
    if (match) {
      result.role = match[1]
      break
    }
  }

  return result
}

// ============================================
// Serper API
// ============================================

async function serperSearch(query: string, numResults = 10): Promise<any> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: numResults, gl: 'de', hl: 'de' }),
  })
  if (!response.ok) throw new Error(`Serper API error: ${response.status}`)
  return response.json()
}

// ============================================
// LinkedIn Profile Search
// ============================================

export async function searchLinkedInProfiles(query: string): Promise<Array<{ name: string; headline: string; linkedin_url: string }>> {
  const profiles: Array<{ name: string; headline: string; linkedin_url: string }> = []

  try {
    const results = await serperSearch(query)

    for (const item of results.organic ?? []) {
      const link = item.link ?? ''
      if (!link.includes('linkedin.com/in/')) continue

      const title: string = item.title ?? ''
      const snippet: string = item.snippet ?? ''

      // Extract name from title: "Max Mustermann - LinkedIn" or "Max Mustermann | LinkedIn"
      let name = title.split(' - ')[0].split(' | ')[0].trim()
      name = name.replace(/\s*–\s*LinkedIn$/i, '')

      profiles.push({
        name,
        headline: snippet.substring(0, 250),
        linkedin_url: link,
      })
    }
  } catch (err) {
    console.error('LinkedIn search error:', err)
  }

  return profiles
}

// ============================================
// Company Website Finder
// ============================================

function isValidWebsiteResult(link: string): boolean {
  if (!link) return false
  const lower = link.toLowerCase()
  if (SKIP_DOMAINS.some(d => lower.includes(d))) return false
  try {
    const url = new URL(link)
    if (/^\d+\.\d+\.\d+\.\d+/.test(url.hostname)) return false
  } catch {
    return false
  }
  return true
}

export async function findCompanyWebsite(name: string, company: string | null): Promise<string | null> {
  if (!SERPER_API_KEY) return null

  // Strategy 1: Company name search
  if (company) {
    const query = `"${company}" website impressum OR kontakt`
    try {
      const results = await serperSearch(query, 5)
      const companyTokens = company.toLowerCase().split(/[\s\-&]+/).filter(t => t.length > 2)

      for (const item of results.organic ?? []) {
        const link: string = item.link ?? ''
        const title: string = (item.title ?? '').toLowerCase()

        if (!isValidWebsiteResult(link)) continue

        const url = new URL(link)
        const domain = url.hostname.toLowerCase().replace(/^www\./, '')

        const domainMatch = companyTokens.some(t => domain.includes(t))
        const titleMatch = companyTokens.some(t => title.includes(t))

        if (domainMatch || titleMatch) {
          return `https://${url.hostname}`
        }
      }
    } catch { /* continue */ }
  }

  // Strategy 2: Person name search
  const query = `"${name}" website OR homepage kontakt`
  try {
    const results = await serperSearch(query, 5)
    const nameParts = name.split(' ').filter(t => t.length > 2).map(t => t.toLowerCase())

    for (const item of results.organic ?? []) {
      const link: string = item.link ?? ''
      const title: string = (item.title ?? '').toLowerCase()
      const snippet: string = (item.snippet ?? '').toLowerCase()

      if (!isValidWebsiteResult(link)) continue

      const url = new URL(link)
      const domain = url.hostname.toLowerCase().replace(/^www\./, '')

      const inDomain = nameParts.some(p => domain.includes(p))
      const inTitle = nameParts.some(p => title.includes(p))
      const inSnippet = nameParts.some(p => snippet.includes(p))

      if (inDomain || inTitle || inSnippet) {
        return `https://${url.hostname}`
      }
    }
  } catch { /* continue */ }

  return null
}

// ============================================
// Website Contact Scraping
// ============================================

export async function scrapeWebsiteContact(website: string): Promise<{
  email: string | null
  phone: string | null
}> {
  const result = { email: null as string | null, phone: null as string | null }
  if (!website) return result

  const contactPaths = ['/impressum', '/kontakt', '/contact', '/about', '/ueber-uns', '/']
  const allEmails: string[] = []
  const allPhones: string[] = []

  for (const path of contactPaths) {
    const url = new URL(path, website.startsWith('http') ? website : `https://${website}`).toString()

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      })
      if (!response.ok) continue

      const html = await response.text()
      const $ = cheerio.load(html)
      $('script, style, nav, footer').remove()
      const text = $.text()

      // Extract phones
      const phonePatterns = [
        /(?:Tel(?:efon)?|Fon|Phone|Mobil)[:\s]*([+\d\s\-/()]{8,20})/i,
        /\+49\s*[\d\s\-/()]{6,15}/,
        /(?<!\d)0\d{2,4}[\s\-/]?\d{4,8}(?!\d)/,
      ]
      for (const pattern of phonePatterns) {
        const match = text.match(pattern)
        if (match) {
          const phone = (match[1] ?? match[0]).replace(/[^\d+]/g, '')
          if (phone.replace('+', '').length >= 8 && phone.replace('+', '').length <= 15) {
            allPhones.push(phone)
          }
        }
      }

      // Extract emails
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const emails = text.match(emailPattern) ?? []
      for (const email of emails) {
        const lower = email.toLowerCase()
        if (['noreply', 'no-reply', 'example.com', 'wix', 'sentry', 'cloudflare'].some(x => lower.includes(x))) continue
        if (!allEmails.includes(lower)) allEmails.push(lower)
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 300))
    } catch { continue }
  }

  // Pick best email — only personal, not generic
  const personalEmails = allEmails.filter(e => !GENERIC_EMAIL_PREFIXES.some(p => e.startsWith(p)))
  if (personalEmails.length > 0) {
    result.email = personalEmails[0]
  }

  // Pick best phone (prefer mobile)
  if (allPhones.length > 0) {
    const mobile = allPhones.find(p => p.startsWith('+491') || p.startsWith('01') || p.startsWith('00491'))
    result.phone = mobile ?? allPhones[0]
  }

  return result
}

// ============================================
// Google Contact Fallback
// ============================================

export async function searchContactGoogle(name: string, company: string | null): Promise<{
  email: string | null
  phone: string | null
}> {
  const result = { email: null as string | null, phone: null as string | null }
  if (!SERPER_API_KEY) return result

  const searchName = company ? `"${name}" ${company}` : `"${name}"`
  const queries = [`${searchName} telefon impressum`, `${searchName} email kontakt`]

  for (const query of queries) {
    try {
      const data = await serperSearch(query, 5)

      for (const item of data.organic ?? []) {
        const snippet = `${item.snippet ?? ''} ${item.title ?? ''}`

        if (!result.phone) {
          const phoneMatch = snippet.match(/\+49[\d\s\-/()]{6,15}|0\d{2,4}[\s\-/]?\d{4,8}/)
          if (phoneMatch) {
            const phone = phoneMatch[0].replace(/[^\d+]/g, '')
            if (phone.replace('+', '').length >= 8 && phone.replace('+', '').length <= 15) {
              result.phone = phone
            }
          }
        }

        if (!result.email) {
          const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
          if (emailMatch) {
            const email = emailMatch[0].toLowerCase()
            const isGeneric = GENERIC_EMAIL_PREFIXES.some(p => email.startsWith(p))
            const isJunk = ['example', 'sentry', 'wix'].some(x => email.includes(x))
            if (!isGeneric && !isJunk) {
              result.email = email
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 300))
    } catch { continue }
  }

  return result
}

// ============================================
// Enrich Single Profile
// ============================================

export async function enrichProfile(profile: { name: string; headline: string; linkedin_url: string }): Promise<SearchProfile> {
  const parsed = parseHeadline(profile.headline)

  const result: SearchProfile = {
    name: profile.name,
    headline: profile.headline,
    linkedin_url: profile.linkedin_url,
    company: parsed.company,
    role: parsed.role,
    is_owner: parsed.is_owner,
    website: null,
    email: null,
    phone: null,
    source: 'lead_search',
  }

  // Find company website
  const website = await findCompanyWebsite(profile.name, parsed.company)
  if (website) {
    result.website = website

    // Scrape website for contact info
    const contact = await scrapeWebsiteContact(website)
    if (contact.phone) result.phone = contact.phone
    if (contact.email) result.email = contact.email
  }

  // Google fallback for missing contact info
  if (!result.phone || !result.email) {
    const googleContact = await searchContactGoogle(profile.name, parsed.company)
    if (googleContact.phone && !result.phone) result.phone = googleContact.phone
    if (googleContact.email && !result.email) result.email = googleContact.email
  }

  return result
}

// ============================================
// Main: Search Vertical (Generator)
// ============================================

export async function* searchVertical(
  vertical: string,
  maxProfiles: number,
): AsyncGenerator<SearchProfile> {
  const queries = SMART_QUERIES[vertical] ?? SMART_QUERIES['coaches_berater']
  const seenUrls = new Set<string>()
  let found = 0

  for (const query of queries) {
    if (found >= maxProfiles) break

    const profiles = await searchLinkedInProfiles(query)

    for (const profile of profiles) {
      if (found >= maxProfiles) break
      if (seenUrls.has(profile.linkedin_url)) continue
      seenUrls.add(profile.linkedin_url)

      const enriched = await enrichProfile(profile)
      found++
      yield enriched

      // Small delay between profiles
      await new Promise(r => setTimeout(r, 500))
    }

    // Delay between queries to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000))
  }
}
