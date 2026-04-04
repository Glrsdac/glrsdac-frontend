import { supabase } from "@/integrations/supabase/client";

export type PortalKey = "treasury" | "clerk" | "department" | "member";

export type PortalAccessResult = {
  isAdmin: boolean;
  allowedRouteBases: Set<string>;
  allowedDepartmentIds: Set<string>;
};

/**
 * RBAC ARCHITECTURE ENFORCEMENT:
 * - ROLES ARE AUTHORITY: Access determined by user_roles → roles table
 * - POSITION IS UI LABEL: members.position for display only
 * - NEVER USE POSITION IN LOGIC: This function uses roles only
 */

export function getPortalKeyFromRouteBase(routeBase: string): PortalKey {
  if (routeBase.includes("/treasury")) return "treasury";
  if (routeBase.includes("/clerk")) return "clerk";
  if (routeBase.includes("/member")) return "member";
  return "department";
}

export async function resolvePortalAccess(userId: string): Promise<PortalAccessResult> {
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id,roles(name)")
    .eq("user_id", userId) as { data: any[] | null; error: any };

  const roles = (userRoles ?? []).map((r: any) => r.roles?.name);
  const isAdmin = roles.some((role) =>
    ["SuperAdmin", "Super Admin", "System Admin", "ADMIN"].includes(String(role || ""))
  );

  // With simple role-based system, all department IDs are accessible for admin
  const allowedDepartmentIds = new Set<string>();

  // Build allowed route bases based on roles
  const allowedRouteBases = new Set<string>();

  if (isAdmin) {
    allowedRouteBases.add("/portal/treasury");
    allowedRouteBases.add("/portal/clerk");
    allowedRouteBases.add("/portal/department");
    allowedRouteBases.add("/portal/member");
    allowedRouteBases.add("/portal/governance");
  }

  if (roles.includes("TREASURER")) {
    allowedRouteBases.add("/portal/treasury");
    allowedRouteBases.add("/portal/member");
  }

  if (roles.includes("CLERK")) {
    allowedRouteBases.add("/portal/clerk");
    allowedRouteBases.add("/portal/member");
  }

  // All authenticated users get member portal
  allowedRouteBases.add("/portal/member");

  // Get department memberships for the user
  const { data: memberRow } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberRow?.id) {
    const { data: deptMembers } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("member_id", memberRow.id);

    for (const dm of deptMembers ?? []) {
      allowedDepartmentIds.add(String(dm.department_id));
    }

    if ((deptMembers ?? []).length > 0) {
      allowedRouteBases.add("/portal/department");
    }
  }

  return {
    isAdmin,
    allowedRouteBases,
    allowedDepartmentIds,
  };
}
