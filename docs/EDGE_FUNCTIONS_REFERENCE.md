# Edge Functions Reference Guide

## Overview

Two edge functions are deployed and operational for user management and member signup validation.

---

## 1. request-signup

### Endpoint
```
POST https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/request-signup
```

### Authentication
- **JWT Required**: No (public endpoint)
- **CORS**: Enabled for all origins

### Request
```json
{
  "email": "john.doe@example.com",
  "full_name": "John Doe"
}
```

### Response (200 OK)
```json
{
  "message": "A signup invitation has been sent to your email...",
  "status": "pending",
  "member_id": 1
}
```

### Possible Responses

| Status | Scenario | Response |
|--------|----------|----------|
| 200 | Valid signup | Returns success with member_id |
| 400 | Missing fields | "Email and full name are required" |
| 403 | Not a member | "Your name was not found in our members list..." |
| 409 | Account exists | "An account with this email already exists..." |

### Use Cases
- Member self-service signup
- Validate membership during signup
- Prevent non-members from registering
- Check for duplicate accounts

### Frontend Example
```typescript
async function requestSignup(email: string, fullName: string) {
  const response = await fetch(
    'https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/request-signup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName }),
    }
  );
  
  const data = await response.json();
  if (response.ok) {
    console.log('Signup pending:', data.member_id);
  }
}
```

---

## 2. admin-list-users

### Endpoint
```
GET https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/admin-list-users
```

### Authentication
- **JWT Required**: Yes (in Authorization header)
- **Role Required**: ADMIN only
- **CORS**: Enabled for all origins

### Request
```bash
curl -X GET https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/admin-list-users \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

### Response (200 OK)
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "admin@glrsdac.com",
      "full_name": "Admin User",
      "roles": ["ADMIN"],
      "created_at": "2026-02-24T10:00:00Z"
    },
    ...
  ],
  "total": 11,
  "requested_by": "admin@glrsdac.com",
  "timestamp": "2026-02-24T11:00:00Z"
}
```

### Possible Responses

| Status | Scenario | Response |
|--------|----------|----------|
| 200 | Admin authorized | Returns list of all users |
| 401 | No authorization | "Missing authorization header" |
| 401 | Invalid token | "Unauthorized" |
| 403 | Non-admin user | "Only admins can list users" |
| 500 | Server error | Error message |

### Use Cases
- Admin dashboard - view all users
- User management interface
- Audit logging
- System monitoring
- User assignment and role management

### Frontend Example
```typescript
async function fetchAllUsers(session: Session) {
  const response = await fetch(
    'https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/admin-list-users',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 403) {
    console.error('Not authorized to list users');
    return null;
  }

  const data = await response.json();
  return data.users; // Array of users with roles
}
```

---

## Common Issues & Solutions

### Issue: CORS Preflight Failed (404)
**Cause**: Function doesn't exist or wasn't deployed
**Solution**: Check function exists in `supabase/functions/` and redeploy with:
```bash
npx supabase functions deploy <function-name> --project-ref upqwgwemuaqhnxskxbfr --no-verify-jwt
```

### Issue: CORS Headers Missing
**Cause**: Function isn't handling OPTIONS method
**Solution**: Ensure function includes:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}
```

### Issue: 401 Unauthorized on admin-list-users
**Cause**: 
- Missing Authorization header
- Invalid or expired JWT
- JWT verification still enabled on function
**Solution**:
- Pass valid JWT in Authorization header
- Redeploy with `--no-verify-jwt` flag
- Check token isn't expired

### Issue: 403 Only admins can list users
**Cause**: Logged-in user doesn't have ADMIN role
**Solution**: Use admin account or assign ADMIN role to user:
```sql
INSERT INTO public.user_roles (user_id, role) 
VALUES ('user-uuid', 'ADMIN');
```

---

## Testing Commands

### Test request-signup
```bash
node scripts/test-edge-function.mjs
node scripts/debug-edge-function.mjs
```

### Test admin-list-users
```bash
node scripts/test-admin-list-users.mjs
```

### Deploy all functions
```bash
npx supabase functions deploy request-signup --project-ref upqwgwemuaqhnxskxbfr --no-verify-jwt
npx supabase functions deploy admin-list-users --project-ref upqwgwemuaqhnxskxbfr --no-verify-jwt
```

### View function logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on function name
4. View recent invocations

---

## Environment Variables (Automatic)

Supabase automatically provides:
- `SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role (bypass RLS)
- `SUPABASE_ANON_KEY` - Anonymous key

No manual configuration needed.

Additional for AI Template Agent:
- `OPENAI_API_KEY` - Required by `ai-template-agent` to generate UI/backend design proposals.

Deploy command example:
```bash
npx supabase functions deploy ai-template-agent --project-ref upqwgwemuaqhnxskxbfr --no-verify-jwt
```

---

## Security Considerations

### request-signup
- ✅ Public endpoint (no auth required)
- ✅ CORS enabled
- ✅ Validates membership
- ✅ Checks duplicates
- ✅ Uses service role safely (read-only)

### admin-list-users
- ✅ Requires JWT authentication
- ✅ Checks ADMIN role
- ✅ Logs admin requests
- ✅ CORS enabled
- ✅ Returns user list only to admins

---

## Deployment Status

| Function | Status | CORS | Auth | JWT Verify |
|----------|--------|------|------|-----------|
| request-signup | ✅ Deployed | ✅ Enabled | ❌ None | ❌ Disabled |
| admin-list-users | ✅ Deployed | ✅ Enabled | ✅ Required | ❌ Disabled |

---

## Quick Reference URLs

**request-signup**:
```
https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/request-signup
```

**admin-list-users**:
```
https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/admin-list-users
```

---

## Next Steps

1. **Test in frontend** - Integrate both functions into React components
2. **Add error handling** - Show user-friendly error messages
3. **Add loading states** - Show loading indicators during requests
4. **Implement email verification** - Send verification emails for request-signup
5. **Add rate limiting** - Prevent abuse of public endpoints
6. **Monitor logs** - Watch edge function logs in production

---

**Last Updated**: February 24, 2026
**Functions Deployed**: 2/2
**Tests Passing**: All ✅
