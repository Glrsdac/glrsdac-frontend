# User Management Setup - Complete

## Overview

User management has been successfully configured with a complete hierarchy of test accounts supporting multiple roles and departments.

## User Accounts Created (11 Total)

### System Administrators (1)
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@glrsdac.com | Admin@123 | ADMIN | Full system access, user administration |

### Financial Officers (2)
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| treasurer@glrsdac.com | Treasurer@123 | TREASURER | Financial management, fund operations |
| finance.head@glrsdac.com | FinanceHead@2026 | TREASURER | Finance department leadership |

### Administrative Staff (3)
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| clerk@glrsdac.com | Clerk@123 | CLERK | Collection & session management |
| ushers.head@glrsdac.com | UshersHead@2026 | CLERK | Ushers department leadership |
| music.head@glrsdac.com | MusicHead@2026 | CLERK | Music department leadership |

### Church Members (3)
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| mary.williams@glrsdac.com | MaryWilliams@2026 | VIEWER | Member account (read-only) |
| peter.brown@glrsdac.com | PeterBrown@2026 | VIEWER | Member account (read-only) |
| grace.davis@glrsdac.com | GraceDavis@2026 | VIEWER | Member account (read-only) |

### General Viewers (2)
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| viewer1@glrsdac.com | Viewer1@2026 | VIEWER | General read-only access |
| viewer2@glrsdac.com | Viewer2@2026 | VIEWER | General read-only access |

## Role Definitions

### ADMIN (1 user)
- **Access**: Full system access to all tables
- **Permissions**: CREATE, READ, UPDATE, DELETE on all data
- **Use Case**: System administrators, SuperAdmins
- **Current Users**: 1

### TREASURER (2 users)
- **Access**: Financial tables (funds, contributions, payments, imprest accounts, returns)
- **Permissions**: Full control over financial operations
- **Use Case**: Finance officers, fund management
- **Current Users**: 2

### CLERK (3 users)
- **Access**: Collection & session data (contributions, sabbath sessions, collections)
- **Permissions**: Record collections, manage sessions
- **Use Case**: Administrative staff, collection coordinators
- **Current Users**: 3

### VIEWER (5 users)
- **Access**: Read-only access to all data
- **Permissions**: SELECT only
- **Use Case**: Members, general information access
- **Current Users**: 5

## Verification Status

✅ **All 11 credentials tested and verified working**
- Login successful for all users
- Profiles loaded correctly
- Roles assigned and retrievable
- Sessions active and valid

## Department Structure

### Current Departments (5)
1. **Finance** - 4 members (Jane Smith, John Doe, Mary Williams, Samuel Johnson)
2. **Ushers** - 4 members (Jane Smith, John Doe, Mary Williams, Samuel Johnson)
3. **Music** - 4 members (Jane Smith, John Doe, Mary Williams, Samuel Johnson)
4. **Education** - 0 members
5. **Outreach** - 0 members

### Department Leadership
- Finance Head: finance.head@glrsdac.com (TREASURER role)
- Ushers Head: ushers.head@glrsdac.com (CLERK role)
- Music Head: music.head@glrsdac.com (CLERK role)

## Access Control Implementation

### RLS (Row-Level Security) Policies

**Authentication Required**
- All tables have RLS enabled
- Anonymous users cannot access any data
- Authenticated users see data based on role

**Role-Based Access**
- `has_role()` function evaluates user permissions
- Financial tables restricted to TREASURER role
- Collection tables restricted to CLERK role
- All tables readable by ADMIN and VIEWER roles (VIEWER read-only)

**Policy Examples**
```sql
-- Admins full access
CREATE POLICY "admin_access" ON profiles
  FOR ALL USING (has_role('ADMIN'));

-- Treasurers can read/write financial data
CREATE POLICY "treasurer_write" ON funds
  FOR ALL USING (has_role('TREASURER'));

-- Viewers read-only
CREATE POLICY "viewer_read" ON funds
  FOR SELECT USING (has_role('VIEWER'));
```

