import OpenAI from 'openai'

// ============================================
// TYPES
// ============================================

export interface EmailGenerationInput {
  lead: {
    name: string
    company?: string | null
    headline?: string | null
    vertical?: string | null
    website?: string | null
    location?: string | null
  }
  enrichment: {
    company_description?: string | null
    business_processes?: string | null
  }
}

export interface GeneratedEmail {
  subject: string
  body: string
  personalization_hooks: string[]
  model: string
  generated_at: string
}

// ============================================
// OPENAI CLIENT
// ============================================

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `Du bist ein Sales-Texter für Worknetic.

WORKNETIC: Wir sind ein Agentic Workflow Architect. Wir übersetzen manuelle Arbeitsabläufe in Software-Systeme, die autonom im Hintergrund laufen.

KERNREGEL: Wir verkaufen ZEIT, nicht Technologie.
- 10-15 Stunden pro Woche zurückgewinnen
- Repetitive Aufgaben laufen automatisch
- System gehört dem Kunden (kein Abo)

ZIELGRUPPE: Coaches, Berater, Consultants

PREISE:
- Workflow-Audit: €750 (2-3h Analyse + Report)
- Pilot: €3.000-4.000 (1 Workflow + 14 Tage Support)
- Standard: €6.000-8.000 (1-2 Workflows + 30 Tage Support)

MESSAGING-REGELN:
- NIEMALS technischen Jargon (nicht "Agenten", "LLMs", "Prompts", "Automation", "KI")
- Konkrete Zeitersparnis nennen (Stunden pro Woche)
- Pain Points der Branche herausarbeiten
- Du-Form verwenden (nicht Sie)
- Kurz und persönlich (max 5-7 Sätze im Body)
- Betreff: Neugierig machen, nicht salesy

STRUKTUR DER E-MAIL:
1. Persönliche Anknüpfung (was du über den Lead/die Firma recherchiert hast)
2. Pain Point ansprechen (spezifisch für ihre Branche/Tätigkeit)
3. Lösung kurz skizzieren (in Zeitersparnis, NICHT in Features)
4. Call-to-Action: "Wenn du magst, lass uns 15 Minuten quatschen — ich zeig dir, wie das aussehen könnte: calendly.com/worknetic"

BEISPIEL-FORMULIERUNGEN:
- "Wie viel Zeit verbringst du pro Woche mit [Aufgabe]?"
- "Was wäre, wenn das einfach im Hintergrund passiert?"
- "Du bekommst die Zeit zurück."

ANTWORTE NUR MIT DER E-MAIL. Kein Kommentar, keine Erklärung. Format:
BETREFF: [Betreffzeile]

[E-Mail-Text]`

// ============================================
// HELPERS
// ============================================

function buildUserPrompt(input: EmailGenerationInput): string {
  const { lead, enrichment } = input

  const parts: string[] = [
    `Schreibe eine personalisierte Outreach-E-Mail an folgende Person:`,
    ``,
    `Name: ${lead.name}`,
  ]

  if (lead.company) parts.push(`Unternehmen: ${lead.company}`)
  if (lead.headline) parts.push(`Headline/Position: ${lead.headline}`)
  if (lead.vertical) parts.push(`Branche: ${lead.vertical}`)
  if (lead.website) parts.push(`Website: ${lead.website}`)
  if (lead.location) parts.push(`Standort: ${lead.location}`)

  if (enrichment.company_description || enrichment.business_processes) {
    parts.push(``)
    parts.push(`--- Recherche-Ergebnisse ---`)
    if (enrichment.company_description) {
      parts.push(`Firmenbeschreibung: ${enrichment.company_description}`)
    }
    if (enrichment.business_processes) {
      parts.push(`Geschäftsprozesse: ${enrichment.business_processes}`)
    }
  }

  // Guidance depending on how much data is available
  const dataPoints = [
    lead.company,
    lead.headline,
    lead.vertical,
    enrichment.company_description,
    enrichment.business_processes,
  ].filter(Boolean).length

  if (dataPoints <= 1) {
    parts.push(``)
    parts.push(
      `Hinweis: Es sind wenig Informationen verfügbar. Halte die E-Mail etwas allgemeiner, aber trotzdem persönlich und auf den Namen bezogen.`
    )
  }

  return parts.join('\n')
}

function extractPersonalizationHooks(input: EmailGenerationInput): string[] {
  const hooks: string[] = []
  const { lead, enrichment } = input

  if (lead.company) hooks.push('company')
  if (lead.headline) hooks.push('headline')
  if (lead.vertical) hooks.push('vertical')
  if (lead.website) hooks.push('website')
  if (lead.location) hooks.push('location')
  if (enrichment.company_description) hooks.push('company_description')
  if (enrichment.business_processes) hooks.push('business_processes')

  return hooks
}

function parseEmailResponse(raw: string): { subject: string; body: string } {
  const lines = raw.trim().split('\n')

  let subject = ''
  let bodyStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.toUpperCase().startsWith('BETREFF:')) {
      subject = line.replace(/^BETREFF:\s*/i, '').trim()
      bodyStartIndex = i + 1
      break
    }
  }

  // Skip empty lines between subject and body
  while (bodyStartIndex < lines.length && lines[bodyStartIndex].trim() === '') {
    bodyStartIndex++
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim()

  return { subject, body }
}

function buildFallbackEmail(name: string): GeneratedEmail {
  return {
    subject: `Kurze Frage, ${name}`,
    body: `Hallo ${name},

ich bin Tim von Worknetic. Wir helfen Coaches und Beratern, 10-15 Stunden pro Woche zurückzugewinnen — indem wir repetitive Aufgaben in Systeme übersetzen, die im Hintergrund laufen.

Wenn du magst, lass uns 15 Minuten quatschen: calendly.com/worknetic

Beste Grüße,
Tim`,
    personalization_hooks: [],
    model: 'fallback',
    generated_at: new Date().toISOString(),
  }
}

// ============================================
// MAIN EXPORT
// ============================================

const MODEL = 'gpt-5-mini'

export async function generateOutreachEmail(
  input: EmailGenerationInput
): Promise<GeneratedEmail> {
  try {
    const userPrompt = buildUserPrompt(input)
    const hooks = extractPersonalizationHooks(input)

    const completion = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      console.error('[email-generation] Empty response from OpenAI')
      return buildFallbackEmail(input.lead.name)
    }

    const { subject, body } = parseEmailResponse(raw)

    if (!subject || !body) {
      console.error('[email-generation] Could not parse subject or body from response:', raw)
      return buildFallbackEmail(input.lead.name)
    }

    return {
      subject,
      body,
      personalization_hooks: hooks,
      model: MODEL,
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[email-generation] Failed to generate email:', error)
    return buildFallbackEmail(input.lead.name)
  }
}
