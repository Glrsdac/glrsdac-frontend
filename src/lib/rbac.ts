/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Provides functions for:
 * - Checking user permissions
 * - Filtering resources by scope
 * - Managing role operations
 * - Permission inheritance
 */

export interface Role {
  id: string;
  name: string;
  description?: string;
  category: "system" | "governance" | "department";
}

export interface Permission {
  id: string;
  action: "create" | "read" | "update" | "delete" | "approve";
  resource: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
  scope_type: "global" | "church" | "department" | null;
  scope_id?: string;
  scope_name?: string; // Department name, church name, etc.
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
}

function normalizeScopeType(scopeType: UserRole["scope_type"]): "global" | "church" | "department" {
  return (scopeType ?? "global") as "global" | "church" | "department";
}

/**
 * Check if a user role is currently valid (active and not expired)
 */
export function isRoleActive(userRole: UserRole): boolean {
  if (!userRole.is_active) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check start date
  const startDate = new Date(userRole.start_date);
  if (startDate > today) return false;

  // Check end date
  if (userRole.end_date) {
    const endDate = new Date(userRole.end_date);
    if (endDate < today) return false;
  }

  return true;
}

/**
 * Get active roles for a user
 */
export function getActiveRoles(userRoles: UserRole[]): UserRole[] {
  return userRoles.filter(isRoleActive);
}

/**
 * Check if user has a specific role
 */
export function userHasRole(
  userRoles: UserRole[],
  roleName: string | string[],
  scope?: { type: "global" | "church" | "department"; id?: string }
): boolean {
  const roleNames = Array.isArray(roleName) ? roleName : [roleName];

  return userRoles.some((ur) => {
    if (!isRoleActive(ur)) return false;
    if (!ur.role?.name || !roleNames.includes(ur.role.name)) return false;

    const roleScopeType = normalizeScopeType(ur.scope_type);

    if (!scope) {
      return roleScopeType === "global";
    }

    return roleScopeType === scope.type && ur.scope_id === scope.id;
  });
}

/**
 * Check if user has a specific permission
 * Requires role_permissions data to be fetched separately
 */
export function userHasPermission(
  userRoles: UserRole[],
  action: string,
  resource: string,
  rolePermissionsMap: Map<string, Set<string>>
): boolean {
  const activeRoles = getActiveRoles(userRoles);

  return activeRoles.some((ur) => {
    if (!ur.role?.id) return false;

    const permissionKey = `${action}:${resource}`;
    const rolePermissions = rolePermissionsMap.get(ur.role.id);

    return rolePermissions?.has(permissionKey) ?? false;
  });
}

/**
 * Check if user is system admin (global scope)
 */
export function isSystemAdmin(userRoles: UserRole[]): boolean {
  return userRoles.some((userRole) => {
    if (!isRoleActive(userRole)) return false;
    return userRole.role?.name === "superadmin";
  });
}

/**
 * Check if user is church admin for a specific church
 */
export function isChurchAdmin(
  userRoles: UserRole[],
  churchId: string
): boolean {
  void churchId;
  return isSystemAdmin(userRoles);
}

/**
 * Check if user is department admin/director for a specific department
 */
export function isDepartmentDirector(
  userRoles: UserRole[],
  departmentId: string
): boolean {
  const directorRoles = [
    "Department Director",
    "Youth Director",
    "Sabbath School Superintendent",
    "Women's Ministries Leader",
    "Personal Ministries Leader",
  ];

  return userRoles.some((ur) => {
    if (!isRoleActive(ur)) return false;
    if (!ur.role) return false;

    return (
      directorRoles.includes(ur.role.name) &&
      ur.scope_type === "department" &&
      ur.scope_id === departmentId
    );
  });
}

/**
 * Get scoped resources user can access
 * For example: get all departments a user can manage
 */
export function getUserScopes(
  userRoles: UserRole[],
  scopeType: "department" | "church"
): Set<string> {
  const scopes = new Set<string>();

  userRoles.forEach((ur) => {
    if (!isRoleActive(ur)) return;
    if (ur.scope_type === scopeType && ur.scope_id) {
      scopes.add(ur.scope_id);
    }
    if (ur.scope_type === "global") {
      // Global roles can access everything
      scopes.add("*");
    }
  });

  return scopes;
}

