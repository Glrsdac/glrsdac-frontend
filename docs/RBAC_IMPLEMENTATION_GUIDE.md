 # RBAC Implementation Guide for GLRSDAC

## Overview

This guide walks through implementing the comprehensive Role-Based Access Control (RBAC) system for the GLRSDAC church platform. The system supports multi-role users, scoped permissions, and SDA-specific governance structures.

## Current State vs. Target State

### Current (Simple Model)
```
users → profiles.role (single: ADMIN, TREASURER, CLERK, VIEWER)
```

### Target (RBAC Model)
```
users
  ├── user_roles (multiple)
    ├── role_id → roles (name, category)
    │  └── role_permissions
    │      └── permission_id → permissions (action, resource)
    └── scope_type, scope_id (global, church, or department)
```

## Implementation Timeline

### Phase 1: Database Setup (1-2 days)
- ✅ Create new tables
- ✅ Define roles, permissions, departments
- ✅ Set up RLS policies
- ⏳ Migrate existing data

### Phase 2: Edge Functions (2-3 days)
- ⏳ Create admin-manage-roles function
- ⏳ Update admin-list-users for multi-role
- ⏳ Create role assignment functions

### Phase 3: Frontend (3-4 days)
- ⏳ Update Users page UI for multi-role
- ⏳ Create Roles management page
- ⏳ Add scope selector components
- ⏳ Display role expiration dates

### Phase 4: Testing & Refinement (2 days)
- ⏳ Test RLS policies
- ⏳ Test multi-role scenarios
- ⏳ Test scope restrictions
- ⏳ Performance testing

**Total: 1-2 weeks**

---

## Detailed Implementation Steps

### Step 1: Deploy Database Migrations

```bash
# In Supabase dashboard, run these in SQL editor:

# 1. Core RBAC tables and RLS
# File: supabase/migrations/add_rbac_tables.sql

# 2. SDA-specific roles and departments
# File: supabase/migrations/sda_roles_template.sql

# Verify:
SELECT COUNT(*) FROM roles;          -- Should be 25+
SELECT COUNT(*) FROM permissions;    -- Should be 40+
SELECT COUNT(*) FROM departments;    -- Should be 9+
```

### Step 2: Migrate Existing Data

```bash
cd scripts
# Set environment variables
export VITE_SUPABASE_URL=your-url
export SUPABASE_SERVICE_ROLE_KEY=your-key

# Run migration
bun migrate-to-rbac.mjs

# Output:
# ✅ Successfully migrated 5 users
# - John: System Admin (global)
# - Ama: Church Treasurer (church)
# - etc.
```

### Step 3: Deploy Edge Functions

```bash
# 1. Deploy admin-manage-roles (new)
supabase functions deploy admin-manage-roles

# 2. Update admin-list-users to return multi-role data
# Add this to admin-list-users/index.ts:

const { data: rolesData, error: rolesError } = await supabase
  .from("user_roles")
  .select("*, role:roles(id, name, category)")
  .eq("is_active", true);

// Map roles to users
const userRolesMap = new Map();
rolesData.forEach(ur => {
  if (!userRolesMap.has(ur.user_id)) {
    userRolesMap.set(ur.user_id, []);
  }
  userRolesMap.get(ur.user_id).push(ur);
});

// Return in response
return new Response(
  JSON.stringify({
    users: users.map(u => ({
      ...u,
      roles: userRolesMap.get(u.id) || []
    }))
  })
);
```

### Step 4: Update Frontend Components

#### 4a. Users.tsx - Multi-role Assignment

```typescript
// Add to Users.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function UsersPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [scopeType, setScopeType] = useState('global');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    // Fetch roles
    const fetchRoles = async () => {
      const { data } = await supabase.from('roles').select('*');
      setRoles(data || []);
    };
    fetchRoles();
  }, []);

  const handleAssignRole = async (userId: string) => {
    const { error } = await supabase.from('user_roles').insert([
      {
        user_id: userId,
        role_id: selectedRole,
        scope_type: scopeType,
        scope_id: scopeType === 'department' ? department : null,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true
      }
    ]);

    if (!error) {
      // Refresh user list
      fetchUsers();
    }
  };

  return (
    <div>
      <select 
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
      >
        <option value="">Select Role</option>
        {roles.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      <select
        value={scopeType}
        onChange={(e) => setScopeType(e.target.value)}
      >
        <option value="global">Global</option>
        <option value="church">Church</option>
        <option value="department">Department</option>
      </select>

      {scopeType === 'department' && (
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">Select Department</option>
          {/* Fetch departments from DB */}
        </select>
      )}

      <button onClick={() => handleAssignRole(selectedUserId)}>
        Assign Role
      </button>
    </div>
  );
}
```

