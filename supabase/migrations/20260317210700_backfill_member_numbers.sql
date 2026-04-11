-- Migration: Backfill member_no for existing members
-- Format: GLRSDAC00X (sequential, starting from 1)

DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM public.members WHERE member_no IS NULL OR member_no = '' ORDER BY created_at ASC
  LOOP
    UPDATE public.members
    SET member_no = 'GLRSDAC00' || LPAD(counter::text, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;
