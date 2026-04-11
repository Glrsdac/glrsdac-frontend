-- Migration: Recreate public.announcements table
-- Date: 2026-03-19

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id),
    title TEXT,
    message TEXT,
    published_at TIMESTAMPTZ
);
