-- Migration: Add reactions support to messages table
-- Author: BorKonya Engineering
-- Date: 2026-10-10

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
