-- Migration: Create org_inbound_email table (replaces org_gmail_integrations)

CREATE TABLE IF NOT EXISTS org_inbound_email (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  inbound_address        TEXT NOT NULL UNIQUE,
  is_enabled             BOOLEAN NOT NULL DEFAULT true,
  default_queue_id       UUID REFERENCES queues(id) ON DELETE SET NULL,
  configured_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emails_processed_count INTEGER NOT NULL DEFAULT 0,
  last_received_at       TIMESTAMPTZ,
  last_error             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_inbound_email_address
  ON org_inbound_email(inbound_address);

ALTER TABLE org_inbound_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON org_inbound_email
  FOR ALL USING (true) WITH CHECK (true);
