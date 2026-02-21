'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from './supabase'
import { enrichLead } from './enrichment'
import { generateOutreachEmail } from './email-generation'

// ============================================
// HELPERS
// ============================================

// Direct REST PATCH for leads — bypasses supabase-js RETURNING behavior
// which breaks on views with INSTEAD rules
async function patchLead(id: string, data: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(`${url}/rest/v1/leads?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text()
    return { error: text }
  }
  return { error: null }
}

async function patchLeadsBulk(ids: string[], data: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const filter = ids.map(id => `"${id}"`).join(',')
  const res = await fetch(`${url}/rest/v1/leads?id=in.(${filter})`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text()
    return { error: text }
  }
  return { error: null }
}

// ============================================
// LEAD ACTIONS
// ============================================

export type LeadFormData = {
  name: string
  email?: string
  phone?: string
  company?: string
  headline?: string
  linkedin_url?: string
  website?: string
  location?: string
  vertical?: string
  source?: string
  stage?: string
  lead_score?: number
  pain_score?: number
  fit_score?: number
  buying_score?: number
  notes?: string
}

export async function createLead(data: LeadFormData) {
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      ...data,
      stage: data.stage || 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return { success: false, error: error.message }
  }

  // Log activity
  await supabase.from('activities').insert({
    lead_id: lead.id,
    type: 'note',
    subject: 'Lead erstellt',
    body: `Lead "${data.name}" wurde erstellt.`,
    created_by: 'system',
    created_at: new Date().toISOString()
  })

  revalidatePath('/leads')
  revalidatePath('/')

  // Fire-and-forget: enrich lead asynchronously
  if (lead) {
    runEnrichmentPipeline(lead.id, {
      name: data.name,
      company: data.company,
      website: data.website,
      email: data.email,
      phone: data.phone,
      linkedin_url: data.linkedin_url,
      headline: data.headline,
      vertical: data.vertical,
      location: data.location,
    }).catch((err) => console.error('Enrichment pipeline error:', err))
  }

  return { success: true, lead }
}

async function runEnrichmentPipeline(
  leadId: string,
  lead: {
    name: string
    company?: string
    website?: string
    email?: string
    phone?: string
    linkedin_url?: string
    headline?: string
    vertical?: string
    location?: string
  }
) {
  // Step 1: Enrich lead data
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
  const leadUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (enrichmentResult.email && !lead.email) leadUpdates.email = enrichmentResult.email
  if (enrichmentResult.phone && !lead.phone) leadUpdates.phone = enrichmentResult.phone
  if (enrichmentResult.website && !lead.website) leadUpdates.website = enrichmentResult.website

  if (Object.keys(leadUpdates).length > 1) {
    await patchLead(leadId, leadUpdates)
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

  // Step 4: Generate personalized email
  const email = await generateOutreachEmail({
    lead: {
      name: lead.name,
      company: lead.company,
      headline: lead.headline,
      vertical: lead.vertical,
      website: lead.website || enrichmentResult.website,
      location: lead.location,
    },
    enrichment: {
      company_description: enrichmentResult.company_description,
      business_processes: enrichmentResult.business_processes,
    },
  })

  // Step 5: Store email draft activity
  await supabase.from('activities').insert({
    lead_id: leadId,
    type: 'email_draft',
    subject: email.subject,
    body: email.body,
    metadata: { email_draft: email },
    created_by: 'system',
    created_at: new Date().toISOString(),
  })

  revalidatePath(`/leads/${leadId}`)
}

export async function updateLead(id: string, data: Partial<LeadFormData>) {
  const { error } = await patchLead(id, { ...data, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error updating lead:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteLead(id: string) {
  // Soft delete
  const { error } = await patchLead(id, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error deleting lead:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath('/')

  return { success: true }
}

export async function updateLeadStage(id: string, stage: string) {
  const { error } = await patchLead(id, { stage, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error updating stage:', error)
    return { success: false, error }
  }

  // Log stage change activity
  await supabase.from('activities').insert({
    lead_id: id,
    type: 'stage_change',
    subject: `Stage geändert zu "${stage}"`,
    created_by: 'user',
    created_at: new Date().toISOString()
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function setFollowUp(id: string, date: string) {
  const { error } = await patchLead(id, { next_follow_up_at: date, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error setting follow-up:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function markLeadReviewed(id: string, reviewed: boolean) {
  const { error } = await patchLead(id, { reviewed, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error marking lead reviewed:', error)
    return { success: false, error }
  }

  // Log activity
  await supabase.from('activities').insert({
    lead_id: id,
    type: 'note',
    subject: reviewed ? 'Lead als Ready markiert' : 'Lead zurück in Inbox',
    created_by: 'user',
    created_at: new Date().toISOString()
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true }
}

// ============================================
// ACTIVITY ACTIONS
// ============================================

export type ActivityFormData = {
  lead_id: string
  type: 'note' | 'call' | 'email_sent' | 'email_received' | 'meeting' | 'linkedin_message' | 'whatsapp' | 'sms' | 'video_call'
  subject: string
  body?: string
  scheduled_for?: string
}

export async function createActivity(data: ActivityFormData) {
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      ...data,
      created_by: 'user',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating activity:', error)
    return { success: false, error: error.message }
  }

  // Update lead's last_contacted_at
  await supabase
    .from('leads')
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', data.lead_id)

  revalidatePath(`/leads/${data.lead_id}`)
  revalidatePath('/activities')
  revalidatePath('/')

  return { success: true, activity }
}

// ============================================
// DEAL ACTIONS
// ============================================

export type DealFormData = {
  lead_id: string
  name: string
  stage?: string
  value: number
  probability?: number
  expected_close_date?: string
  package_type?: string
  notes?: string
}

export async function createDeal(data: DealFormData) {
  const dealId = crypto.randomUUID()

  const { error } = await supabase.rpc('create_deal', {
    p_id: dealId,
    p_lead_id: data.lead_id,
    p_name: data.name,
    p_stage: data.stage || 'discovery',
    p_value: data.value,
    p_probability: data.probability || 50,
    p_expected_close_date: data.expected_close_date || null,
    p_assigned_to: 'user',
    p_created_by: 'user',
    p_updated_by: 'user'
  })

  if (error) {
    console.error('Error creating deal:', error)
    return { success: false, error: error.message }
  }

  // Update lead to qualified and add deal_value
  await supabase
    .from('leads')
    .update({
      qualified: true,
      deal_value: data.value,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.lead_id)

  // Log activity
  await supabase.from('activities').insert({
    lead_id: data.lead_id,
    type: 'note',
    subject: `Deal erstellt: ${data.name}`,
    body: `Deal mit Wert €${data.value.toLocaleString()} erstellt.`,
    created_by: 'user',
    created_at: new Date().toISOString()
  })

  revalidatePath('/deals')
  revalidatePath(`/leads/${data.lead_id}`)
  revalidatePath('/')

  return { success: true, deal: { id: dealId } }
}

export async function updateDeal(id: string, data: Partial<DealFormData>) {
  const { error } = await supabase.rpc('update_deal', {
    deal_id: id,
    deal_data: data,
  })

  if (error) {
    console.error('Error updating deal:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteDeal(id: string) {
  const { error } = await supabase.rpc('delete_deal', { deal_id: id })

  if (error) {
    console.error('Error deleting deal:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/deals')
  revalidatePath('/')

  return { success: true }
}

export async function updateDealStage(id: string, stage: string, lostReason?: string, lostNotes?: string) {
  // Use RPC (database function) because public.deals is a VIEW and PostgREST always
  // adds RETURNING * to mutations, which PostgreSQL views don't support.
  // The update_deal_stage function writes directly to crm.deals, bypassing this.
  const rpcParams: Record<string, unknown> = {
    deal_id: id,
    new_stage: stage,
  }

  if (stage === 'won' || stage === 'lost') {
    rpcParams.new_closed_at = new Date().toISOString()
    if (stage === 'won') {
      rpcParams.new_actual_close_date = new Date().toISOString()
    }
    if (stage === 'lost') {
      if (lostReason) rpcParams.new_lost_reason = lostReason
      if (lostNotes) rpcParams.new_lost_notes = lostNotes
    }
  }

  const { error } = await supabase.rpc('update_deal_stage', rpcParams)

  if (error) {
    console.error('Error updating deal stage:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  revalidatePath('/')

  return { success: true }
}

// ============================================
// TODO ACTIONS
// ============================================

export type TodoFormData = {
  title: string
  description?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
  lead_id?: string
  deal_id?: string
}

export async function createTodo(data: TodoFormData) {
  const { data: todo, error } = await supabase
    .from('todos')
    .insert({
      ...data,
      completed: false,
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating todo:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true, todo }
}

export async function toggleTodo(id: string, completed: boolean) {
  const { error } = await supabase
    .from('todos')
    .update({
      completed,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error toggling todo:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true }
}

export async function deleteTodo(id: string) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting todo:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true }
}

// ============================================
// SEARCH
// ============================================

export async function searchLeads(query: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, email, lead_score, stage')
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
    .order('lead_score', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error searching leads:', error)
    return []
  }

  return data
}

// ============================================
// EMAIL TEMPLATE ACTIONS
// ============================================

export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }
  return data
}

export async function createEmailTemplate(data: {
  name: string
  subject: string
  body: string
  vertical?: string
  category?: string
  variables?: string[]
}) {
  const { data: template, error } = await supabase
    .from('email_templates')
    .insert({
      ...data,
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating template:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/templates')
  return { success: true, template }
}

export async function updateEmailTemplate(id: string, data: {
  name?: string
  subject?: string
  body?: string
  vertical?: string
  category?: string
  variables?: string[]
}) {
  const { error } = await supabase
    .from('email_templates')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating template:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

export async function deleteEmailTemplate(id: string) {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting template:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

// ============================================
// SAVED FILTER ACTIONS
// ============================================

export async function getSavedFilters(entity: string = 'leads') {
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('entity', entity)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching saved filters:', error)
    return []
  }
  return data
}

export async function createSavedFilter(data: {
  name: string
  entity: string
  filters: Record<string, unknown>
}) {
  const { data: filter, error } = await supabase
    .from('saved_filters')
    .insert({
      ...data,
      created_by: 'user',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating saved filter:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  return { success: true, filter }
}

export async function deleteSavedFilter(id: string) {
  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting saved filter:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  return { success: true }
}

// ============================================
// BULK ACTIONS
// ============================================

export async function bulkUpdateLeadStage(leadIds: string[], stage: string) {
  const { error } = await patchLeadsBulk(leadIds, { stage, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error bulk updating stage:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath('/')
  return { success: true }
}

export async function bulkDeleteLeads(leadIds: string[]) {
  const { error } = await patchLeadsBulk(leadIds, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error bulk deleting leads:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath('/')
  return { success: true }
}

export async function bulkMarkReviewed(leadIds: string[], reviewed: boolean) {
  const { error } = await patchLeadsBulk(leadIds, { reviewed, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error bulk marking reviewed:', error)
    return { success: false, error }
  }

  revalidatePath('/leads')
  revalidatePath('/')
  return { success: true }
}

// ============================================
// CSV IMPORT
// ============================================

export async function importLeadsFromCSV(leads: Partial<LeadFormData>[]) {
  const leadsToInsert = leads.map(lead => ({
    ...lead,
    stage: lead.stage || 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'csv_import',
    updated_by: 'csv_import'
  }))

  const { data, error } = await supabase
    .from('leads')
    .insert(leadsToInsert)
    .select()

  if (error) {
    console.error('Error importing leads:', error)
    return { success: false, error: error.message, count: 0 }
  }

  revalidatePath('/leads')
  revalidatePath('/')
  return { success: true, count: data?.length || 0 }
}

// ============================================
// REPORTING
// ============================================

export async function getReportData() {
  const [leadsResult, dealsResult, activitiesResult] = await Promise.all([
    supabase.from('leads').select('*').is('deleted_at', null),
    supabase.from('deals').select('*'),
    supabase.from('activities').select('*').order('created_at', { ascending: false })
  ])

  return {
    leads: leadsResult.data || [],
    deals: dealsResult.data || [],
    activities: activitiesResult.data || []
  }
}

// ============================================
// WORKFLOW ACTIONS
// ============================================

export async function createWorkflow(data: {
  name: string
  description?: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  actions: Array<{ type: string; config: Record<string, unknown> }>
}) {
  const { data: workflow, error } = await supabase
    .from('workflows')
    .insert({
      ...data,
      active: true,
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating workflow:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/workflows')
  return { success: true, workflow }
}

export async function updateWorkflow(id: string, data: {
  name?: string
  description?: string
  trigger_type?: string
  trigger_config?: Record<string, unknown>
  actions?: Array<{ type: string; config: Record<string, unknown> }>
}) {
  const { error } = await supabase
    .from('workflows')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating workflow:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/workflows')
  return { success: true }
}

export async function deleteWorkflow(id: string) {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting workflow:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/workflows')
  return { success: true }
}

export async function toggleWorkflow(id: string, active: boolean) {
  const { error } = await supabase
    .from('workflows')
    .update({
      active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error toggling workflow:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/workflows')
  return { success: true }
}

// ============================================
// DIRECTIVE ACTIONS
// ============================================

export async function getDirectiveContent(directivePath: string) {
  try {
    // Fetch directive content from database instead of filesystem
    // Use limit(1) instead of single() to handle cases where multiple verticals
    // share the same directive_path
    const { data, error } = await supabase
      .from('verticals')
      .select('directive_content')
      .eq('directive_path', directivePath)
      .limit(1)

    if (error || !data || data.length === 0 || !data[0]?.directive_content) {
      console.error('Error fetching directive:', error)
      return { success: false, error: 'Direktive konnte nicht geladen werden' }
    }

    return { success: true, content: data[0].directive_content }
  } catch (error) {
    console.error('Error reading directive:', error)
    return { success: false, error: 'Direktive konnte nicht geladen werden' }
  }
}
