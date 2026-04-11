# Invite Flow Refactoring - Complete Signup Pattern

## Summary

Changed the user account creation flow to follow proper registration patterns:
- **Before**: Invite sent → User account created immediately → User invited
- **After**: Invite sent (token stored) → User clicks link → User creates account with password

## Database Changes

Added fields to `members` table:
- `invite_token` (VARCHAR 255, UNIQUE) - Token for signup URL validity
- `invite_sent_at` (TIMESTAMPTZ) - When invite was sent
- `invite_accepted_at` (TIMESTAMPTZ) - When user activated account
- `invite_status` (VARCHAR 50, DEFAULT 'not_invited') - Values: not_invited, invited, activated

## Edge Functions

### Updated: `invite-member`
**Purpose**: Send invitation email (NO user account created)
- Generates secure invite token
- Stores token in member record
- Updates `invite_status` to "invited"
- Returns signup URL with token
- **Does NOT**: Create user account

**Request**:
```json
{
  "member_id": 123,
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Invitation sent to user@example.com",
  "invite_token": "base64_encoded_token",
  "signup_url": "http://localhost:5173/signup?email=...&token=..."
}
```

### New: `complete-signup`
**Purpose**: Create user account when user sets password
- Validates invite token
- Creates user account with provided password
- Links user to member
- Updates `invite_status` to "activated"
- Assigns VIEWER role

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "invite_token": "base64_encoded_token"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": "uuid_of_new_user",
  "email": "user@example.com"
}
```

## Frontend Changes

### Members Page
No changes needed - existing logic already handles the flow:
- Checks `user_id` to determine "linked" vs "not_invited"
- Shows invite button for not_invited members
- Calls `handleInvite()` → calls `invite-member` function

### New: Signup Page Component
(To be created)
- URL params: `?email=X&token=Y`
- Form fields: Email (read-only), Password, Confirm Password
- Calls `complete-signup` function
- Redirects to login on success

## User Flow

1. **Admin/Clerk**: Opens Members page, clicks invite icon on member
2. **Frontend**: Calls `/functions/v1/invite-member`
3. **Backend**: 
   - Validates permissions (CLERK/TREASURER/ADMIN)
   - Generates invite token
   - Stores in `members` table
   - Returns signup URL
4. **Email**: Sent with signup link (TODO: implement email sending)
5. **User**: Clicks link in email → goes to `/signup?email=X&token=Y`
6. **Frontend**: Shows signup form with pre-filled email
7. **User**: Enters password and submits
8. **Frontend**: Calls `/functions/v1/complete-signup`
9. **Backend**:
   - Validates token matches email
   - Creates auth user
   - Links to member
   - Assigns role
10. **Frontend**: Redirects to login
11. **User**: Logs in with email + password

## Status Tracking

Member `invite_status` field values:

| Value | Meaning | Has User ID | Has Token | Next Step |
|-------|---------|-------------|-----------|-----------|
| not_invited | Never invited | No | No | Send invite |
| invited | Invite sent, awaiting response | No | Yes | User clicks link |
| activated | User created account | Yes | Cleared | User can login |

## Benefits

✅ **Better UX**: User chooses their own password
✅ **Data Integrity**: User accounts only created when ready
✅ **Audit Trail**: Can track invitation timeline
✅ **Security**: Token-based validation, one-time use
✅ **Recovery**: Can resend invite if token expires
✅ **Standard Pattern**: Matches industry-standard registration flows

## Deployment Status

- ✅ `invite-member` - Deployed, generates token, no user creation
- ✅ `complete-signup` - Deployed, creates user with password
- ✅ Migration - Pending (add fields to members table)
- ⏳ Frontend - Signup page component needs creation
- ⏳ Email - Email sending implementation needed

## Testing

Run test script:
```bash
node scripts/test-new-invite-flow.mjs
```

Validates:
1. Invite doesn't create user account
2. Member shows user_id = NULL after invite
3. Signup creates account
4. Member shows user_id after signup
5. User gets VIEWER role
6. Token cleared after use
