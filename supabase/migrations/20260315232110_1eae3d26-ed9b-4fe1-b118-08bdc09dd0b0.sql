CREATE OR REPLACE FUNCTION public.get_public_schema()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tables', COALESCE((
      SELECT jsonb_object_agg(
        t.table_name,
        (SELECT jsonb_agg(
          jsonb_build_object(
            'name', c.column_name,
            'type', CASE 
              WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name 
              WHEN c.data_type = 'ARRAY' THEN c.udt_name
              ELSE c.data_type 
            END,
            'nullable', c.is_nullable = 'YES',
            'default', c.column_default
          ) ORDER BY c.ordinal_position
        )
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name)
      )
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ), '{}'::jsonb),
    'enums', COALESCE((
      SELECT jsonb_object_agg(
        tp.typname,
        (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
         FROM pg_enum e WHERE e.enumtypid = tp.oid)
      )
      FROM pg_type tp
      JOIN pg_namespace n ON n.oid = tp.typnamespace
      WHERE n.nspname = 'public' AND tp.typtype = 'e'
    ), '{}'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_ddl(ddl_sql text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  EXECUTE ddl_sql;
  RETURN 'OK';
END;
$$;