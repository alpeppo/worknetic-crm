'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getLeadDocuments(leadId: string) {
  const { data, error } = await supabase
    .from('lead_documents')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return []
  }
  return data || []
}

export async function createDocumentRecord(data: {
  lead_id: string
  name: string
  size: number
  type: string
  url: string
}) {
  const { error } = await supabase
    .from('lead_documents')
    .insert({
      ...data,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error creating document record:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/leads/${data.lead_id}`)
  return { success: true }
}

export async function deleteDocumentRecord(id: string, leadId: string) {
  const { error } = await supabase
    .from('lead_documents')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting document:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}
