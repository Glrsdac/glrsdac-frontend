-- Fix the sync_position_to_role trigger function
-- The function was incorrectly referencing 'member_id' instead of 'id'

CREATE OR REPLACE FUNCTION public.sync_position_to_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  position_def RECORD;
  target_role_id UUID;
  user_id UUID;
BEGIN
  -- Get the user_id from members table using the correct field name
  SELECT m.user_id INTO user_id
  FROM public.members m
  WHERE m.id = COALESCE(NEW.id, OLD.id);

  IF user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Handle INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.position IS NOT NULL THEN
    -- Find position definition and default role
    SELECT pd.*, pd.default_role_id INTO position_def
    FROM public.position_definitions pd
    WHERE pd.name = NEW.position AND pd.is_active = TRUE;

    IF position_def.id IS NOT NULL THEN
      -- Insert position assignment record
      INSERT INTO public.position_assignments (
        member_id, position_definition_id, assigned_by
      ) VALUES (
        NEW.id, position_def.id, NEW.updated_by
      ) ON CONFLICT DO NOTHING;

      -- Assign the default role if not already assigned
      IF position_def.default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, church_id)
        SELECT user_id, position_def.default_role_id, NEW.church_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = user_id
          AND ur.role_id = position_def.default_role_id
          AND ur.church_id = NEW.church_id
        );
      END IF;
    END IF;

  -- Handle DELETE or position removal
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.position IS NOT NULL AND NEW.position IS NULL) THEN
    -- Mark position assignment as unassigned
    UPDATE public.position_assignments
    SET unassigned_at = NOW()
    WHERE member_id = COALESCE(OLD.id, NEW.id)
    AND unassigned_at IS NULL;

    -- Note: We don't automatically remove roles on position removal
    -- to prevent accidental permission loss. Manual role management required.
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;