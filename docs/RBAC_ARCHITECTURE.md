# RBAC Architecture Documentation
## 🔐 Security Principle (MANDATORY)

### IF IT AFFECTS PERMISSIONS → IT MUST COME FROM ROLES

This is the **core security principle** that governs all access control in the system:

- **✅ AUTHORIZED SOURCES**: `user_roles` table → `roles` table
- **❌ FORBIDDEN SOURCES**: Position, user_type, department membership, church affiliation
- **🔒 ENFORCEMENT**: All permission checks must flow through role assignments

**Verified Implementation:**
- Route guards use `fetchPermissionKeysForUser()`
- Portal access uses `resolvePortalAccess()`
- Database security uses role-based RLS policies
- No position-based permission logic exists

---
## � User Categories & System Access

### Critical Architectural Distinction: Membership ≠ System Access

**User Categories (Logical, Not DB Tables):**
- **MEMBER USER**: Church members with standard access (`members` table)
- **STAFF USER**: Church workers with specific roles (`members` + `user_roles`)
- **SYSTEM USER**: Administrative accounts without membership (`user_roles` only)

### Database Modeling Rules

| User Type | In `members`? | In `user_roles`? | Example |
|-----------|---------------|------------------|---------|
| Normal Member | ✅ | ❌ (unless staff) | Regular church member |
| Church Staff | ✅ | ✅ | Treasurer, Clerk, etc. |
| Church Admin | ❌ | ✅ | System Administrator |
| System Owner | ❌ | ✅ | Global Super Admin |

### Implementation Example

**✅ CORRECT: Church Admin (admin@glrsdac.com)**
```sql
-- profiles: ✅ exists
-- members: ❌ NOT a member
-- user_roles: ✅ Church Admin role for Gloryland Church
```

**❌ WRONG (Previous State)**
```sql
-- profiles: ✅ exists  
-- members: ❌ existed (WRONG!)
-- user_roles: ❌ no roles assigned
```

### Security Implications

**Why This Matters:**
- System users should not appear in member lists
- Administrative accounts need different workflows
- Membership status ≠ System access level
- Clean separation prevents confusion and security issues

---

### 1. ROLES ARE AUTHORITY
- **Source**: `user_roles` table → `roles` table
- **Purpose**: Determines all permissions and access control
- **Implementation**: `fetchPermissionKeysForUser()`, route guards, portal access
- **Security**: Enforced by RBAC trigger and Supabase RLS policies

### 2. POSITION IS UI LABEL
- **Source**: `members.position` field
- **Purpose**: Display and member management only
- **Implementation**: Forms, member lists, profile displays
- **Security**: No effect on permissions or access control

### 3. NEVER USE POSITION IN LOGIC
- **Forbidden**: Position-based routing, permissions, or business logic
- **Enforcement**: Codebase audit confirms no position logic exists
- **Rationale**: Ensures consistent, role-based access control

## Implementation Details

### Permission System
```typescript
// ✅ CORRECT: Role-based permissions
const { keys, isAdmin } = await fetchPermissionKeysForUser(userId);
// Uses: user_roles → roles table

// ❌ FORBIDDEN: Position-based logic
if (user.position === 'Church Treasurer') { /* access */ }
// This pattern does NOT exist
```

### Data Flow
```
User Authentication → user_roles → roles → Permission Keys → Access Control
                                      ↓
Position (UI Only) → Display Labels → Member Management
```

### Security Boundaries
- **Roles**: Control access to features, portals, and data
- **Position**: Informational metadata for organizational structure
- **Separation**: Position changes never affect permissions

---

