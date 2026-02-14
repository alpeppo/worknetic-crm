import * as cheerio from 'cheerio'
import { resolveMx } from 'dns/promises'
import * as net from 'net'

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
  // Only return personal emails — generic emails are useless for cold outreach
  const personal = emails.filter((e) => !isGenericEmail(e))
  if (personal.length > 0) return personal[0]
  // Do NOT fall back to generic emails
  return null
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

async function checkMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain)
    return records.length > 0
  } catch {
    // If DNS lookup fails, assume valid to avoid false negatives
    return true
  }
}

async function validateEmail(
  email: string,
  websiteUrl?: string | null,
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = []
  const lower = email.toLowerCase()

  if (!lower.includes('@')) {
    return { valid: false, issues: ['invalid_format'] }
  }

  const emailDomain = lower.split('@')[1]

  // Check generic prefix
  if (isGenericEmail(lower)) {
    issues.push('generic_prefix')
  }

  // MX record check
  const hasMx = await checkMxRecord(emailDomain)
  if (!hasMx) {
    issues.push('no_mx_record')
    return { valid: false, issues }
  }

  // Domain mismatch with website
  if (websiteUrl) {
    try {
      const url = websiteUrl.startsWith('http')
        ? websiteUrl
        : `https://${websiteUrl}`
      const parsed = new URL(url)
      const websiteDomain = parsed.hostname.replace(/^www\./, '')
      if (
        emailDomain !== websiteDomain &&
        !emailDomain.endsWith('.' + websiteDomain) &&
        !websiteDomain.endsWith('.' + emailDomain)
      ) {
        issues.push('domain_mismatch')
      }
    } catch {
      // URL parsing failed, skip domain check
    }
  }

  return { valid: !issues.includes('no_mx_record'), issues }
}

// ---------------------------------------------------------------------------
// SMTP Email Pattern Guessing & Verification
// ---------------------------------------------------------------------------

const SMTP_TIMEOUT_MS = 10_000
const SENDER_DOMAIN = 'worknetic.de'
const SENDER_EMAIL = `verify@${SENDER_DOMAIN}`

// Common German email patterns (ordered by likelihood for solopreneurs)
const EMAIL_PATTERNS = [
  '{f}@{d}',        // max@firma.de
  '{f}.{l}@{d}',    // max.mustermann@firma.de
  '{fi}.{l}@{d}',   // m.mustermann@firma.de
  '{l}@{d}',        // mustermann@firma.de
  '{f}{l}@{d}',     // maxmustermann@firma.de
  '{fi}{l}@{d}',    // mmustermann@firma.de
  '{f}-{l}@{d}',    // max-mustermann@firma.de
  '{f}_{l}@{d}',    // max_mustermann@firma.de
  '{l}.{f}@{d}',    // mustermann.max@firma.de
]

const GERMAN_CHAR_MAP: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
}

function normalizeGermanName(name: string): string {
  let result = name.toLowerCase().trim()
  for (const [char, replacement] of Object.entries(GERMAN_CHAR_MAP)) {
    result = result.replaceAll(char, replacement)
  }
  // Remove remaining accents via NFD decomposition
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return result
}

function extractFirstLast(fullName: string): { first: string | null; last: string | null } {
  const titles = ['dr.', 'dr', 'prof.', 'prof', 'dipl.', 'dipl', 'ing.', 'ing', 'mag.', 'mag', 'mba', 'msc', 'bsc', 'ra']
  let name = fullName.trim()
  // Remove LinkedIn-style suffixes
  name = name.split(/\s*[–—|•]\s*/)[0].trim()

  let parts = name.split(/\s+/)
  parts = parts.filter((p) => !titles.includes(p.toLowerCase().replace('.', '')))

  if (parts.length < 2) return { first: parts[0] ? normalizeGermanName(parts[0]) : null, last: null }

  const first = normalizeGermanName(parts[0])
  let last = normalizeGermanName(parts[parts.length - 1])

  // Handle noble prefixes (von, van, de, zu, vom)
  const noblePrefixes = ['von', 'van', 'de', 'zu', 'vom']
  if (parts.length >= 3 && noblePrefixes.includes(parts[parts.length - 2].toLowerCase())) {
    last = normalizeGermanName(parts[parts.length - 2]) + normalizeGermanName(parts[parts.length - 1])
  }

  return { first, last }
}

