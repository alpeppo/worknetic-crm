'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from './supabase'

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

  return { success: true, lead }
}

export async function updateLead(id: string, data: Partial<LeadFormData>) {
  const { data: lead, error } = await supabase
    .from('leads')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating lead:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true, lead }
}

export async function deleteLead(id: string) {
  // Soft delete
  const { error } = await supabase
    .from('leads')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting lead:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/')

  return { success: true }
}

export async function updateLeadStage(id: string, stage: string) {
  const { data: lead, error } = await supabase
    .from('leads')
    .update({
      stage,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('name')
    .single()

  if (error) {
    console.error('Error updating stage:', error)
    return { success: false, error: error.message }
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

  return { success: true, lead }
}

export async function setFollowUp(id: string, date: string) {
  const { error } = await supabase
    .from('leads')
    .update({
      next_follow_up_at: date,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error setting follow-up:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function markLeadReviewed(id: string, reviewed: boolean) {
  const { error } = await supabase
    .from('leads')
    .update({
      reviewed,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error marking lead reviewed:', error)
    return { success: false, error: error.message }
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
  type: 'note' | 'call' | 'email_sent' | 'email_received' | 'meeting' | 'linkedin_message'
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
  const { error } = await supabase
    .from('deals')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating deal:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/deals')
  revalidatePath('/')

  return { success: true }
}

export async function updateDealStage(id: string, stage: string) {
  const updateData: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString()
  }

  // If won or lost, set closed_at
  if (stage === 'won' || stage === 'lost') {
    updateData.closed_at = new Date().toISOString()
    if (stage === 'won') {
      updateData.actual_close_date = new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating deal stage:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/deals')
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
