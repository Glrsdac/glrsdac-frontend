# Role-Based Access Control (RBAC) Implementation Plan

## Current State
- Simple 4-role system: ADMIN, TREASURER, CLERK, VIEWER
- One role per user (`user_roles` table with single role)
- No scoping (global permissions only)
- No term-based roles

## Target State
- Multi-role support (one user = many roles)
- Scoped permissions (role + scope + resource)
- Three-layer hierarchy: System → Church → Department
- SDA-aware structure with governance roles
- Term-based role expiration

---

## Phase 1: Database Schema Redesign

### New Tables Structure

```sql
-- 1. Roles Table (Define role types, not user-role links)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'system', 'governance', 'department'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Permissions Table (Define what actions are allowed)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,      -- 'create', 'read', 'update', 'delete'
  resource VARCHAR(50) NOT NULL,     -- 'users', 'budget', 'membership', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(action, resource)
);

-- 3. Role_Permissions (Map roles to permissions)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- 4. User_Roles (Map users to roles with scope)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  
  -- Scope information
  scope_type VARCHAR(50) NOT NULL, -- 'global', 'church', 'department'
  scope_id UUID,                   -- department_id or church_id (NULL for global)
  
  -- Term management (SDA-specific)
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id, scope_type, scope_id)
);

-- 5. Departments (For scoped roles)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration from Old to New

```sql
-- Step 1: Migrate existing roles to new roles table
INSERT INTO roles (name, description, category) VALUES
  ('System Admin', 'Platform-wide administrator', 'system'),
  ('Church System Admin', 'Church-level system administrator', 'governance'),
  ('Auditor', 'Read-only financial access', 'system'),
  ('Head Elder', 'Church leadership', 'governance'),
  ('Church Board Member', 'Board member', 'governance'),
  ('Executive Committee', 'Executive committee member', 'governance'),
  ('Church Clerk', 'Church clerk', 'governance'),
  ('Church Treasurer', 'Church treasurer', 'governance'),
  ('Department Director', 'Department lead', 'department'),
  ('Department Secretary', 'Department secretary', 'department'),
  ('Department Treasurer', 'Department treasurer', 'department'),
  ('Department Member', 'Department member', 'department'),
  ('Viewer', 'Read-only access', 'system');

-- Step 2: Migrate existing user_roles
INSERT INTO user_roles (user_id, role_id, scope_type, scope_id, start_date, end_date, is_active)
SELECT 
  ur.user_id,
  r.id,
  'global',
  NULL,
  CURRENT_DATE,
  NULL,
  true
FROM old_user_roles ur
JOIN roles r ON ur.role = r.name;
```

---

## Phase 2: Define Permissions by Domain

### Platform Governance Domain
```
Action: create, read, update, delete
Resource: users, system_settings, audit_logs
Assigned to: System Admin, Church System Admin, Auditor (read-only)
```

### Financial Domain
```
Action: create, read, update, approve
Resource: budget, expense, offering, ledger
Assigned to: Church Treasurer, Department Treasurer, Auditor (read-only)
```

### Membership/Clerk Domain
```
Action: create, read, update
Resource: members, baptisms, transfers, attendance, minutes
Assigned to: Church Clerk, Assistant Clerk
```

### Department Portal Domain
```
Action: create, read, update, delete
Resource: events, announcements, reports, volunteers
Assigned to: Department Director, Department Secretary, Department Member (limited)
```

### Executive Oversight Domain
```
Action: read, approve
Resource: reports, budgets, summary_dashboards
Assigned to: Head Elder, Executive Committee, Church Board Member
```

---

## Phase 3: RLS Policy Redesign

### Current RLS Issue
```sql
-- Old: Simple check
WHERE has_role('TREASURER')
```

### New RLS with Scope
```sql
-- New: Check role + scope
WHERE EXISTS (
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
      ur.scope_type = 'global'  -- System admins see everything
      OR (ur.scope_type = 'church' AND budget.church_id = ur.scope_id)
      OR (ur.scope_type = 'department' AND budget.department_id = ur.scope_id)
    )
)
```

---

## Phase 4: Example User Setups (SDA Church)

### Ama (Multi-role Example)
```
User: Ama
├── Role: System Admin (scope: global)
│   └── Can: Manage all users, system config
├── Role: Executive Committee (scope: church)
│   └── Can: Approve budgets, view financial summary
└── Role: Youth Director (scope: department:youth)
    └── Can: Manage youth events, volunteers, reports
```

### Church Treasurer
```
User: John
└── Role: Church Treasurer (scope: church)
    └── Can: Create expenses, approve offering, manage ledger
```

### Youth Leader
```
User: Maria
├── Role: Youth Director (scope: department:youth)
│   └── Can: Manage youth events, reports
└── Role: Department Treasurer (scope: department:youth)
    └── Can: Manage youth budget
```

### Department Member
```
User: David
└── Role: Department Member (scope: department:sabbath_school)
    └── Can: View department info, submit reports
