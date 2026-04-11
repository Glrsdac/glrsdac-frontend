-- Migration: Insert VIEWER role for default access
-- Date: 2026-03-19

INSERT INTO public.roles (name) VALUES ('VIEWER') ON CONFLICT (name) DO NOTHING;
