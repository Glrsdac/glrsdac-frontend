-- Robust error handling for unique constraint addition
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'roles' AND constraint_name = 'uq_roles_name'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT uq_roles_name UNIQUE (name);
    END IF;
EXCEPTION WHEN others THEN
    -- Ignore errors, log if needed
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'permissions' AND constraint_name = 'uq_permissions_name'
    ) THEN
        ALTER TABLE permissions ADD CONSTRAINT uq_permissions_name UNIQUE (name);
    END IF;
EXCEPTION WHEN others THEN
    -- Ignore errors, log if needed
END $$;