# RBAC Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│  (React Components + TypeScript RBAC Utilities)                  │
│                                                                   │
│  Users.tsx (Multi-role UI)                                      │
│  │                                                               │
│  ├─ RoleAssignment Form                                         │
│  │  ├─ Role Selector                                            │
│  │  ├─ Scope Type (Global/Church/Department)                   │
│  │  ├─ Department Picker                                        │
│  │  └─ Term Dates (start_date, end_date)                       │
│  │                                                               │
│  ├─ useAuth Hook                                                │
│  │  └─ Check permissions with rbac.ts utilities                 │
│  │                                                               │
│  └─ UserRoleDisplay Component                                   │
│     └─ Show multi-role with scope badges                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ REST API Calls
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    EDGE FUNCTIONS LAYER                          │
│                  (Supabase Deno Functions)                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ admin-manage-roles                                   │        │
│  │ ├─ list_roles        → GET roles from DB            │        │
│  │ ├─ create_role       → INSERT into roles            │        │
│  │ ├─ assign_role       → INSERT into user_roles       │        │
│  │ ├─ revoke_role       → UPDATE is_active = false     │        │
│  │ ├─ list_permissions  → GET permissions              │        │
│  │ └─ assign_permission_to_role → Manage role_perms    │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ admin-list-users (UPDATED)                           │        │
│  │ └─ Joins user_roles + roles for multi-role data     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  Authentication: Bearer token from auth.users                   │
│  Authorization: Check System Admin status before ops            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Supabase PostgreSQL
                       │ Client Library
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│              (PostgreSQL with RLS Policies)                      │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ auth.users   │  (Supabase built-in)                          │
│  │ ├─ id        │                                                │
│  │ ├─ email     │                                                │
│  │ ├─ created_at│                                               │
│  │ └─ ...       │                                                │
│  └──────┬───────┘                                                │
│         │ (1:N) references                                       │
│         │                                                        │
│  ┌──────▼───────────────┐                                        │
│  │ user_roles           │  ← Main Assignment Table               │
│  │ ├─ id (UUID)         │                                        │
│  │ ├─ user_id (FK)      │                                        │
│  │ ├─ role_id (FK)      │                                        │
│  │ ├─ scope_type        │  (global | church | department)       │
│  │ ├─ scope_id          │  (NULL for global)                    │
│  │ ├─ start_date        │  (SDA term start)                     │
│  │ ├─ end_date          │  (SDA term end)                       │
│  │ ├─ is_active         │  (soft delete flag)                   │
│  │ └─ created_at        │                                        │
│  └──────┬──────────────┬┘                                        │
│         │              │                                         │
│         │ (N:1)        │ (N:1)                                   │
│         │ references   │ references                              │
│         │              │                                         │
│  ┌──────▼────────┐  ┌──▼──────────────┐                          │
│  │ roles          │  │ departments     │                         │
│  │ ├─ id (UUID)   │  │ ├─ id (UUID)    │                         │
│  │ ├─ name        │  │ ├─ name         │                         │
│  │ ├─ category    │  │ ├─ slug         │                         │
│  │ ├─ description │  │ ├─ church_id    │                         │
│  │ ├─ is_active   │  │ └─ is_active    │                         │
│  │ └─ created_at  │  │                 │                         │
│  └──────┬─────────┘  └─────────────────┘                         │
│         │                                                        │
│         │ (1:N) references                                       │
│         │                                                        │
│  ┌──────▼──────────────────┐                                     │
│  │ role_permissions         │  ← Mapping Table                   │
│  │ ├─ id (UUID)             │                                    │
│  │ ├─ role_id (FK)          │                                    │
│  │ ├─ permission_id (FK)    │                                    │
│  │ └─ created_at            │                                    │
│  └──────┬────────────────────┘                                   │
│         │                                                        │
│         │ (N:1)                                                  │
│         │ references                                             │
│         │                                                        │
│  ┌──────▼──────────────────────┐                                 │
│  │ permissions                  │                                │
│  │ ├─ id (UUID)                 │                                │
│  │ ├─ action                    │  (create|read|update|delete)   │
│  │ ├─ resource                  │  (budget|users|events|etc)     │
│  │ ├─ description               │                                │
│  │ ├─ is_active                 │                                │
│  │ └─ created_at                │                                │
│  └──────────────────────────────┘                                │
│                                                                   │
│  🔒 ROW LEVEL SECURITY (RLS) POLICIES:                           │
│  ├─ System Admin checks (is_active + end_date + scope)          │
│  ├─ User role visibility (users see own, admins see all)        │
│  ├─ Permission validation (action + resource checks)            │
│  ├─ Scope enforcement (global/church/department)                │
│  └─ Church/Department access restrictions                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Role Assignment Flow