function generateEmailCandidates(first: string, last: string, domain: string): string[] {
  if (!first || !last || !domain) return []
  const fi = first[0]
  return EMAIL_PATTERNS.map((pattern) =>
    pattern
      .replace('{f}', first)
      .replace('{l}', last)
      .replace('{fi}', fi)
      .replace('{d}', domain),
  )
}

/** Low-level SMTP communication: send a command, read response */
function smtpCommand(
  socket: net.Socket,
  command: string | null,
  timeoutMs: number = SMTP_TIMEOUT_MS,
): Promise<{ code: number; message: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SMTP timeout'))
    }, timeoutMs)

    const onData = (data: Buffer) => {
      clearTimeout(timeout)
      socket.removeListener('data', onData)
      socket.removeListener('error', onError)
      const response = data.toString()
      const code = parseInt(response.substring(0, 3), 10)
      resolve({ code, message: response })
    }

    const onError = (err: Error) => {
      clearTimeout(timeout)
      socket.removeListener('data', onData)
      reject(err)
    }

    socket.on('data', onData)
    socket.on('error', onError)

    if (command !== null) {
      socket.write(command + '\r\n')
    }
  })
}

interface SmtpGuessResult {
  verified_email: string | null
  catch_all: boolean
  patterns_tried: number
  error?: string
}

async function getMxHost(domain: string): Promise<string | null> {
  try {
    const records = await resolveMx(domain)
    if (records.length === 0) return null
    records.sort((a, b) => a.priority - b.priority)
    return records[0].exchange
  } catch {
    return null
  }
}

async function guessEmailSmtp(
  fullName: string,
  domain: string,
  maxChecks: number = 9,
): Promise<SmtpGuessResult> {
  const result: SmtpGuessResult = {
    verified_email: null,
    catch_all: false,
    patterns_tried: 0,
  }

  const { first, last } = extractFirstLast(fullName)
  if (!first || !last) return result

  const mxHost = await getMxHost(domain)
  if (!mxHost) {
    result.error = 'no_mx_record'
    return result
  }

  const candidates = generateEmailCandidates(first, last, domain)
  if (candidates.length === 0) return result

  // Connect to SMTP server
  const socket = new net.Socket()

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('connect_timeout')), SMTP_TIMEOUT_MS)
      socket.connect(25, mxHost, () => {
        clearTimeout(timeout)
        resolve()
      })
      socket.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    // Read server greeting
    await smtpCommand(socket, null)

    // EHLO
    await smtpCommand(socket, `EHLO ${SENDER_DOMAIN}`)

    // MAIL FROM
    const mailFrom = await smtpCommand(socket, `MAIL FROM:<${SENDER_EMAIL}>`)
    if (mailFrom.code !== 250) {
      result.error = `mail_from_rejected_${mailFrom.code}`
      socket.destroy()
      return result
    }

    // Catch-all check: try a fake address
    const fakeCheck = await smtpCommand(socket, `RCPT TO:<xyznonexistent99test@${domain}>`)
    if (fakeCheck.code === 250) {
      result.catch_all = true
      result.verified_email = candidates[0]
      socket.write('QUIT\r\n')
      socket.destroy()
      return result
    }

    // Reset for real checks
    await smtpCommand(socket, 'RSET')
    await smtpCommand(socket, `MAIL FROM:<${SENDER_EMAIL}>`)

    // Check each candidate
    for (const email of candidates.slice(0, maxChecks)) {
      result.patterns_tried++
      const rcpt = await smtpCommand(socket, `RCPT TO:<${email}>`)

      if (rcpt.code === 250) {
        result.verified_email = email
        break
      } else if ([450, 451, 452].includes(rcpt.code)) {
        result.error = 'greylisted'
        break
      }

      // Reset for next check
      await smtpCommand(socket, 'RSET')
      await smtpCommand(socket, `MAIL FROM:<${SENDER_EMAIL}>`)
    }

    socket.write('QUIT\r\n')
    socket.destroy()
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 100) : 'unknown_error'
    socket.destroy()
  }

  return result
}