## User Linking to Members

Three member records have been linked to user accounts:
- Mary Williams → mary.williams@glrsdac.com
- Peter Brown → peter.brown@glrsdac.com
- Grace Davis → grace.davis@glrsdac.com

These members can now:
- Log in with their credentials
- View contribution history
- Access department information
- See personal financial records (if member-scoped queries implemented)

## Adding New Users

### Method 1: Using Complete User Management Script (Recommended)
```bash
node scripts/complete-user-management.mjs
```
This script automatically:
- Creates users via Supabase Admin API
- Creates user profiles
- Assigns roles
- Links to members if applicable

### Method 2: Manual Creation via API
```javascript
const { data: user, error } = await supabase.auth.admin.createUser({
  email: 'newuser@glrsdac.com',
  password: 'TempPassword@123',
  email_confirm: true,
});

// Link user to member (optional)
await supabase.from('members')
  .update({ user_id: user.user.id })
  .eq('id', memberId);

// Assign role
await supabase.from('user_roles')
  .insert({ user_id: user.user.id, role: 'VIEWER' });
```

### Method 3: Via Supabase Dashboard
1. Go to Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Assign role in user_roles table

## Testing User Access

### Verify Login
```bash
node scripts/verify-all-credentials.mjs
```

### Test Role-Based Access
```bash
# Login as different roles and test permissions
node scripts/test-role-access.mjs (to be created)
```

## Important Notes

⚠️ **Critical: Use Admin API for User Creation**
- Direct SQL `INSERT` into `auth.users` bypasses Supabase validation
- Always use `supabase.auth.admin.createUser()` for programmatic creation
- Dashboard creation also works correctly

✅ **Automatic Profile Creation**
- Profiles are auto-created via trigger `handle_new_user()`
- Do NOT manually insert into profiles table

✅ **Password Requirements**
- Minimum 6 characters
- No format restrictions enforced by Supabase
- Recommend strong passwords for production

📝 **Role Assignment After Creation**
- Roles must be assigned AFTER user creation in user_roles table
- User must exist in auth.users first

## Next Steps

1. **Test Frontend Access**
   - Log in as different roles in the React app
   - Verify UI reflects appropriate permissions
   - Test financial data access restrictions

2. **Configure Email Verification** (Optional)
   - Set email_confirm: false if verification emails desired
   - Configure email templates in Supabase Dashboard

3. **Add More Members**
   - Create Education and Outreach department heads
   - Link additional members to accounts

4. **Implement Member-Specific Views**
   - Create queries that show only relevant data per member
   - Implement contribution history views

5. **Set Up Password Reset**
   - Configure password reset email template
   - Test forgot password flow in app

## Scripts Available

| Script | Purpose |
|--------|---------|
| `complete-user-management.mjs` | Create all users in bulk |
| `verify-all-credentials.mjs` | Test all user credentials |
| `create-users-admin-api.mjs` | Create individual users via API |
| `cleanup-users.mjs` | Remove test users (if needed) |
| `test-auth-flow.mjs` | Test authentication flow |
| `test-credentials.mjs` | Basic credential verification |

## Database Trigger: handle_new_user()

Automatically creates profile when new user is created:
```sql
CREATE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.user_metadata->>'full_name', NEW.email));
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;
```

## Role Hierarchy

```
ADMIN
  ├─ Full system access
  └─ Can create/modify all data

TREASURER
  ├─ Financial operations
  ├─ Fund management
  └─ Payment processing

CLERK
  ├─ Collection management
  ├─ Session records
  └─ Basic reporting

VIEWER
  ├─ Read-only access
  └─ View all data (no modifications)
```

---

**Status**: ✅ Complete and verified
**Date**: 2026-02-24
**Users Verified**: 11/11
**Roles Assigned**: ADMIN(1), TREASURER(2), CLERK(3), VIEWER(5)
