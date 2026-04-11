## GLRSDAC Church Management Portal - Collaborator Guide

This guide is meant for a new collaborator joining the project. It explains what is in the repo, how the app is wired together, and how to run/test/deploy it locally.

---

## 1) What This Project Does (High Level)

- Provides a church “control panel” for multiple user types (Admin / Treasurer / Clerk / Viewer / Members).
- Uses **Supabase** as the database + auth provider.
- Uses **Supabase Edge Functions** for protected workflows (and for public signup validation).
- Uses **Row Level Security (RLS) + RBAC** so users only see what they are allowed to see.
- Implements a **member dashboard** that shows an at-a-glance overview immediately after login.

---

## 2) Where to Read Documentation (Start Here)

The repo already contains substantial RBAC and deployment documentation:

- `README_RBAC.md` - Executive RBAC overview + quick start
- `RBAC_QUICK_REFERENCE.md` - role/permission lookup
- `RBAC_IMPLEMENTATION_PLAN.md` - architecture and design rationale
- `RBAC_ARCHITECTURE.md` - diagrams + data flow
- `RBAC_IMPLEMENTATION_GUIDE.md` - step-by-step developer guide
- `EDGE_FUNCTIONS_REFERENCE.md` - basic edge function references (may be incomplete vs current edge function folder)

If you are new, start with `README_RBAC.md`, then skim the quick reference, then the architecture.

---

## 3) Tech Stack

- Frontend: **Vite + React 18 + TypeScript**
- Styling: **Tailwind CSS + shadcn/ui**
- Data layer:
  - Supabase JS client in `src/integrations/supabase/client.ts`
  - RLS policies in the Supabase schema/migrations
  - Edge functions under `supabase/functions/*`

---

## 4) Repo Layout (Key Directories)

### Frontend App

- `src/App.tsx`
  - Top-level router
  - Route guards (Governance/Treasury)
  - Portals route structure (`/portal/member`, `/portal/treasury`, `/portal/clerk`, `/portal/governance`, `/portal/department`)
- `src/components/AppLayout.tsx`
  - App shell: sidebar + top bar + page content outlet
- `src/pages/*`
  - “Pages” for each workspace/feature
- `src/pages/Dashboard.tsx`
  - The member landing/dashboard after login (at `/` and also used by the member portal redirect)
- `src/hooks/use-auth.ts`
  - Supabase session state + auth lifecycle
- `src/hooks/use-realtime-refresh.ts`
  - Re-fetch scheduling when certain tables change (polling-first with optional websocket)

### Supabase Edge Functions

- `supabase/functions/<function-name>/index.ts`
  - Each folder is an edge function entrypoint
  - These are used by the frontend via `fetch(...)` or via client calls when relevant.

### Database Schema / Migrations

- `supabase/migrations/*`
  - Contains the SQL schema + RLS policies and related DB functions/triggers.

---

## 5) How Login and the Member Dashboard Work

### 5.1 Auth Flow

1. User opens `/auth` (`src/pages/Auth.tsx`).
2. `handleLogin` uses `supabase.auth.signInWithPassword(...)`.
3. After login, the router in `src/App.tsx` loads `AppLayout` and the protected routes.
4. Session state is maintained by `src/hooks/use-auth.ts` (listens for auth state changes and loads the session).

### 5.2 Where “Today’s Overview” Data Comes From

The member dashboard logic currently lives in:

- `src/pages/Dashboard.tsx`

On mount (and when auth user id changes):

- `fetchData` runs (via `useEffect` + dependency on `user?.id`)
- It fetches multiple data sources in one `Promise.all`:
  - Member profile row (based on the logged-in user id)
  - User roles (RBAC role names)
  - Latest announcements
  - Upcoming events
  - Counts used for quick stats
  - Recent contributions (most recent amounts and funds)
  - Birthdays within the next 7 days

The dashboard then renders:
- Welcome header (name + greeting + date + role chips)
- Quick stats cards
- Main grid:
  - Announcements card
  - Recent giving card
  - Upcoming events card
  - Birthdays card
  - Quick links card (member links + admin links if elevated access)

### 5.3 Realtime / Auto Refresh

- `src/pages/Dashboard.tsx` uses `useRealtimeRefresh(...)`.
- It schedules refresh of the dashboard data when certain tables change (currently contributions + announcements).

---

## 6) How Permissions and Route Guards Work

### 6.1 App-level Guards

Route guarding is handled in `src/App.tsx`:

- `fetchPermissionKeysForUser(userId)`
  - Queries `user_roles` and role names
  - Maps role names to a set of permission keys
- `GovernanceRouteGuard` and `TreasuryRouteGuard`
  - Check if the user has the permission keys required for each portal

### 6.2 Member Portal vs Manager Mode

The sidebar and some portal routing behaviors can switch between “member mode” and “manager mode”.

This is implemented by `ManagerViewModeGuard` in `src/App.tsx`, which reads `localStorage` and redirects accordingly.

---

## 7) Edge Functions: What to Know

The repo contains several edge function implementations. The key concepts:

- `request-signup`
  - Public endpoint used by the signup page
  - Validates that the signup name exists in the `members` list
  - Creates an invite token + sends an email via `send-email`
- `admin-manage-roles`
  - Protected role management API for admins
  - Supports listing/creating/updating roles, assigning/revoking roles, and permission assignment

Other functions exist in the folder structure as well (invite flows, password update flows, sync helpers, etc.). If your collaborator needs to add functionality:

1. Look at `supabase/functions/<name>/index.ts`
2. Check which auth headers or request body fields it expects
3. Update the frontend call sites in `src/pages/*` accordingly

---

## 8) Local Development (Run + Test)

Common frontend commands (from `package.json`):

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`

---

## 9) Supabase Setup / Scripts

This project includes Node scripts to manage and verify the database schema.

See:
- `scripts/README.md`

Common commands:
- `npm run db:setup`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:export`
- `npm run db:query -- <table>`
- `npm run db:clear -- <table>`

---

## 10) Known Gaps / Things To Verify

This repo is not “only RBAC”. It also includes treasury, membership, and portal features.

However, the member dashboard currently focuses on:
- announcements
- upcoming events
- recent giving
- birthdays
- quick links

If you want to extend it to include (for example) prayer requests, meetings, department-only activity blocks, and emergency announcements:
- add the required UI blocks in `src/pages/Dashboard.tsx`
- add new backend queries (or new DB views) as needed
- ensure the new data is covered by appropriate RLS policies

---

## 11) Suggested “Where Do I Start?” Checklist

1. Read `README_RBAC.md` and `RBAC_QUICK_REFERENCE.md`
2. Open `src/App.tsx` to understand route structure
3. Open `src/pages/Dashboard.tsx` to understand member dashboard data fetching
4. Open `src/pages/Auth.tsx` to understand signup/login flow
5. Open one edge function folder (e.g. `supabase/functions/request-signup/index.ts`) to understand patterns