// ---------------------------------------------------------------------------
// Name-near-email Impressum matching
// ---------------------------------------------------------------------------

function findNameNearEmail(html: string, leadName: string, websiteDomain?: string): string | null {
  if (!html || !leadName) return null

  const $ = cheerio.load(html)
  $('script, style').remove()
  const text = $.text()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const parts = leadName.trim().split(/\s+/)
  if (parts.length < 2) return null

  const first = parts[0].toLowerCase()
  const last = parts[parts.length - 1].toLowerCase()
  const firstNorm = normalizeGermanName(parts[0])
  const lastNorm = normalizeGermanName(parts[parts.length - 1])

  // Find lines containing the lead's name
  const nameLineIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if ((lower.includes(first) && lower.includes(last)) ||
        (lower.includes(firstNorm) && lower.includes(lastNorm))) {
      nameLineIndices.push(i)
    }
  }

  if (nameLineIndices.length === 0) return null

  // Search for emails within ±5 lines of where the name appears
  const PROXIMITY = 5
  for (const idx of nameLineIndices) {
    const start = Math.max(0, idx - PROXIMITY)
    const end = Math.min(lines.length, idx + PROXIMITY + 1)
    const nearbyText = lines.slice(start, end).join(' ')

    const emails = nearbyText.match(EMAIL_REGEX) ?? []
    for (const email of emails) {
      const lower = email.toLowerCase()
      if (isGenericEmail(lower)) continue
      if (websiteDomain && lower.split('@')[1] === websiteDomain) return lower
      return lower
    }
  }

  return null
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

