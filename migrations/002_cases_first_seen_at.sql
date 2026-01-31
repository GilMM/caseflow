-- Migration: Add first_seen_at to cases for unseen-email highlighting
ALTER TABLE cases ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
