-- Migration: Add dismissed_at to cases for spam/dismiss functionality
ALTER TABLE cases ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
