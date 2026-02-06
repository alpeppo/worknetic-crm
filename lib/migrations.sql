-- ============================================
-- CRM PHASE 1-3 MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- Phase 1: Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  vertical TEXT,
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 1: Saved Filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  entity TEXT NOT NULL DEFAULT 'leads',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Email Sequences
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Sequence Enrollments
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: Workflows (Automation Rules)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: Workflow Logs
CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id UUID,
  deal_id UUID,
  status TEXT DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access (same as existing tables)
CREATE POLICY "Allow all on email_templates" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on saved_filters" ON saved_filters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_sequences" ON email_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sequence_enrollments" ON sequence_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on workflows" ON workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on workflow_logs" ON workflow_logs FOR ALL USING (true) WITH CHECK (true);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, category, variables) VALUES
('Erstansprache', 'Zusammenarbeit mit {{company}}', 'Hallo {{name}},

ich bin auf {{company}} aufmerksam geworden und finde Ihren Ansatz im Bereich {{vertical}} sehr spannend.

Bei Worknetic helfen wir {{vertical}}-Unternehmen dabei, bis zu 20 Stunden pro Woche durch intelligente Automatisierung einzusparen.

Hätten Sie diese Woche 15 Minuten für ein kurzes Gespräch?

Beste Grüße', 'outreach', '["name", "company", "vertical"]'),

('Follow-up nach Erstansprache', 'Kurze Nachfrage - {{company}}', 'Hallo {{name}},

ich wollte kurz nachhaken, ob meine letzte Nachricht bei Ihnen angekommen ist.

Viele {{vertical}}-Unternehmen stehen vor der Herausforderung, dass manuelle Prozesse zu viel Zeit kosten. Wir haben dafür eine Lösung entwickelt, die nachweislich funktioniert.

Passt es bei Ihnen diese Woche für ein kurzes 15-Minuten-Gespräch?

Viele Grüße', 'follow_up', '["name", "company", "vertical"]'),

('Angebot senden', 'Ihr individuelles Angebot - {{company}}', 'Hallo {{name}},

vielen Dank für unser Gespräch! Wie besprochen, sende ich Ihnen hier die Zusammenfassung unserer Analyse.

Basierend auf unserer Diskussion empfehle ich das {{package}}-Paket:

{{proposal_details}}

Ich freue mich auf Ihr Feedback und stehe für Rückfragen jederzeit zur Verfügung.

Beste Grüße', 'proposal', '["name", "company", "package", "proposal_details"]'),

('Meeting-Einladung', 'Termin: Discovery Call - {{company}}', 'Hallo {{name}},

ich freue mich auf unser Gespräch! Hier die Details:

Datum: {{date}}
Uhrzeit: {{time}}
Link: {{meeting_link}}

Agenda:
1. Ihre aktuelle Situation verstehen
2. Optimierungspotenziale identifizieren
3. Nächste Schritte besprechen

Bis dann!

Beste Grüße', 'meeting', '["name", "company", "date", "time", "meeting_link"]'),

('Nachfass nach Meeting', 'Zusammenfassung unseres Gesprächs - {{company}}', 'Hallo {{name}},

vielen Dank für das tolle Gespräch heute! Hier eine kurze Zusammenfassung:

{{meeting_notes}}

Als nächsten Schritt schlage ich vor: {{next_steps}}

Ich melde mich {{follow_up_date}} wieder bei Ihnen.

Beste Grüße', 'follow_up', '["name", "company", "meeting_notes", "next_steps", "follow_up_date"]');