/**
 * Check if user can access a scoped resource
 */
export function canAccessScope(
  userRoles: UserRole[],
  scopeType: "department" | "church",
  scopeId: string
): boolean {
  const userScopes = getUserScopes(userRoles, scopeType);

  // Global scope grants access to everything
  if (userScopes.has("*")) return true;

  return userScopes.has(scopeId);
}

/**
 * Get all roles grouped by category
 */
export function groupRolesByCategory(roles: Role[]): {
  system: Role[];
  governance: Role[];
  department: Role[];
} {
  return {
    system: roles.filter((r) => r.category === "system"),
    governance: roles.filter((r) => r.category === "governance"),
    department: roles.filter((r) => r.category === "department"),
  };
}

/**
 * Format a user role for display
 */
export function formatUserRole(
  userRole: UserRole,
  departments?: Map<string, string>
): string {
  const parts = [userRole.role?.name || "Unknown Role"];

  if (
    userRole.scope_type === "department" &&
    userRole.scope_id &&
    departments
  ) {
    const deptName = departments.get(userRole.scope_id);
    if (deptName) {
      parts.push(`(${deptName})`);
    }
  }

  if (userRole.end_date) {
    const endDate = new Date(userRole.end_date);
    const today = new Date();
    const daysLeft = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 90 && daysLeft >= 0) {
      parts.push(`[Expires in ${daysLeft}d]`);
    } else if (daysLeft < 0) {
      parts.push("[Expired]");
    }
  }

  return parts.join(" ");
}

/**
 * Check if a role assignment violates SDA governance rules
 */
export function validateRoleAssignment(
  userId: string,
  newRole: Role,
  existingRoles: UserRole[]
): { valid: boolean; reason?: string } {
  const activeRoles = getActiveRoles(existingRoles);

  // SDA rule: Only one person can be Church Treasurer
  if (newRole.name === "Church Treasurer") {
    const hasTreasurer = activeRoles.some(
      (ur) =>
        ur.user_id !== userId &&
        ur.role?.name === "Church Treasurer" &&
        ur.scope_type === "church"
    );
    if (hasTreasurer) {
      return {
        valid: false,
        reason:
          "Church already has a Treasurer. Please remove the previous one first.",
      };
    }
  }

  // SDA rule: Only one person can be Church Clerk
  if (newRole.name === "Church Clerk") {
    const hasClerk = activeRoles.some(
      (ur) =>
        ur.user_id !== userId &&
        ur.role?.name === "Church Clerk" &&
        ur.scope_type === "church"
    );
    if (hasClerk) {
      return {
        valid: false,
        reason: "Church already has a Clerk. Please remove the previous one first.",
      };
    }
  }

  return { valid: true };
}

/**
 * Get upcoming role expirations (within N days)
 */
export function getUpcomingExpirations(
  userRoles: UserRole[],
  daysAhead: number = 30
): UserRole[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  return userRoles.filter((ur) => {
    if (!ur.end_date) return false;

    const endDate = new Date(ur.end_date);
    const today = new Date();

    return endDate <= cutoffDate && endDate >= today;
  });
}

/**
 * Create a permission key for lookup
 */
export function createPermissionKey(action: string, resource: string): string {
  return `${action}:${resource}`;
}

/**
 * Build a map of role ID -> Set of permission keys for quick lookup
 */
export function buildPermissionMap(
  roles: Role[],
  rolePermissions: Array<{ role_id: string; permission_id: string }>,
  permissions: Permission[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const permissionMap = new Map(permissions.map((p) => [p.id, p]));

  roles.forEach((role) => {
    const perms = new Set<string>();

    rolePermissions.forEach((rp) => {
      if (rp.role_id === role.id) {
        const permission = permissionMap.get(rp.permission_id);
        if (permission) {
          perms.add(createPermissionKey(permission.action, permission.resource));
        }
      }
    });

    map.set(role.id, perms);
  });

  return map;
}

export default {
  isRoleActive,
  getActiveRoles,
  userHasRole,
  userHasPermission,
  isSystemAdmin,
  isChurchAdmin,
  isDepartmentDirector,
  getUserScopes,
  canAccessScope,
  groupRolesByCategory,
  formatUserRole,
  validateRoleAssignment,
  getUpcomingExpirations,
  createPermissionKey,
  buildPermissionMap,
};
