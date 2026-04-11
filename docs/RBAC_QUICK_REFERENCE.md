# RBAC Quick Reference

## Key Concepts

| Term | Definition |
|------|-----------|
| **Role** | A named permission set (e.g., "Youth Director") |
| **Permission** | An action on a resource (e.g., "create events") |
| **Scope** | Level at which role applies (global, church, department) |
| **User_Role** | Assignment of a role to a user with scope |
| **Term** | Duration a role is valid (start_date to end_date) |

## Role Categories

### System Roles
Global platform access
- **System Admin** - Full access, all churches
- **Auditor** - Read-only financial access
- **Viewer** - Read-only general access

### Governance Roles  
Church leadership positions
- **Head Elder** - Church leader
- **Church Board Member** - Board member
- **Executive Committee** - Committee member
- **Church Treasurer** - Financial management
- **Church Clerk** - Records & attendance
- **Personal Ministries Leader** - Outreach

### Department Roles
Scoped to specific department
- **Department Director** - Department lead
- **Department Secretary** - Records
- **Department Treasurer** - Budget
- **Department Member** - Regular member

## Scope Types

```
Scope Type    | Applies To           | Example
--------------|----------------------|------------------
global        | All data             | System Admin
church        | One church's data    | Church Treasurer
department    | One department       | Youth Director
```

## Multi-Role Example

```
User: Ama
├── System Admin (global)
│   └── Can: Manage all users, system config
├── Executive Committee (church:main_church)
│   └── Can: Approve budgets, view reports
└── Youth Director (department:youth)
    └── Can: Manage youth events, volunteers
```

## SDA Roles Matrix

### Church Leadership
| Role | Permissions | Scope |
|------|-------------|-------|
| Head Elder | All + approve | church |
| Treasurer | Financial + approve | church |
| Clerk | Membership + minutes | church |
| Board Member | Read oversight | church |

### Department Leaders
| Department | Director | Secretary | Treasurer |
|------------|----------|-----------|-----------|
| Youth | Events, reports | Records | Budget |
| Women's | Events, reports | Records | Budget |
| Pathfinder | Events, reports | Records | Budget |
| Sabbath School | Schedule, reports | Attendance | - |

### Term Defaults (SDA)
- Leaders: 2 years
- Directors: 1-2 years
- Seasonal: 3-6 months
- Clerks: 1 year

## Permissions by Resource

### User Management
- create, read, update, delete (System Admin only)

### Financial
- create, read, update, approve (Treasurers)
- read (Auditor, Executive)

### Membership
- create, read, update (Clerk)
- read (Personal Ministries)

### Events
- full access (Department Director)
- read, create (Department Member)

### Reports
- create, read, update (Department)
- read, approve (Leadership)

## Code Examples

### Check if admin
```typescript
import { isSystemAdmin } from '@/lib/rbac';

if (isSystemAdmin(user.roles)) {
  // Show admin panel
}
```

### Check specific role
```typescript
import { userHasRole } from '@/lib/rbac';

if (userHasRole(user.roles, 'Youth Director', { 
  type: 'department', 
  id: departmentId 
})) {
  // Allow youth event management
}
```

### Check permission
```typescript
import { userHasPermission, buildPermissionMap } from '@/lib/rbac';

const permMap = buildPermissionMap(roles, rolePerms, permissions);
if (userHasPermission(user.roles, 'approve', 'budget', permMap)) {
  // Show approve button
}
```

### Get user scopes
```typescript
import { getUserScopes } from '@/lib/rbac';

const departments = getUserScopes(user.roles, 'department');
// Returns Set<string> of department IDs user can access
```

### Assign role
```typescript
const { error } = await supabase.from('user_roles').insert({
  user_id: userId,
  role_id: roleId,
  scope_type: 'department',
  scope_id: departmentId,
  start_date: '2026-02-25',
  end_date: '2028-02-24', // 2-year term
  is_active: true
});
```

## Database Queries

### Get active roles for user
```sql
SELECT ur.id, r.name, ur.scope_type, ur.scope_id, ur.end_date
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'user-id'
  AND ur.is_active = true
  AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE);
```

