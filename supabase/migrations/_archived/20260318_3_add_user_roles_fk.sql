-- Migration: Add foreign key from user_roles.role_id to roles.id (retry)
ALTER TABLE user_roles
ADD CONSTRAINT fk_user_roles_role_id
FOREIGN KEY (role_id) REFERENCES roles(id);
