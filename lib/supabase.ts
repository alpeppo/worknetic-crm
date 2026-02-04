import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client using public schema (views point to crm schema tables)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our CRM data
export type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  company: string | null
  position: string | null
  headline: string | null
  location: string | null
  connections: number | null
  followers: number | null
  website: string | null
  lead_score: number | null
  pain_score: number | null
  fit_score: number | null
  buying_score: number | null
  score_notes: any
  qualified: boolean
  vertical: string
  source: string | null
  stage: string
  deal_value: number | null
  probability: number | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  last_contacted_at: string | null
  next_follow_up_at: string | null
  created_by: string
  updated_by: string
  deleted_at: string | null
}

export type Activity = {
  id: string
  lead_id: string
  type: string
  subject: string | null
  body: string | null
  metadata: any
  created_by: string
  created_at: string
  scheduled_for: string | null
  deleted_at: string | null
}

export type Deal = {
  id: string
  lead_id: string
  name: string
  stage: string
  value: number
  probability: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  package_type: string | null
  workflows: any
  lost_reason: string | null
  lost_notes: string | null
  assigned_to: string
  created_at: string
  updated_at: string
  closed_at: string | null
  created_by: string
  updated_by: string
}

export type Vertical = {
  slug: string
  name: string
  description: string | null
  target_deal_size_min: number | null
  target_deal_size_max: number | null
  directive_path: string | null
  scoring_config: any
  active: boolean
  created_at: string
  updated_at: string
}