async function scrapeWebsite(websiteUrl: string, leadName?: string): Promise<ScrapedData & { nameMatchedEmail?: string }> {
  const baseUrl = normalizeUrl(websiteUrl)
  const allEmails: string[] = []
  const allPhones: string[] = []
  let description: string | null = null
  let nameMatchedEmail: string | undefined

  // Extract website domain for matching
  let websiteDomain: string | undefined
  try {
    websiteDomain = new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch { /* ignore */ }

  for (let i = 0; i < CONTACT_PATHS.length; i++) {
    const path = CONTACT_PATHS[i]
    const url = path === '/' ? baseUrl + '/' : baseUrl + path

    if (i > 0) {
      await sleep(INTER_PAGE_DELAY_MS)
    }

    const html = await fetchPage(url)
    if (!html) continue

    // Try name-near-email matching on raw HTML
    if (leadName && !nameMatchedEmail) {
      nameMatchedEmail = findNameNearEmail(html, leadName, websiteDomain) ?? undefined
    }

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
    nameMatchedEmail,
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
    // Step 1: Scrape website if available (with name-near-email matching)
    // ------------------------------------------------------------------
    let nameMatchedEmail: string | undefined
    if (lead.website) {
      try {
        const scrapeResult = await scrapeWebsite(lead.website, lead.name)
        nameMatchedEmail = scrapeResult.nameMatchedEmail
        scraped = scrapeResult
      } catch (err) {
        console.error('Website scraping failed:', err)
      }
    }

    // ------------------------------------------------------------------
    // Step 2: Check if we already have a personal email from scraping
    // ------------------------------------------------------------------
    let personalEmailFromScrape: string | null = null
    if (nameMatchedEmail) {
      personalEmailFromScrape = nameMatchedEmail
      console.log(`[Enrichment] Personal email found via name-matching: ${nameMatchedEmail}`)
    } else if (scraped?.emails) {
      const personal = scraped.emails.filter((e) => !isGenericEmail(e))
      if (personal.length > 0) {
        personalEmailFromScrape = personal[0]
        console.log(`[Enrichment] Personal email found on website: ${personalEmailFromScrape}`)
      }
    }

    // ------------------------------------------------------------------
    // Step 3: SMTP Email Guessing — only if NO personal email from scraping
    // ------------------------------------------------------------------
    let smtpEmail: string | null = null
    if (!personalEmailFromScrape && lead.name) {
      const websiteUrl = lead.website ?? result.website
      if (websiteUrl) {
        try {
          let emailDomain: string | undefined
          try {
            const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
            emailDomain = new URL(url).hostname.replace(/^www\./, '')
          } catch { /* ignore */ }

          if (emailDomain) {
            console.log(`[Enrichment] No personal email scraped — running SMTP guesser: ${lead.name} @ ${emailDomain}`)
            const smtpResult = await guessEmailSmtp(lead.name, emailDomain)

            if (smtpResult.verified_email) {
              if (smtpResult.catch_all) {
                console.log(`[Enrichment] Catch-all domain — using best guess: ${smtpResult.verified_email}`)
              } else {
                console.log(`[Enrichment] SMTP VERIFIED email: ${smtpResult.verified_email}`)
              }
              smtpEmail = smtpResult.verified_email
            } else {
              console.log(`[Enrichment] SMTP: no email after ${smtpResult.patterns_tried} attempts${smtpResult.error ? ` (${smtpResult.error})` : ''}`)

              // Fallback: if SMTP port blocked, use best-guess with MX validation
              if (smtpResult.error && ['connect_timeout', 'ECONNREFUSED', 'EHOSTUNREACH', 'ETIMEDOUT'].some(e => smtpResult.error?.includes(e))) {
                const hasMx = await checkMxRecord(emailDomain)
                if (hasMx) {
                  const { first, last } = extractFirstLast(lead.name)
                  if (first && last) {
                    const bestGuess = `${first}.${last}@${emailDomain}`
                    console.log(`[Enrichment] SMTP blocked — MX-validated best guess: ${bestGuess}`)
                    smtpEmail = bestGuess
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('[Enrichment] SMTP guess failed:', err)
        }
      }
    }

    // ------------------------------------------------------------------
    // Step 4: Call Perplexity Sonar API
    // ------------------------------------------------------------------
    try {
      perplexityData = await callPerplexity(lead)
    } catch (err) {
      console.error('Perplexity enrichment failed:', err)
    }

    // ------------------------------------------------------------------
    // Step 4: Combine results
    // ------------------------------------------------------------------

    // Collect all emails with source tagging
    const allEmails: FoundContact[] = []
    const seenEmails = new Set<string>()
    // SMTP-verified email gets added first (highest priority)
    if (smtpEmail) {
      allEmails.push({ value: smtpEmail, source: 'website' })
      seenEmails.add(smtpEmail)
    }
    if (lead.email) {
      const val = lead.email.toLowerCase()
      if (!seenEmails.has(val)) {
        allEmails.push({ value: val, source: 'existing' })
        seenEmails.add(val)
      }
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

    // Pick the best email:
    // Priority: 1) Personal email from website  2) SMTP-verified  3) AI-found personal
    if (!result.email) {
      if (personalEmailFromScrape) {
        // Personal email scraped from website — highest priority
        result.email = personalEmailFromScrape
        console.log(`[Enrichment] Using scraped personal email: ${personalEmailFromScrape}`)
      } else if (smtpEmail) {
        // SMTP-verified or MX-validated guess
        result.email = smtpEmail
        console.log(`[Enrichment] Using SMTP email: ${smtpEmail}`)
      } else {
        // Fall back to AI-found or other emails (only personal, no generic)
        const emailValues = result.all_emails_found.map((e) => e.value)
        result.email = pickBestEmail(emailValues)
        if (result.email) {
          console.log(`[Enrichment] Using fallback email: ${result.email}`)
        }
      }
    }

    // Validate chosen email (MX check, domain match) — skip for SMTP-verified
    if (result.email && result.email !== smtpEmail) {
      const websiteForValidation = result.website ?? lead.website ?? null
      const validation = await validateEmail(result.email, websiteForValidation)
      if (!validation.valid) {
        console.log(`[Enrichment] Email removed (${validation.issues.join(', ')}): ${result.email}`)
        result.email = null
      } else if (validation.issues.includes('generic_prefix')) {
        console.log(`[Enrichment] Generic email removed: ${result.email}`)
        result.email = null
      }
    }

    // If validation killed the email, fall back to SMTP
    if (!result.email && smtpEmail) {
      result.email = smtpEmail
      console.log(`[Enrichment] Falling back to SMTP email: ${smtpEmail}`)
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
