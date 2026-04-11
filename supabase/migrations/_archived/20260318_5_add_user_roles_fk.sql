-- Migration: Add foreign key from public.user_roles.role_id to public.roles.id
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_role_id
FOREIGN KEY (role_id) REFERENCES public.roles(id);