### Find users with specific role
```sql
SELECT u.id, u.email, ur.scope_type, ur.scope_id
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Youth Director'
  AND ur.is_active = true;
```

### Find expiring roles
```sql
SELECT u.email, r.name, ur.end_date
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE ur.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY ur.end_date;
```

### Get permissions for role
```sql
SELECT p.action, p.resource
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = 'role-id'
ORDER BY p.resource, p.action;
```

## Edge Function Endpoints

### admin-manage-roles
```javascript
// List all roles
POST /functions/v1/admin-manage-roles
{ "action": "list_roles" }

// Create role
POST /functions/v1/admin-manage-roles
{ 
  "action": "create_role",
  "name": "Event Coordinator",
  "description": "...",
  "category": "governance"
}

// Assign role to user
POST /functions/v1/admin-manage-roles
{
  "action": "assign_role",
  "user_id": "...",
  "role_id": "...",
  "scope_type": "department",
  "scope_id": "...",
  "start_date": "2026-02-25",
  "end_date": "2028-02-24"
}

// Revoke role
POST /functions/v1/admin-manage-roles
{
  "action": "revoke_role",
  "id": "user_role_id"
}

// List user roles
POST /functions/v1/admin-manage-roles
{
  "action": "list_user_roles",
  "user_id": "..."
}

// List permissions
POST /functions/v1/admin-manage-roles
{ "action": "list_permissions" }

// Assign permission to role
POST /functions/v1/admin-manage-roles
{
  "action": "assign_permission_to_role",
  "role_id": "...",
  "permission_id": "..."
}
```

## Implementation Checklist

### Phase 1: Database
- [ ] Deploy `add_rbac_tables.sql`
- [ ] Deploy `sda_roles_template.sql`
- [ ] Verify tables created
- [ ] Verify roles populated
- [ ] Verify permissions populated

### Phase 2: Migration
- [ ] Run `migrate-to-rbac.mjs`
- [ ] Verify all users migrated
- [ ] Check role mappings correct
- [ ] Validate RLS policies work

### Phase 3: Backend
- [ ] Deploy `admin-manage-roles` function
- [ ] Update `admin-list-users` for multi-role
- [ ] Update all other edge functions for new schema

### Phase 4: Frontend
- [ ] Update Users page UI
- [ ] Add role assignment form
- [ ] Show multi-role display
- [ ] Add department selector
- [ ] Display expiration dates
- [ ] Create Roles management page
- [ ] Add permission checking hooks
- [ ] Update all components using roles

### Phase 5: Testing
- [ ] Test single role assignment
- [ ] Test multi-role assignment
- [ ] Test scope restrictions
- [ ] Test role expiration
- [ ] Test RLS policies
- [ ] Test edge cases
- [ ] Performance testing

## Troubleshooting

### "Permission denied" on role assignment
**Cause:** User not System Admin
**Fix:** Verify user has System Admin role with global scope

### Role shows as inactive immediately
**Cause:** end_date already passed
**Fix:** Check `end_date` >= today

### Permission not working in RLS
**Cause:** User's role not queried with scope check
**Fix:** Verify RLS policy includes scope_type and scope_id checks

### Performance degradation
**Cause:** Missing indexes on user_roles
**Fix:** Ensure indexes on user_id, role_id, scope_type, end_date

## Resources

- 📄 Full Implementation Plan: `RBAC_IMPLEMENTATION_PLAN.md`
- 📘 Implementation Guide: `RBAC_IMPLEMENTATION_GUIDE.md`
- 📋 SDA Roles Template: `supabase/migrations/sda_roles_template.sql`
- 🔧 Utilities: `src/lib/rbac.ts`
- ⚙️ Edge Function: `supabase/functions/admin-manage-roles/`
- 🚀 Migration Script: `scripts/migrate-to-rbac.mjs`

## Support

For issues or questions:
1. Check the full implementation guides
2. Review database schema documentation
3. Check RLS policy logs in Supabase
4. Review edge function logs
5. Check browser console for frontend errors

---

**Version:** 1.0  
**Last Updated:** 2026-02-25  
**Status:** Ready for Implementation