```
User Admin Interface
      │
      ▼
┌──────────────────────────┐
│ Select Role              │
│ Select Scope             │
│ Pick Department (opt)    │
│ Set Term Dates           │
└──────────────────────────┘
      │
      ▼
 Validation
 ├─ Is current user admin?
 ├─ Is role available?
 ├─ Is scope valid?
 └─ Check SDA governance rules
      │
      ▼
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
      │
      ▼
Edge Function Validates
├─ User has System Admin role
├─ Role exists and is active
├─ Department exists (if scoped)
└─ No duplicate assignments
      │
      ▼
INSERT into user_roles
      │
      ▼
RLS Policy Check
├─ INSERT policy allows it?
└─ Scope constraints satisfied?
      │
      ▼
Response:
{
  "user_role": {
    "id": "...",
    "user_id": "...",
    "role_id": "...",
    "scope_type": "department",
    "scope_id": "...",
    "start_date": "2026-02-25",
    "end_date": "2028-02-24",
    "is_active": true
  }
}
      │
      ▼
Frontend Updates UI
└─ Show role assignment success
```

### 2. Permission Check Flow (At Runtime)

```
Component Loads
      │
      ▼
Check: Can user manage events?
      │
      ▼
usePermissions Hook
      │
      ├─ Get user.roles from context
      │
      ├─ Map roles to permissions
      │  └─ Build permission lookup table
      │
      ├─ Check: Do any active roles have "create" + "events"?
      │  └─ AND is scope valid?
      │
      ▼
Permission Granted?
├─ YES → Show management UI
└─ NO  → Hide/disable management UI
```

### 3. Database Query Flow (Permission Resolution)

```
Request: Can User A view Event X in Department Y?

      │
      ▼
SELECT * FROM events WHERE id = 'X'
      │
      │ (RLS Policy Triggers)
      │
      ▼
Check RLS Policy:
┌─────────────────────────────────────────────────┐
│ WHERE EXISTS (                                   │
│   SELECT 1 FROM user_roles ur                   │
│   JOIN roles r ON ur.role_id = r.id            │
│   JOIN role_permissions rp ON r.id = rp.role_id│
│   JOIN permissions p ON rp.permission_id = p.id│
│   WHERE ur.user_id = auth.uid()                │
│     AND ur.is_active = true                    │
│     AND (ur.end_date IS NULL                   │
│          OR ur.end_date >= CURRENT_DATE)       │
│     AND p.action = 'read'                      │
│     AND p.resource = 'events'                  │
│     AND (                                       │
│       ur.scope_type = 'global'                 │
│       OR (ur.scope_type = 'department'         │
│           AND events.department_id = ur.scope_id)
│     )                                           │
│ )                                               │
└─────────────────────────────────────────────────┘
      │
      ├─ User has System Admin? → ALLOW
      ├─ User is department director? → ALLOW
      ├─ User is department member? → Check "read" + "events"
      ├─ User's role expired? → DENY
      └─ User not in scope? → DENY
      │
      ▼
Result: Event X returned or denied
```

## Multi-User Scenario

```
User: Ama

In System:
┌────────────────────────────────────────────────────────┐
│ user_roles (Multiple rows for same user)               │
├─────────────┬───────────────┬─────────┬──────┬─────────┤
│ role_id     │ role_name     │ scope   │ type │ active? │
├─────────────┼───────────────┼─────────┼──────┼─────────┤
│ r1          │ System Admin  │ global  │ all  │ ✅      │
├─────────────┼───────────────┼─────────┼──────┼─────────┤
│ r2          │ Executive     │ church  │ c1   │ ✅      │
├─────────────┼───────────────┼─────────┼──────┼─────────┤
│ r3          │ Youth Direc.  │ dept    │ d1   │ ✅      │
└─────────────┴───────────────┴─────────┴──────┴─────────┘

Ama's Capabilities:
├─ SYSTEM LEVEL (as System Admin)
│  └─ Can: Create users, manage all roles, system config
│
├─ CHURCH LEVEL (as Executive Committee member)
│  └─ Can: Approve budgets, view financial summary
│
└─ DEPARTMENT LEVEL (as Youth Director)
   └─ Can: Manage youth events, volunteers, reports
```

## Scope Hierarchy & Access Control

```
┌─────────────────────────────────────────────┐
│         GLOBAL SCOPE (System Admin)         │
│  Sees/manages all data across all churches  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   CHURCH SCOPE (Church Admin)         │  │
│  │  Sees/manages church-specific data    │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ DEPARTMENT SCOPE                │  │  │
│  │  │ (Department Director)           │  │  │
│  │  │ Sees/manages department data    │  │  │
│  │  │                                 │  │  │
│  │  │ Youth   Womens   Sabbath School │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ DEPARTMENT SCOPE (Dept Member)  │  │  │
│  │  │ Sees/manages limited dept data  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   OTHER CHURCHES (No access)          │  │
│  │   Church B data not visible           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## SDA Governance Structure Supported

```
Organizational Hierarchy:

