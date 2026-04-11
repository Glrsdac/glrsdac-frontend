# Vercel Environment Variables Setup Guide

## Error: "supabaseKey is required"

This error means Supabase environment variables are not configured in Vercel.

## Required Environment Variables

You need to set these in Vercel Dashboard:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Or alternatively:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
```

## How to Find Your Supabase Keys

1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** (public) → `VITE_SUPABASE_ANON_KEY`

## How to Set in Vercel

### Option 1: Vercel Dashboard (Easiest)
1. Go to **Vercel Dashboard**
2. Select your project (glrsdac)
3. Go to **Settings** → **Environment Variables**
4. Add two variables:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://YOUR_PROJECT_ID.supabase.co`
   
5. Add second variable:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `YOUR_ANON_KEY_HERE`

6. Click **Save**
7. **Redeploy** (Settings → Deployments → Redeploy)

### Option 2: Vercel CLI
```bash
vercel env add VITE_SUPABASE_URL
# Paste: https://YOUR_PROJECT_ID.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: YOUR_ANON_KEY

vercel deploy --prod
```

### Option 3: vercel.json (For committed config)
Create/update `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

Then set secrets in Vercel:
```bash
vercel secrets add supabase_url https://YOUR_PROJECT_ID.supabase.co
vercel secrets add supabase_anon_key YOUR_ANON_KEY
```

## Step-by-Step: Vercel Dashboard Method (EASIEST)

1. Go to https://vercel.com/dashboard
2. Click on **glrsdac** project
3. Click **Settings** tab
4. Click **Environment Variables** in left menu
5. Add variable:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://upqwgwemuaqhnxskxbfr.supabase.co
   Environment: Production, Preview, Development
   ```
   Click **Save**

6. Add second variable:
   ```
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
   Environment: Production, Preview, Development
   ```
   Click **Save**

7. Go to **Deployments** tab
8. Find latest deployment
9. Click on it and select **Redeploy**
10. Wait for build to complete

## After Setting Variables

- Vercel will automatically rebuild
- New deployment should load Supabase successfully
- Refresh https://glrsdac.vercel.app
- Error should be gone

## Testing

After deploying:
1. Go to https://glrsdac.vercel.app
2. Open browser console (F12)
3. Should see no "supabaseKey is required" error
4. Try logging in

## Common Issues

### Variables show in Vercel but app still errors
- Vercel may need a full redeploy (not auto-deploy)
- Go to Deployments → click latest → Redeploy

### Wrong key value
- Make sure you copied entire key (starts with `eyJ...`)
- No extra spaces

### Still failing after redeploy
1. Check Vercel build logs for errors
2. Verify keys are in correct environment (Production)
3. Try clearing browser cache

## Your Supabase Info

Project: glrsdac  
Project ID: upqwgwemuaqhnxskxbfr  
Project URL: https://upqwgwemuaqhnxskxbfr.supabase.co

To get your Anon Key:
1. Supabase Dashboard → glrsdac project
2. Settings → API
3. Copy "Anon (public)" key under "Project API keys"

---

**Next:** Set the 2 environment variables in Vercel → Redeploy → Check https://glrsdac.vercel.app
