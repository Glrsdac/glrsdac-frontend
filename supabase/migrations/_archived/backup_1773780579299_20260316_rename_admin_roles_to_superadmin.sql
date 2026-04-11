-- Migration: Rename all legacy admin roles to 'SuperAdmin'
-- Date: 2026-03-16
-- Updated for post-drop schema (no legacy roles expected)

-- Create SuperAdmin role if not exists
INSERT INTO roles (name) VALUES ('SuperAdmin') ON CONFLICT (name) DO NOTHING;

-- Ensure SuperAdmin role exists for references