#### 4b. User Profile Display

```typescript
// Add to UserProfile.tsx or Users table
import { formatUserRole } from '../lib/rbac';

interface UserWithRoles {
  id: string;
  email: string;
  roles: Array<{
    id: string;
    role: { name: string; category: string };
    scope_type: string;
    scope_name?: string;
    end_date?: string;
  }>;
}

export function UserRoleDisplay({ user }: { user: UserWithRoles }) {
  return (
    <div>
      {user.roles.map(role => (
        <div key={role.id} className="flex items-center gap-2 mb-2">
          <Badge>{role.role.name}</Badge>
          {role.scope_name && (
            <span className="text-sm text-gray-600">{role.scope_name}</span>
          )}
          {role.end_date && (
            <span className="text-xs text-orange-600">
              Expires: {new Date(role.end_date).toLocaleDateString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 4c. Permission Checking Hook

```typescript
// Add to hooks/use-auth.ts
import { useMemo } from 'react';
import { isSystemAdmin, isDepartmentDirector } from '../lib/rbac';

export function usePermissions(user: any) {
  const permissions = useMemo(() => ({
    isAdmin: isSystemAdmin(user.roles || []),
    isDepartmentDir: (deptId: string) => 
      isDepartmentDirector(user.roles || [], deptId),
    canManageUsers: isSystemAdmin(user.roles || []),
    canManageFinances: user.roles?.some(r => 
      ['Church Treasurer', 'Church System Admin'].includes(r.role.name)
    )
  }), [user.roles]);

  return permissions;
}
```

### Step 5: Create Role Management Page

```typescript
// Create: src/pages/RoleManagement.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    // Fetch roles and permissions
    Promise.all([
      supabase.from('roles').select('*'),
      supabase.from('permissions').select('*')
    ]).then(([rolesRes, permsRes]) => {
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
    });
  }, []);

  const handleAddPermissionToRole = async (permissionId: string) => {
    const { error } = await supabase
      .from('role_permissions')
      .insert([{
        role_id: selectedRole.id,
        permission_id: permissionId
      }]);

    if (!error) {
      // Refresh
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Role Management</h1>

      {/* Roles List */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Roles</h2>
        <div className="grid grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="p-4 border rounded cursor-pointer"
              onClick={() => setSelectedRole(role)}
            >
              <h3 className="font-semibold">{role.name}</h3>
              <p className="text-sm text-gray-600">{role.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions for Selected Role */}
      {selectedRole && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Permissions for {selectedRole.name}
          </h2>
          <div className="space-y-2">
            {permissions.map(perm => (
              <label key={perm.id} className="flex items-center gap-2">
                <input type="checkbox" />
                <span>{perm.action} {perm.resource}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 6: Update RLS Policies

The RLS policies should now check the new `user_roles` table with scoping.

Example for a budget table:

```sql
-- Old RLS (Simple)
CREATE POLICY "Treasurers can view budgets" ON budgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'TREASURER'
    )
  );

-- New RLS (RBAC with Scope)
CREATE POLICY "Users can view budgets they have access to" ON budgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
        AND p.action = 'read'
        AND p.resource = 'budget'
        AND (
          ur.scope_type = 'global'
          OR (ur.scope_type = 'church' AND budgets.church_id = ur.scope_id)
          OR (ur.scope_type = 'department' AND budgets.department_id = ur.scope_id)
        )
    )
  );
```

### Step 7: Testing Checklist

- [ ] Migrate existing users successfully
- [ ] Display all user roles in Users page
- [ ] Assign multiple roles to a user
- [ ] Test global scope access (System Admin sees all)
- [ ] Test church scope access (only their church's data)
- [ ] Test department scope (only their department)
- [ ] Test role expiration (end_date validation)
- [ ] Test inactive roles (is_active=false)
- [ ] Test permission inheritance
- [ ] Test RLS policies with multi-role
- [ ] Test concurrent role assignments
- [ ] Performance test with 1000+ users

---

## Migration Rollback

If issues occur, rollback to simple role system:

```bash
# Option 1: Use old profiles.role column
# Keep both systems running temporarily

# Option 2: Full rollback
supabase db reset
# Then redeploy without RBAC migrations
```

---

## Performance Considerations

1. **Index Strategy**
   - ✅ `user_roles(user_id)` - for user lookup
   - ✅ `user_roles(role_id)` - for permission queries
   - ✅ `role_permissions(role_id)` - for permission assignment
   - ✅ `user_roles(end_date)` - for expiration checks

2. **Caching**
   - Cache role permissions on frontend (revalidate on assignment change)
   - Cache department list
   - Cache user scopes in session

3. **Query Optimization**
   - Use `role_permissions` junction table efficiently
   - Consider materialized views for complex queries
   - Batch permission checks

---

## SDA-Specific Notes

### Role Hierarchy
```
Layer 1: System Admin (all access)
  ↓
Layer 2: Church Leadership (Head Elder, Treasurer, Clerk, Board)
  ↓
Layer 3: Department Directors (Youth, Women's, etc.)
  ↓
Layer 4: Department Members
```

### Term Management
SDA officers typically serve 2-year terms. Use `user_roles.end_date` to enforce:

```sql
-- Find expiring roles in next 30 days
SELECT ur.id, u.email, r.name, ur.end_date
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE ur.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY ur.end_date;
```

### Governance Rules
Implement validation in `validateRoleAssignment()` function:
- Only one Church Treasurer
- Only one Church Clerk
- Only one Head Elder
- Maximum term length (24 months)

---

## Common Tasks

### Assign Role to User
```typescript
const { error } = await supabase
  .from('user_roles')
  .insert([{
    user_id: 'user-uuid',
    role_id: 'role-uuid',
    scope_type: 'department',
    scope_id: 'department-uuid',
    start_date: '2026-02-25',
    end_date: '2028-02-24', // 2-year term
  }]);
```

### Remove Role from User
```typescript
// Soft delete (preferred - keeps audit trail)
const { error } = await supabase
  .from('user_roles')
  .update({ is_active: false })
  .eq('id', 'role-assignment-id');

// Hard delete (if needed)
const { error } = await supabase
  .from('user_roles')
  .delete()
  .eq('id', 'role-assignment-id');
```

### Add New Permission
```typescript
// 1. Create permission
const { data: perm } = await supabase
  .from('permissions')
  .insert([{
    action: 'approve',
    resource: 'event',
    description: 'Approve department events'
  }])
  .select()
  .single();

// 2. Assign to role
await supabase
  .from('role_permissions')
  .insert([{
    role_id: 'role-uuid',
    permission_id: perm.id
  }]);
```

### Create New Role
```typescript
const { data: role } = await supabase
  .from('roles')
  .insert([{
    name: 'Community Services Director',
    description: 'Directs community outreach programs',
    category: 'governance'
  }])
  .select()
  .single();
```

---

## Troubleshooting

### Issue: "Unauthorized" when assigning roles
**Solution:** User is not System Admin. Check:
```sql
SELECT * FROM user_roles
WHERE user_id = 'user-uuid'
  AND is_active = true;
```

### Issue: Role appears inactive
**Solution:** Check end_date and is_active:
```sql
SELECT id, end_date, is_active
FROM user_roles
WHERE user_id = 'user-uuid';
```

### Issue: Permission not working
**Solution:** Verify role has permission:
```sql
SELECT p.action, p.resource
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = 'role-uuid';
```

### Issue: RLS policy blocking access
**Solution:** Check RLS policy matches role/scope logic:
```sql
-- Test RLS (as specific user)
SELECT * FROM budgets
WHERE budget_id = 'test-id';
-- Should return data if user has permission
```

---

## Next Steps

1. ✅ Deploy database migrations
2. ✅ Run data migration script
3. ⏳ Deploy edge functions
4. ⏳ Update frontend components
5. ⏳ Create Role Management page
6. ⏳ Comprehensive testing
7. ⏳ Update documentation
8. ⏳ Train admins on new system

---

## References

- [RBAC Design Document](./RBAC_IMPLEMENTATION_PLAN.md)
- [SDA Roles Template](./supabase/migrations/sda_roles_template.sql)
- [RBAC Utilities](./src/lib/rbac.ts)
- [Role Management Edge Function](./supabase/functions/admin-manage-roles/)
