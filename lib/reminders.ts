'use server'

import { supabase } from '@/lib/supabase'

export type FollowUpLead = {
  id: string
  name: string
  company: string | null
  next_follow_up_at: string
  stage: string
}

/**
 * Returns leads where next_follow_up_at is in the past
 * and stage is NOT 'won' or 'lost'.
 * Ordered by next_follow_up_at ascending (most overdue first), limit 20.
 */
export async function getOverdueFollowUps(): Promise<FollowUpLead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, next_follow_up_at, stage')
    .is('deleted_at', null)
    .not('next_follow_up_at', 'is', null)
    .lt('next_follow_up_at', new Date().toISOString())
    .not('stage', 'in', '(won,lost)')
    .order('next_follow_up_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching overdue follow-ups:', error)
    return []
  }

  return (data ?? []) as FollowUpLead[]
}

/**
 * Returns leads where next_follow_up_at is within the next 7 days
 * and NOT in the past. Stage is NOT 'won' or 'lost'.
 * Ordered by next_follow_up_at ascending (soonest first), limit 20.
 */
export async function getUpcomingFollowUps(): Promise<FollowUpLead[]> {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, next_follow_up_at, stage')
    .is('deleted_at', null)
    .not('next_follow_up_at', 'is', null)
    .gte('next_follow_up_at', now.toISOString())
    .lte('next_follow_up_at', sevenDaysFromNow.toISOString())
    .not('stage', 'in', '(won,lost)')
    .order('next_follow_up_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching upcoming follow-ups:', error)
    return []
  }

  return (data ?? []) as FollowUpLead[]
}

/**
 * Returns leads where next_follow_up_at is today (from start of day to end of day).
 * Stage is NOT 'won' or 'lost'.
 * Ordered by next_follow_up_at ascending, limit 20.
 */
export async function getDueToday(): Promise<FollowUpLead[]> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company, next_follow_up_at, stage')
    .is('deleted_at', null)
    .not('next_follow_up_at', 'is', null)
    .gte('next_follow_up_at', startOfDay.toISOString())
    .lte('next_follow_up_at', endOfDay.toISOString())
    .not('stage', 'in', '(won,lost)')
    .order('next_follow_up_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching due today follow-ups:', error)
    return []
  }

  return (data ?? []) as FollowUpLead[]
}
