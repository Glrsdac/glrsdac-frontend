# Invite-Member Edge Case Fix - Deployment Summary

## Issue Fixed
**Problem**: When a user account already exists in auth.users but the member record has a NULL user_id (unlinked), the invite-member function would fail with:
```
Invite Failed: A user with this email address has already been registered
```

**Root Cause**: The function attempted to create a new user account without checking if one already existed.

**Scenario**: 
- Previous failed invite attempt or manual user creation leaves an orphaned account
- Member.user_id = NULL (shows as "not_invited" in UI)
- User exists in auth.users with same email
- Subsequent invite attempts fail

## Solution Implemented

Updated `invite-member` edge function to:

1. **Check for existing user** before attempting creation:
   ```typescript
   const { data: existingUsers } = await supabase.auth.admin.listUsers();
   const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
   ```

2. **Link existing user** if found:
   ```typescript
   if (existingUser) {
     newUserId = existingUser.id;  // Use existing user
     console.log(`User already exists, linking to member`);
   }
   ```

3. **Create new user only if needed**:
   ```typescript
   else {
     // Create user only if no existing account found
     const { data: newUserData, error: createUserError } = await supabase.auth.admin.createUser({...})
   }
   ```

4. **Link member to user** (same for both new and existing):
   ```typescript
   const { error: linkError } = await supabase
     .from("members")
     .update({ user_id: newUserId })
     .eq("id", member_id);
   ```

## Benefits

✅ **Data Healing**: Fixes orphaned user accounts automatically  
✅ **Better Error Handling**: Gracefully handles existing unlinked users  
✅ **Idempotent**: Calling invite on already-linked members still works  
✅ **User Experience**: No more confusing "already registered" errors  

## Deployment Status

- **Function**: invite-member
- **Status**: ✅ Deployed (108.8kB)
- **Project**: upqwgwemuaqhnxskxbfr
- **Timestamp**: Successfully deployed

## Testing Recommendations

After deployment, test the following scenarios:

1. **Normal invite** (no existing user):
   - Create member with email
   - Call invite-member
   - Result: ✅ New user created, linked, invited

2. **Existing unlinked user** (the fixed case):
   - Manually create user in auth.users
   - Create member with same email but NULL user_id
   - Call invite-member
   - Result: ✅ User linked, invited (no error)

3. **Already linked member**:
   - Member with valid user_id
   - Call invite-member
   - Result: 409 "already has user account" (correct behavior)

## Files Modified

- `/supabase/functions/invite-member/index.ts` - Updated user creation logic (lines 98-145)

## Related Functions

- `resend-invite`: Handles resending to already-linked members (unchanged)
- `request-signup`: Public endpoint for member signup (unchanged)
- `admin-list-users`: Lists all users (unchanged)

## Next Steps

1. Test the edge case in UI
2. Monitor logs for "User already exists, linking to member" messages
3. Run full member invitation workflow tests
4. If issues occur, check error logs in Supabase dashboard
