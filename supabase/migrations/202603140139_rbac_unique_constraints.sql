-- Add unique constraint to roles.name
ALTER TABLE roles ADD CONSTRAINT uq_roles_name UNIQUE (name);

-- Add unique constraint to permissions.name
ALTER TABLE permissions ADD CONSTRAINT uq_permissions_name UNIQUE (name);
