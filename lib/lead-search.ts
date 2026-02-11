/**
 * Perplexity Sonar-based Lead Discovery
 * ======================================
 * Uses Perplexity Sonar (via OpenRouter) to find new leads per vertical.
 * No Serper/Google API needed — Perplexity searches the web directly.
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
// Vertical-specific search prompts
// ---------------------------------------------------------------------------

const VERTICAL_SEARCH_CONFIG: Record<string, { base: string; variations: string[] }> = {
  coaches_berater: {
    base: 'selbstständige Business Coaches und Unternehmensberater im DACH-Raum (Deutschland, Österreich, Schweiz)',
    variations: [
      'die als Inhaber oder Gründer ihres eigenen Coaching-Unternehmens tätig sind',
      'im Bereich Executive Coaching oder Leadership Coaching',
      'die als Solopreneure oder Einzelunternehmer im Coaching arbeiten',
      'die Führungskräfte und C-Level beraten',
      'die sich auf Unternehmensentwicklung oder Strategieberatung spezialisiert haben',
      'aus Berlin, München oder Hamburg',
      'aus Frankfurt, Stuttgart oder Düsseldorf',
      'aus Köln, Wien oder Zürich',
      'die auf LinkedIn aktiv sind und eine eigene Website haben',
      'die sich auf Change Management oder Organisationsentwicklung spezialisiert haben',
    ],
  },
  immobilienmakler: {
    base: 'selbstständige Immobilienmakler und Immobilienbüro-Inhaber im DACH-Raum',
    variations: [
      'die als Inhaber oder Geschäftsführer ihres eigenen Maklerbüros tätig sind',
      'mit eigenem Immobilienbüro in deutschen Großstädten',
      'die auf Premium-Immobilien oder Gewerbeimmobilien spezialisiert sind',
      'aus Berlin, München oder Hamburg',
      'aus Frankfurt, Stuttgart oder Düsseldorf',
      'aus Köln, Hannover oder Leipzig',
      'die als selbstständige Immobilienberater arbeiten',
      'die ein kleines Team von unter 10 Mitarbeitern führen',
    ],
  },
  recruiting_headhunter: {
    base: 'selbstständige Personalberater und Headhunter im DACH-Raum',
    variations: [
      'die als Inhaber oder Partner ihrer eigenen Personalberatung tätig sind',
      'im Bereich Executive Search oder IT-Recruiting',
      'die Boutique-Recruiting-Firmen führen',
      'die auf C-Level oder Führungskräfte-Vermittlung spezialisiert sind',
      'aus Berlin, München oder Hamburg',
      'aus Frankfurt, Stuttgart oder Düsseldorf',
      'die sich auf Tech- oder IT-Recruiting spezialisiert haben',
      'die eine eigene Recruiting-Agentur mit unter 20 Mitarbeitern führen',
    ],
  },
  steuerberater_kanzlei: {
    base: 'selbstständige Steuerberater und Kanzleiinhaber im DACH-Raum',
    variations: [
      'die als Inhaber oder Partner einer eigenen Kanzlei tätig sind',
      'die sich auf Unternehmer, Freiberufler oder Startups spezialisiert haben',
      'mit digitaler Kanzlei oder Online-Steuerberatung',
      'aus Berlin, München oder Hamburg',
      'aus Frankfurt, Stuttgart oder Düsseldorf',
      'aus Köln, Wien oder Zürich',
      'die eine kleine bis mittlere Kanzlei mit unter 15 Mitarbeitern führen',
      'die sich auf E-Commerce oder Digitalunternehmen spezialisiert haben',
    ],
  },
  marketing_agenturen: {
    base: 'selbstständige Marketing-Agentur-Inhaber im DACH-Raum',
    variations: [
      'die als Gründer oder Geschäftsführer einer Marketing-Agentur tätig sind',
      'im Bereich Performance Marketing, SEO oder Social Media',
      'die Boutique-Agenturen mit unter 20 Mitarbeitern führen',
      'die auf B2B-Marketing oder Content Marketing spezialisiert sind',
      'aus Berlin, München oder Hamburg',
      'aus Frankfurt, Stuttgart oder Düsseldorf',
      'die sich auf Branding oder Webdesign spezialisiert haben',
      'die eine Full-Service-Digitalagentur führen',
    ],
  },
}

// ---------------------------------------------------------------------------
// Perplexity API call
// ---------------------------------------------------------------------------

function buildSearchPrompt(
  base: string,
  variation: string,
  count: number,
  excludeNames: string[],
): string {
  let prompt = `Finde ${count} echte ${base}, ${variation}.\n\n`
  prompt += `Für jede Person finde folgende Informationen:\n`
  prompt += `- Vollständiger Name\n`
  prompt += `- Firmenname\n`
  prompt += `- LinkedIn-Profil-URL (falls verfügbar)\n`
  prompt += `- Website der Firma (falls verfügbar)\n`
  prompt += `- E-Mail-Adresse (falls öffentlich verfügbar)\n`
  prompt += `- Telefonnummer (falls öffentlich verfügbar)\n`
  prompt += `- Kurze Beschreibung / Headline (was die Person macht)\n\n`

  if (excludeNames.length > 0) {
    prompt += `WICHTIG: Nenne NICHT diese Personen (bereits bekannt): ${excludeNames.join(', ')}\n\n`
  }

  prompt += `Antworte NUR mit einem JSON-Array in genau diesem Format (keine Erklärung, kein Markdown, keine Code-Blöcke):\n`
  prompt += `[{"name":"Max Mustermann","company":"Firma GmbH","linkedin_url":"https://linkedin.com/in/maxmustermann","website":"https://firma.de","email":"max@firma.de","phone":"+49 123 456789","headline":"Business Coach & Gründer"}]\n\n`
  prompt += `Wenn du eine Information nicht finden kannst, setze den Wert auf null. Gib NUR echte, verifizierbare Personen zurück — keine erfundenen Daten.`

  return prompt
}

async function callPerplexitySearch(prompt: string): Promise<DiscoveredLead[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY nicht gesetzt')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://crm.worknetic.de',
        'X-Title': 'Worknetic CRM Lead Search',
      },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein Research-Assistent der echte Geschäftspersonen im DACH-Raum findet. Antworte immer mit validem JSON. Keine Markdown-Formatierung, keine Code-Blöcke, nur das rohe JSON-Array.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status}`, errorText)
      throw new Error(`OpenRouter API Fehler: ${response.status}`)
    }

    const data = await response.json()
    const content: string | undefined = data?.choices?.[0]?.message?.content

    if (!content) return []

    return parseLeadsFromResponse(content)
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Perplexity Timeout (45s)')
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseLeadsFromResponse(content: string): DiscoveredLead[] {
  // Try to extract JSON array from the response
  let jsonStr = content.trim()

  // Remove markdown code blocks if present
  jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '')

  // Try to find a JSON array in the response
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonStr = arrayMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item: Record<string, unknown>) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item: Record<string, unknown>) => ({
        name: String(item.name).trim(),
        company: item.company ? String(item.company).trim() : null,
        linkedin_url: item.linkedin_url ? String(item.linkedin_url).trim() : null,
        website: item.website ? String(item.website).trim() : null,
        email: item.email ? String(item.email).trim().toLowerCase() : null,
        phone: item.phone ? String(item.phone).trim() : null,
        headline: item.headline ? String(item.headline).trim() : null,
      }))
  } catch {
    console.error('Failed to parse Perplexity response as JSON:', content.slice(0, 500))
    return []
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
  const config = VERTICAL_SEARCH_CONFIG[vertical]
  if (!config) {
    yield { type: 'error', error: `Unbekanntes Vertical: ${vertical}` }
    return
  }

  yield { type: 'start', vertical, max_leads: maxLeads }

  const foundNames: string[] = []
  let totalFound = 0
  const leadsPerBatch = 5

  // Iterate through variations, making one Perplexity call per variation
  for (let i = 0; i < config.variations.length && totalFound < maxLeads; i++) {
    const variation = config.variations[i]

    try {
      const prompt = buildSearchPrompt(
        config.base,
        variation,
        Math.min(leadsPerBatch, maxLeads - totalFound),
        foundNames,
      )

      const leads = await callPerplexitySearch(prompt)

      for (const lead of leads) {
        if (totalFound >= maxLeads) break

        // Skip if we already found this person (by name)
        const nameLower = lead.name.toLowerCase()
        if (foundNames.some((n) => n.toLowerCase() === nameLower)) continue

        foundNames.push(lead.name)
        totalFound++
        yield { type: 'profile', lead }
      }

      yield { type: 'batch_done', batch: i + 1, found: totalFound }
    } catch (err) {
      yield {
        type: 'error',
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      }
    }

    // Small delay between batches
    if (totalFound < maxLeads) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}
