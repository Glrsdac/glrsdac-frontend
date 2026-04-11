# Email Links Production Setup Guide

## Current Status
✅ Code already supports environment-based URLs
- Uses `FRONTEND_URL` environment variable
- Falls back to `http://localhost:5173` for development

## Functions Using Dynamic URLs
1. `invite-member` - Invitation signup links
2. `resend-invite` - Resent invitation links
3. `complete-signup` - (No direct URL, just processes invites)
4. `send-email` - (Generic email function)

## Implementation Steps

### Step 1: Set Production URL in Supabase

**For Development/Staging:**
```
FRONTEND_URL = http://localhost:5173
```

**For Production:**
```
FRONTEND_URL = https://your-production-domain.com
```

**How to set in Supabase Dashboard:**
1. Go to: **Supabase Dashboard** → **Project** → **Settings** → **Edge Functions**
2. Click **Secrets**
3. Add New Secret:
   - Name: `FRONTEND_URL`
   - Value: `https://your-production-domain.com` (your actual domain)
4. Click **Save**

### Step 2: Verify Environment Variable Works

After setting, redeploy functions (or they auto-update):

```bash
npx supabase functions deploy invite-member --project-ref YOUR_PROJECT_ID
npx supabase functions deploy resend-invite --project-ref YOUR_PROJECT_ID
```

### Step 3: Test Email Links

1. Send an invite from Members page
2. Check email - link should use your production domain
3. Format should be: `https://your-domain.com/signup?email=...&token=...`

---

## Email Links Used In

### 1. **Invite Member Email**
- **Function:** `invite-member`
- **Link Format:** `{FRONTEND_URL}/signup?email={email}&token={token}`
- **When:** Admin sends invite to member
- **User Action:** Click to create account

### 2. **Resend Invite Email**
- **Function:** `resend-invite`
- **Link Format:** `{FRONTEND_URL}/signup?email={email}&token={token}`
- **When:** Admin resends invite
- **User Action:** Click to create account with new token

### 3. **Password Reset Email**
- **Function:** Supabase built-in `resetPasswordForEmail`
- **Link Format:** `{SUPABASE_AUTH_REDIRECT_URL}/auth?type=reset` (configured in Supabase)
- **When:** User clicks "Forgot Password" on login page
- **User Action:** Click link to reset password
- **Configuration:** Supabase Dashboard → Auth → Email Settings

---

## Email Links Used In

All email links are now using production URLs:

### 1. **Invite Member Email**
- **Function:** `invite-member`
- **Link Format:** `https://glrsdac.vercel.app/signup?email={email}&token={token}`
- **When:** Admin sends invite to member
- **User Action:** Click to create account

### 2. **Resend Invite Email**
- **Function:** `resend-invite`
- **Link Format:** `https://glrsdac.vercel.app/signup?email={email}&token={token}`
- **When:** Admin resends invite
- **User Action:** Click to create account with new token

### 3. **Password Reset Email**
- **Function:** Supabase built-in `resetPasswordForEmail`
- **Link Format:** `https://glrsdac.vercel.app/auth?type=reset`
- **When:** User clicks "Forgot Password" on login page
- **User Action:** Click link to reset password

---

## Supabase Auth Email Configuration (Password Reset)

Supabase Auth handles password reset emails with its own template. To configure the redirect URL:

**Steps:**
1. Go to **Supabase Dashboard** → **glrsdac project** → **Authentication** → **Email Settings**
2. In **Email Template** section, find **Password Reset**
3. Update the redirect URL to your Vercel domain if needed
4. Or, the email template may use your project URL automatically

**Note:** The frontend code uses `window.location.origin` which automatically adapts to whatever domain the app is served from:
```typescript
redirectTo: `${window.location.origin}/auth?type=reset`
```

So when accessed from Vercel, it becomes: `https://glrsdac.vercel.app/auth?type=reset`

---

## Verify All Email Links Work

After setting `FRONTEND_URL` in Supabase and redeploying:

### Test Invite Links
1. Go to Members page
2. Send invite to test member
3. Check email
4. Link should be: `https://glrsdac.vercel.app/signup?email=...&token=...`
5. Click link - should load signup page on Vercel
6. Complete signup

### Test Password Reset Link
1. Go to Login page
2. Click "Forgot your password?"
3. Enter email
4. Click "Send Reset Link"
5. Check email
6. Link should be: `https://glrsdac.vercel.app/auth?type=reset`
7. Click link - should load password reset form
8. Set new password
9. Should be able to login

---

## Configuration Summary

### Edge Functions (Invites)
```
FRONTEND_URL = https://glrsdac.vercel.app
```
Set in: **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**

### Supabase Auth (Password Reset)
Configure in: **Supabase Dashboard** → **Authentication** → **Email Settings**
- Frontend automatically uses `window.location.origin`
- Works from any domain (localhost, Vercel, custom domain)

---

## Environment-Specific URLs

### Development (localhost)
- Signup links: `http://localhost:5173/signup?...`
- Password reset: `http://localhost:5173/auth?type=reset`
- **FRONTEND_URL:** Not set (uses default fallback)

### Production (Vercel)
- Signup links: `https://glrsdac.vercel.app/signup?...`
- Password reset: `https://glrsdac.vercel.app/auth?type=reset`
- **FRONTEND_URL:** `https://glrsdac.vercel.app` (in Supabase Secrets)

---

## Environment-Specific Setup

### Development
```
FRONTEND_URL = http://localhost:5173
```

### Staging
```
FRONTEND_URL = https://staging-glrsdac.example.com
```

### Production
```
FRONTEND_URL = https://glrsdac.example.com
```

Each can have different secrets in Supabase per project.

---

## URL Locations in Code

All URLs are centralized in edge functions:

1. **invite-member/index.ts** (Line 144)
   ```typescript
   const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
   ```

2. **resend-invite/index.ts** (Line 135)
   ```typescript
   const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
   ```

To change default, update the fallback URL in both files.

---

## Testing Checklist

- [ ] Set `FRONTEND_URL` in Supabase secrets
- [ ] Deploy functions (or wait for auto-update)
- [ ] Send test invite from Members page
- [ ] Check email for correct domain in link
- [ ] Click link - should load signup page on production domain
- [ ] Complete signup - should work
- [ ] Test password reset "Forgot Password" link

---

## Troubleshooting

### Links still show localhost
1. Check if `FRONTEND_URL` is actually set in Supabase
2. Verify function was redeployed
3. Wait 1-2 minutes for secret to propagate
4. Clear browser cache
5. Send new test invite

### Links show wrong domain
1. Verify `FRONTEND_URL` value is correct in Supabase secrets
2. Check for typos (https:// not http://)
3. Ensure no trailing slash

### Email not received
1. Check Supabase Logs for email function errors
2. Verify SendGrid settings (if using email edge function)
3. Check spam folder

---

## Security Notes

- ✅ URLs are in environment secrets (not hardcoded)
- ✅ HTTPS required for production
- ✅ Tokens are still valid only once per invite
- ✅ Tokens expire (based on member.invite_status)
- ✅ Email validation ensures correct recipient

---

## Next Steps

1. Get your production domain
2. Set `FRONTEND_URL` in Supabase Secrets
3. Deploy/redeploy functions
4. Test email links
5. Monitor for any issues

**Current State:** Ready for production, just needs domain URL configured.
