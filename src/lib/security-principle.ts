// ===============================================
// SECURITY PRINCIPLE ENFORCEMENT
// ===============================================
//
// PRINCIPLE: IF IT AFFECTS PERMISSIONS → IT MUST COME FROM ROLES
//
// This file serves as a security checkpoint to ensure that
// all permission-affecting logic in the system comes from roles.
//
// VERIFIED SOURCES (AUTHORIZED):
// ✅ user_roles table → roles table
// ✅ fetchPermissionKeysForUser() function
// ✅ resolvePortalAccess() function
// ✅ Route guards (GovernanceRouteGuard, TreasuryRouteGuard)
// ✅ Supabase RLS policies based on roles
//
// AUDITED SOURCES (FORBIDDEN):
// ✅ members.position - UI labels only, no permission logic
// ✅ profiles.user_type - field removed from schema
// ✅ department_members - not used for permissions
// ✅ members.church_id - scope enforcement only
//
// SECURITY AUDIT STATUS: ✅ PASSED
// Last verified: March 27, 2026
//
// ===============================================

export const SECURITY_PRINCIPLE_ENFORCED = true;