```

---

## Phase 5: Frontend Updates

### User Profile Display
```typescript
// Old
<Badge>{user.roles[0]}</Badge>

// New
<div>
  {user.roles.map(role => (
    <div key={role.id}>
      <Badge>{role.name}</Badge>
      {role.scope_type === 'department' && (
        <span className="text-xs">{role.department_name}</span>
      )}
      {role.end_date && (
        <span className="text-xs">Expires: {role.end_date}</span>
      )}
    </div>
  ))}
</div>
```

### Permission Checking
```typescript
// Old
function canEdit() {
  return user.roles.includes('ADMIN');
}

// New
function canEdit(resource) {
  return user.roles.some(role =>
    role.permissions.some(perm =>
      perm.action === 'edit' && perm.resource === resource &&
      (role.scope_type === 'global' || isScopeValid(role))
    )
  );
}
```

### Role Assignment UI
```typescript
// New role assignment form
<div>
  <Select name="role">
    <optgroup label="System Roles">
      <option>System Admin</option>
      <option>Auditor</option>
    </optgroup>
    <optgroup label="Governance Roles">
      <option>Executive Committee</option>
      <option>Church Treasurer</option>
      <option>Church Clerk</option>
    </optgroup>
    <optgroup label="Department Roles">
      <option>Department Director</option>
      <option>Department Secretary</option>
    </optgroup>
  </Select>

  {role.includes('Department') && (
    <Select name="department">
      <option>Youth</option>
      <option>Women's Ministries</option>
      <option>Personal Ministries</option>
    </Select>
  )}

  {showTermDates && (
    <>
      <DatePicker name="start_date" />
      <DatePicker name="end_date" />
    </>
  )}
</div>
```

---

## Phase 6: Implementation Steps

### Step 1: Create New Tables
- Run migration SQL
- Keep old tables for now (soft migration)

### Step 2: Migrate Data
- Map old roles to new roles
- Set scope_type = 'global' for all existing users
- Set end_date = NULL for existing roles

### Step 3: Update RLS Policies
- Rewrite RLS to check new permission structure
- Test with existing data

### Step 4: Update Edge Functions
- Update admin-list-users to return multi-role data
- Update admin-create-user to support role + scope
- Create new functions for role management

### Step 5: Update Frontend
- Update Users page to show multi-role
- Add scope display (department name)
- Add term date display
- Update role assignment form

### Step 6: Add Role Management Pages
- Create Roles management page (System Admin only)
- Create Permission management page
- Create User role assignment page

### Step 7: Testing
- Test role inheritance
- Test scope restrictions
- Test term expiration
- Test multi-role conflicts

---

## Implementation Order (Priority)

### High Priority (Core Functionality)
1. ✅ Create new tables (non-breaking)
2. ✅ Migrate existing data
3. ✅ Update RLS policies
4. ✅ Update admin-list-users function
5. ✅ Update Users page UI

### Medium Priority (Governance Features)
6. Add governance roles (Executive, Board, Clerk)
7. Add role assignment UI with scopes
8. Add department-scoped roles
9. Add term date management

### Low Priority (Advanced Features)
10. Role expiration automation
11. Audit log for role changes
12. Role templates for quick setup
13. Conference-level override access

---

## SDA-Specific Enhancements

### Church Authority Structure
```
Governance Hierarchy:
1. Conference (Optional oversight)
2. Church Board
3. Executive Committee
4. Department Directors
5. Members
```

### Seasonal Roles
```
Nominating Committee (3 months, end of year)
Vacation Bible School Committee (Summer)
Holiday Planning Committee (December)
```

### Official Positions (SDA)
- Head Elder / Elder
- Head Deacon / Deacon
- Head Deaconess / Deaconess
- Personal Ministries Leader
- Sabbath School Superintendent

---

## Benefits of This Approach

✅ **Flexibility:** Users can have multiple roles simultaneously
✅ **Scoped Access:** Control permissions by department/church
✅ **SDA-Aligned:** Reflects real church structure
✅ **Term Management:** Roles automatically expire
✅ **Scalable:** Easy to add new roles/permissions
✅ **Audit Trail:** Track who has what access when
✅ **Conference Ready:** Multi-church support ready
✅ **Future Proof:** Can support complex hierarchies

---

## Backward Compatibility

During migration:
- Old `user_roles` table remains for reference
- New `user_roles` contains same data with scope_type='global'
- Frontend checks both tables during transition
- No data loss, gradual cutover

---

## Next Steps

1. Review this design with stakeholders
2. Identify additional SDA roles needed
3. Define permissions matrix for each role
4. Plan implementation timeline
5. Start with Phase 1 (database)
6. Test RLS policies before frontend changes

**Estimated Timeline:**
- Phase 1-3: 1 week (database + RLS)
- Phase 4-5: 1 week (frontend)
- Phase 6: 2 weeks (testing + refinement)
- Total: ~3-4 weeks for complete implementation