Conference (Optional Override)
    │
    ▼
Church Board
├─ Head Elder (single)
├─ Executive Committee (multiple members)
├─ Church Treasurer (single)
└─ Church Clerk (single)
    │
    ├─► Department 1: Youth
    │   ├─ Youth Director
    │   ├─ Department Treasurer
    │   ├─ Department Secretary
    │   └─ Members
    │
    ├─► Department 2: Women's Ministries
    │   └─ Similar structure
    │
    ├─► Department 3: Sabbath School
    │   ├─ Superintendent
    │   ├─ Secretary
    │   └─ Teachers
    │
    └─► Seasonal: Nominating Committee (3 months)


RBAC Representation:

Head Elder
└─ Role: "Head Elder" (governance)
   Scope: church (main_church)
   Term: 2026-02-25 → 2028-02-24

Youth Director
└─ Role: "Youth Director" (governance)
   Scope: department (youth_dept)
   Term: 2026-02-25 → 2027-02-24

Nominating Chair (Temporary)
└─ Role: "Nominating Committee Chair" (governance)
   Scope: church (main_church)
   Term: 2026-11-01 → 2026-12-15 (seasonal)
```

## Performance Optimization Strategy

```
Frontend Caching
    │
    ├─ Cache role definitions (revalidate on change)
    ├─ Cache department list (low change rate)
    ├─ Cache permission map (revalidate on role assignment)
    └─ Cache user roles in session
    │
    ▼
Database Indexes
    │
    ├─ idx_user_roles_user_id    (fast user lookup)
    ├─ idx_user_roles_role_id    (fast permission queries)
    ├─ idx_role_permissions      (fast permission assignment)
    ├─ idx_departments_church    (scope-based queries)
    └─ idx_user_roles_end_date   (expiration checks)
    │
    ▼
Query Optimization
    │
    ├─ Batch permission checks
    ├─ Use JOINs efficiently
    ├─ Select only needed columns
    └─ Limit scope queries to relevant entities
    │
    ▼
RLS Performance
    │
    ├─ Cache active role checks
    ├─ Parallel permission resolution
    └─ Early termination on match
```

## Integration Points

```
┌──────────────────────────────────────────────────────┐
│ EXISTING SYSTEMS → RBAC                              │
├──────────────────────────────────────────────────────┤
│                                                       │
│ profiles.role (OLD)                                  │
│ └─ Migrate to: user_roles.role_id                   │
│                                                       │
│ members (Invitations)                                │
│ └─ Works with: user_roles for access control        │
│                                                       │
│ auth.users (Authentication)                          │
│ └─ References: user_roles for authorization         │
│                                                       │
│ budget, expenses, offerings (Financial)              │
│ └─ Protected by: RBAC + RLS policies               │
│                                                       │
│ events, announcements (Department)                   │
│ └─ Scoped to: user_roles.scope_id                   │
│                                                       │
│ attendance, baptisms, transfers (Clerk)             │
│ └─ Managed by: Church Clerk role                    │
│                                                       │
└──────────────────────────────────────────────────────┘

New: Vercel Deployment
├─ Frontend uses RBAC utilities from src/lib/rbac.ts
├─ Calls admin-manage-roles edge function
└─ Manages roles via admin UI

New: GitHub
├─ All RBAC code versioned
├─ Migrations tracked
└─ Safe rollback possible
```

---

## Legend

```
│  = Vertical connection
├─ = Branch
▼  = Flow direction
→  = References/Links
└─ = Final connection
(FK) = Foreign Key
(1:N) = One-to-Many relationship
(N:1) = Many-to-One relationship
🔒 = Security/RLS Policy
✅ = Active/Valid
```

---

## Summary

The RBAC system is a **multi-layered, scoped, and policy-driven** architecture that:

1. **Separates concerns** - Roles, permissions, and scopes are independent
2. **Supports multiple levels** - Global, church, and department access
3. **Enforces governance** - SDA rules built into validation
4. **Scales efficiently** - Indexes and caching for performance
5. **Maintains security** - RLS policies on every table
6. **Remains flexible** - New roles/permissions without code changes
7. **Integrates smoothly** - Works with existing data and systems
8. **Provides auditability** - Track all role assignments and changes
