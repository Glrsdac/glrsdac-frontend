// ===============================================
// ROLE-BASED ACCESS CONTROL (RBAC) ARCHITECTURE
// ===============================================
//
// SECURITY PRINCIPLE (MANDATORY):
// IF IT AFFECTS PERMISSIONS → IT MUST COME FROM ROLES
//
// AUTHORIZED SOURCES:
// - user_roles table → roles table
//
// FORBIDDEN SOURCES:
// - members.position (UI labels only)
// - profiles.user_type (removed)
// - department_members (not for permissions)
// - members.church_id (scope only)
//
// ARCHITECTURAL PRINCIPLES (MANDATORY):
// 1. ROLES ARE AUTHORITY: All permissions determined by user_roles table
// 2. POSITION IS UI LABEL: members.position is for display only
// 3. NEVER USE POSITION IN LOGIC: No business logic based on position
//
// IMPLEMENTATION:
// - Permission checks: user_roles → roles table
// - Route guards: fetchPermissionKeysForUser() from roles
// - Portal access: resolvePortalAccess() from user_roles
// - Position usage: Display, forms, member management only
//
// SECURITY NOTE:
// Position field is informational metadata only.
// Changing position does NOT affect permissions.
// Permissions are controlled exclusively through role assignments.
//
// ===============================================

export const RBAC_ARCHITECTURE_NOTES = {
  security_principle: "if_it_affects_permissions_it_must_come_from_roles",
  authority: "roles",
  ui_labels: "position",
  logic_forbidden: "position"
} as const;
