import { NextRequest } from 'next/server'

// Pipeline server runs on VPS host, accessible via Docker gateway IP
const PIPELINE_SERVER_URL = process.env.PIPELINE_SERVER_URL || 'http://172.21.0.1:8765'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.vertical) {
    return new Response(JSON.stringify({ error: 'vertical is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Proxy to Python pipeline server
  const response = await fetch(`${PIPELINE_SERVER_URL}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vertical: body.vertical,
      max: body.maxLeads ?? 20,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(errorText, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Stream the NDJSON response through
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  })
}
