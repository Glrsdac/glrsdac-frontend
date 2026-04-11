# Pages Directory Audit Report
**Generated:** March 26, 2026  
**Scope:** `src/pages/` directory - All 40+ page components  
**Purpose:** Identify incomplete features, placeholder content, and stubbed functions

---

## CRITICAL ISSUES (Feature Unavailability)

### 1. **MyDues.tsx** - Department Dues Feature
- **Status:** Feature Unavailable with Graceful Degradation
- **Lines:** 54, 97-98, 272-283
- **Issue:** 
  - Board state: `featureUnavailable` (line 54)
  - Catches error from `department_dues` table and shows deprecation message (lines 97-98)
  - Renders warning card: "Department Dues Feature Unavailable" - being updated
- **What's Missing:** Database table migration or schema not yet applied
- **Impact:** Users cannot view/track department dues
- **Recommended Fix:**
  - Complete database schema for `department_dues` table
  - Implement payment recording API
  - Test with actual member data
  - Remove graceful degradation once ready

---

### 2. **MemberSabbathLessons.tsx** - Sabbath School Lessons
- **Status:** Feature Unavailable with Graceful Degradation
- **Lines:** 54, 76, 104, 203-204, 219, 246, 359-368
- **Issues:**
  - Board state: `featureUnavailable` (line 54)
  - Three fallback errors caught silently:
    - `sabbath_school_material_comments` errors (line 76, message not shown)
    - `sabbath_school_lessons` availability check (line 203)
    - `sabbath_school_assignments` availability check (line 219)
  - Uses `console.warn()` instead of structured logging
  - Renders degradation UI with amber warning card
- **What's Missing:**
  - Sabbath school material tables schema
  - Comments system implementation
  - Assignment tracking system
- **Recommended Fix:**
  - Implement full Sabbath school schema
  - Create edge functions for lesson delivery
  - Add proper error handling with user feedback
  - Remove console.warn() spam and use structured logging

---

## CATEGORY 1: Pages with Placeholder UI / Coming Soon Messages

### 3. **RolesPermissions.tsx** - Read-Only Static Content
- **Status:** Incomplete - Hardcoded Roles Display
- **Lines:** 1-40 (entire file)
- **Issue:**
  - Hardcoded `ROLES` constant with static descriptions (lines 12-15)
  - No data binding to actual database roles
  - No permissions matrix or detailed access mapping
  - Read-only display only
- **What's Missing:**
  - Dynamic role fetching from `roles` table
  - Permissions matrix visualization
  - Role hierarchy display
  - Permission scope breakdown (read/write/admin)
- **Recommended Fix:**
  - Query actual roles from database
  - Build permissions matrix component
  - Show role hierarchy and inheritance
  - Add role assignment counts

---

### 4. **DepartmentSharePoint.tsx** - Basic CRUD Only
- **Status:** Incomplete - Feature Skeleton
- **Lines:** 1-150
- **Issues:**
  - Simple CRUD operations present
  - No collaborative editing features
  - No versioning or audit trail
  - No sharing/permission controls
  - Dialog-based UI is minimal
- **What's Missing:**
  - Full-featured document management
  - Version history tracking
  - Access control & sharing
  - Search/filtering improvements
  - Bulk operations
- **Recommended Fix:**
  - Implement version control
  - Add sharing/permissions UI
  - Create document preview/editor
  - Build search and filtering

---

## CATEGORY 2: Pages with Incomplete Function Implementations

### 5. **Payments.tsx** - Partial Implementation
- **Status:** Stub Transaction Recorder
- **Lines:** 1-200+
- **Issues:**
  - Two separate payment types: `payments` and `fund_returns` tracked independently
  - No reconciliation logic
  - No payment method validation beyond enum
  - No transaction matching or aging reports
  - Fund return recipient is dropdown with hardcoded "DISTRICT" default
- **What's Missing:**
  - Payment reconciliation workflow
  - Receipt matching system
  - Transaction aging/variance analysis
  - Multi-currency handling
  - Audit trail for payment reversals
- **Recommended Fix:**
  - Implement reconciliation engine
  - Add receipt attachment/verification
  - Build payment aging report
  - Create variance investigation workflow

---

### 6. **ClerkPortal.tsx** - Mixed Draft/Published States
- **Status:** Partially Implemented Communications
- **Lines:** 1014-1072
- **Issues:**
  - Announcements can be Draft or Published (lines 1014-1023)
  - Newsletters have is_published flag (line 1068)
  - But draft save logic unclear - unclear if drafts auto-save or require manual publish
  - No workflow for review/approval before publishing
  - UI shows draft state but no draft management features
- **What's Missing:**
  - Draft auto-save functionality
  - Draft recovery/restoration
  - Approval workflow for sensitive announcements
  - Draft cleanup/archival
  - Pre-publish validation rules
- **Recommended Fix:**
  - Implement auto-save for drafts
  - Add draft management interface
  - Create approval workflow
  - Build pre-publish checklist

---

### 7. **DepartmentPortal.tsx** - Admin-Only Member Addition
- **Status:** Incomplete - No Self-Service
- **Lines:** 1-200+
- **Issues:**
  - Member addition is dialog-based and basic
  - No bulk import
  - No role-based access to add members (admin only)
  - Department managers cannot self-onboard members
  - No invitation workflow
- **What's Missing:**
  - Bulk member import from CSV
  - Department manager access control
  - Member invitation workflow
  - Auto-population from church directory
  - Onboarding checklist
- **Recommended Fix:**
  - Add bulk import feature
  - Create role-based access rules
  - Implement invitation workflow
  - Build onboarding templates

---

### 8. **SabbathSessions.tsx** - Session Management Partial
- **Status:** Incomplete - Missing Closure Logic
- **Lines:** 1-250+
- **Issues:**
  - Session opening is basic
  - Session closing has `closing` state but unclear closure validation
  - No validation that all contributions are recorded before closing
  - No reconciliation required before closing
  - No session summary/approval workflow
- **What's Missing:**
  - Pre-close validation rules
  - Reconciliation requirement
  - Session summary generation
  - Approval workflow before archive
  - Reversal/reopening logic
- **Recommended Fix:**
  - Implement pre-close validation checklist
  - Add reconciliation requirement
  - Create session summary page
  - Build approval workflow

---

## CATEGORY 3: Pages with Hardcoded Fallback / Mock Data

### 9. **Dashboard.tsx** - Partially Reactive
- **Status:** Real-time Refresh for Some Data
- **Lines:** 47-60
- **Issues:**
  - Uses hardcoded greeting logic (lines ~43-46)
  - Stats are fetched but some defaults are hardcoded
  - No caching strategy - refetches on every tab switch
  - Birthday calculation may not handle leap years correctly
- **What's Missing:**
  - Caching/memoization of expensive queries
  - Configurable greeting messages
  - Birthday reminder system
- **Recommended Fix:**
  - Implement query caching
  - Add birthday notifications
  - Optimize data fetching

---

### 10. **Contributions.tsx** - Fund Split Logic with Fallbacks
- **Status:** Partial Implementation
- **Lines:** 16-60
- **Issues:**
  - `resolveFundSplitPercentages()` has fallback logic for missing percentages (lines 23-60)
  - Hardcoded special handling for "Dayborn" funds (line 18)
  - Defaults to 100% district if values don't sum to 100 (line 45)
  - No validation that splits actually equal 100%
- **What's Missing:**
  - Validation of fund configuration completeness
  - Warnings when funds have unusual split patterns
  - Historical split tracking (splits change over time)
- **Recommended Fix:**
  - Add fund validation on edit
  - Implement split history tracking
  - Create validation reports

---

### 11. **MemberUpdates.tsx** - Fetch Fallback Pattern
- **Status:** Partial Implementation
- **Lines:** 180-230
- **Issues:**
  - Multiple fallback queries for optional tables
  - Uses `map(... ?? [])` pattern for missing relationships
  - No clear indication of which data is optional vs required
  - Silent failures to load events if table is missing
- **What's Missing:**
  - Clear feature availability checks
  - Structured fallback handling
  - User-facing warnings about missing data
- **Recommended Fix:**
  - Document which features are optional
  - Show feature availability status
  - Create graceful degradation messages

---

## CATEGORY 4: Pages Missing Error Handling or Validation

### 12. **ClerkPortal.tsx** - Missing MemberRow Validation
- **Status:** Incomplete Validation
- **Lines:** 1-250
- **Issues:**
  - Assumes `members`, `member_no`, and other fields exist without null checks
  - No validation before displaying/editing member records
  - Transfer requests UI present but workflow validation unclear
  - No validation of transfer request before approval
- **What's Missing:**
  - Null/undefined safety checks for displayed fields
  - Transfer request validation rules
  - Member record completeness check before edit
- **Recommended Fix:**
  - Add runtime validation for member fields
  - Implement transfer validation rules
  - Create pre-edit completeness warnings

---

### 13. **Users.tsx** - Complex Error Recovery
- **Status:** Incomplete Error Handling
- **Lines:** 50-120
- **Issues:**
  - Multiple complex fallback flows for auth refresh (lines 110-130)
  - Error tracking with refs (`authErrorShownRef`, `refreshRetryRef`)
  - Logic for refresh retry but retry strategy unclear
  - Edge case: what if refresh also fails?
- **What's Missing:**
  - Clear error user communication
  - Comprehensive retry strategy
  - Session timeout handling
  - Token refresh logging
- **Recommended Fix:**
  - Document all error paths
  - Implement comprehensive logging
  - Add session timeout UI
  - Create error recovery guide

---

### 14. **Imprest.tsx** - Missing Validation
- **Status:** Incomplete Validation
- **Lines:** 150-200
- **Issues:**
  - Expense form has no validation that amount matches receipt
  - No validation that total expenses don't exceed imprest issued
  - Retirement logic not shown - unclear how imprest is closed
  - Dialog state `retireDialog` created but retirement logic incomplete
- **What's Missing:**
  - Expense vs. amount variance check
  - Imprest utilization validation
  - Retirement approval workflow
  - Receipt scanning/matching
- **Recommended Fix:**
  - Implement amount validation
  - Add utilization checks
  - Build retirement workflow
  - Create receipt management

---

### 15. **Expenses.tsx** - Complex Validation Missing
- **Status:** Incomplete Edge Cases
- **Lines:** 1-150
- **Issues:**
  - Payment method selection (imprest vs. cheque) is dynamic but validation unclear
  - No validation that department has access to selected fund
  - No check that selected imprest is available for that department
  - Refine logic missing - what if department fund disappears mid-edit?
- **What's Missing:**
  - Department-fund access matrix validation
  - Imprest availability check
  - Fund-department relationship validation
  - Real-time availability updates
- **Recommended Fix:**
  - Implement access matrix validation
  - Add availability checks
  - Build real-time permission updates
  - Create audit trail for access denials

---

### 16. **BankAccounts.tsx** - Missing Balance Validation
- **Status:** Incomplete Validation
- **Lines:** 1-150
- **Issues:**
  - Balance calculated from `bank_transactions` sum
  - No validation of transaction integrity
  - No reconciliation with actual bank statements
  - Allows account deletion even if balance is non-zero
- **What's Missing:**
  - Balance reconciliation workflow
  - Transaction integrity checks
  - Bank statement import
  - Account deletion with remaining balance warning
- **Recommended Fix:**
  - Implement reconciliation feature
  - Add transaction validation
  - Build bank statement import
  - Add deletion safeguards

---

### 17. **Cheques.tsx** - Missing Status Validation
- **Status:** Incomplete Validation
- **Lines:** 1-200
- **Issues:**
  - Cheque status can be ISSUED → PRESENTED → CLEARED → BOUNCED
  - No validation that cheques can only move forward in workflow
  - No validation that bounced cheques require reversal/reissuance
  - No check for duplicate cheque numbers before issue
- **What's Missing:**
  - Status workflow validation
  - Bounced cheque handling workflow
  - Duplicate cheque detection
  - Cheque cancellation process
- **Recommended Fix:**
  - Implement state machine for cheque status
  - Add bounce handling workflow
  - Create duplicate detection
  - Build cancellation approval process

---

## CATEGORY 5: Pages with Missing Data Binding or Future.dev Comments

### 18. **MemberClerkView.tsx** - Sparse Implementation
- **Status:** Incomplete - Shell Component
- **Lines:** 1-250
- **Issues:**
  - Transfer requests UI present (lines ~150-200)
  - But most transfer logic appears incomplete
  - Form fields for email/phone edit but submission logic unclear
  - Profile form has `savingProfile` state but save handler may be incomplete
- **What's Missing:**
  - Complete transfer request workflow
  - Validation before transfer approval
  - Profile update confirmation
  - Disciplinary record integration
- **Recommended Fix:**
  - Complete transfer workflow
  - Add validation logic
  - Build profile update confirmation
  - Integrate disciplinary records

---

### 19. **AutomatedReturns.tsx** - Read-Only Display
- **Status:** Display Only - No Write Operations
- **Lines:** 1-150
- **Issues:**
  - Calculates returns using RPC `calculate_monthly_returns`
  - Button UI present for manual return but functionality unclear
  - Treasurer role check present (line 42-47)
  - But no feature to actually record/approve returns
- **What's Missing:**
  - Manual return recording interface
  - Return approval workflow
  - Returns posting to bank
  - Variance investigation
- **Recommended Fix:**
  - Implement return recording
  - Add approval workflow
  - Build bank posting integration
  - Create variance reports

---

### 20. **ChoirPortal.tsx** - Embedded Mode with Incomplete Dialogs
- **Status:** Partial Implementation
- **Lines:** 1-300
- **Issues:**
  - Support for `embedded` mode (line 48) but unclear when/where used
  - Multiple dialog states for rehearsal, song, announcement, members (lines ~70-100)
  - Add member dialog with search but completion state unclear
  - Edit voice part functionality present but unclear if changes persist
- **What's Missing:**
  - Embedded mode documentation
  - Add member completion flow
  - Voice part change validation
  - Rehearsal schedule notifications
- **Recommended Fix:**
  - Document embedded mode usage
  - Complete add member flow
  - Add voice part validation
  - Build notification system

---

### 21. **MemberChoirView.tsx** - Read-Only Portal
- **Status:** Display Only - No Features
- **Lines:** 1-150
- **Issues:**
  - Shows rehearsals, songs, announcements
  - No actual member interaction features
  - Permission check present but only binary (has access or not)
  - No RSVP, attendance tracking, or communication
- **What's Missing:**
  - RSVP functionality for rehearsals
  - Attendance tracking
  - Song library search/sharing
  - Direct messaging to choir director
- **Recommended Fix:**
  - Implement RSVP system
  - Add attendance tracking
  - Build song library search
  - Create messaging feature

---

### 22. **MusicDepartmentPortal.tsx** - Minimal Implementation
- **Status:** Stub with Debug Logging
- **Lines:** 1-150
- **Issues:**
  - Contains explicit debug logging: `console.log("[MusicPortal]"...)` (lines ~150+)
  - Hardcoded 'Music' department lookup (line ~165)
  - Member list shown but no collaboration features
  - Fund contributions shown but no allocation/budgeting
- **What's Missing:**
  - Full collaboration tools
  - Fund allocation/budgeting
  - Member communication
  - Event planning integration
- **Recommended Fix:**
  - Remove debug logging (use structured logging)
  - Add collaboration features
  - Build budgeting tools
  - Create event integration

---

### 23. **Funds.tsx** - Percentage Validation Incomplete
- **Status:** Partial Validation
- **Lines:** 1-200
- **Issues:**
  - Validation that percentages sum to 100% (line ~110)
  - But no validation of realistic ranges (e.g., preventing 0-0-100 for some funds)
  - No tracking of fund changes over time
  - No audit trail of split modifications
- **What's Missing:**
  - Historical fund split tracking
  - Range validation rules
  - Audit trail for changes
  - Change notification/approval workflow
- **Recommended Fix:**
  - Implement fund history tracking
  - Add percent range rules
  - Create change audit log
  - Build approval workflow

---

### 24. **DepartmentGroups.tsx** - No Implementation Details Shown
- **Status:** Unknown - File Not Fully Read
- **Note:** File mentioned in directory listing but not deeply audited

---

### 25. **AccountSettings.tsx** - Complex Multi-Feature Page
- **Status:** Incomplete - Missing Some Handlers
- **Lines:** 100-150
- **Issues:**
  - Profile update form has commented-out user metadata update (line ~48)
  - Password change form present with validation (lines ~430-450)
  - Dark mode toggle present
  - Profile mode toggle (member vs manager) persisted to localStorage
  - But delete account handler may be incomplete
- **What's Missing:**
  - User metadata update (commented out)
  - Email verification workflow
  - Two-factor authentication setup
  - Session management/logout other devices
- **Recommended Fix:**
  - Uncomment and test metadata update
  - Implement email verification
  - Add 2FA option
  - Build multi-device logout

---

## CATEGORY 6: Minor Issues - Incomplete Features

### 26. **MemberContributions.tsx** - View Only
- **Status:** Read-Only Display
- **Issue:** Shows contributions but no editing/corrections
- **Missing:** Contribution correction workflow, dispute handling
- **Fix:** Add correction request feature

---

### 27. **MemberStatements.tsx** - Limited Scope
- **Status:** Basic Date Filtering Only
- **Issue:** Date presets (1m, 3m, 6m, 12m) but no custom reporting
- **Missing:** Export to PDF, email delivery, archival
- **Fix:** Add export and archival features

---

### 28. **Statements.tsx** - Multiple Statement Types
- **Status:** Partially Complete
- **Issue:** Three statement types (session, fund, member) but unclear if all working
- **Missing:** Validation that correct data selected before generation
- **Fix:** Add pre-generation validation

---

### 29. **MemberCalendar.tsx** - Complex Display
- **Status:** Display Only
- **Issue:** Month/week/day/agenda views but no personal calendar management
- **Missing:** Event registration, RSVP, reminders
- **Fix:** Implement event management features

---

### 30. **Signup.tsx** - Password Requirements Only
- **Status:** Basic Implementation
- **Issue:** Password validation only (lines ~80-105) - requires 8 chars, uppercase, lowercase, number, special char
- **Missing:** Email verification, account activation, rate limiting
- **Fix:** Add email verification and rate limiting

---

### 31. **Auth.tsx** - Three-Tab Authentication
- **Status:** Complete But Needs Testing
- **Issue:** Login, signup (via edge function), forgot password
- **Missing:** Remember me, OAuth integrations, biometric auth
- **Fix:** Add additional auth methods (documented comment lines 10-18 suggest fuller implementation planned)

---

### 32. **Payments.tsx** - Stub Implementation
- **Status:** Basic CRUD Only
- **Issue:** Records payments and fund returns as separate entities
- **Missing:** Reconciliation, matching to contributions, variance analysis
- **Fix:** Implement reconciliation workflow

---

### 33. **ClerkSummary.tsx** - Read-Only Summary Table
- **Status:** Display Only
- **Issue:** Shows contributions and expenses combined with filtering/sorting
- **Missing:** Drill-down details, export, batch operations
- **Fix:** Add drill-down and export features

---

### 34. **NotFound.tsx** - Complete
- **Status:** ✅ Complete
- **Note:** Proper 404 handling with error logging

---

### 35. **Index.tsx** - Alias Only
- **Status:** ✅ Complete
- **Note:** Simple redirect to Dashboard

---

---

## SUMMARY BY SEVERITY

### 🔴 CRITICAL (Block Deployment)
1. **MyDues.tsx** - Department dues feature unavailable
2. **MemberSabbathLessons.tsx** - Sabbath school feature unavailable

### 🟠 HIGH (Complete Before Release)
1. **RolesPermissions.tsx** - Hardcoded with no data binding
2. **DepartmentSharePoint.tsx** - Skeleton feature, no collaboration
3. **SabbathSessions.tsx** - Missing session closure validation
4. **Users.tsx** - Complex error handling needs clarification
5. **Imprest.tsx** - Missing retirement workflow

### 🟡 MEDIUM (Should Complete Soon)
1. **ClerkPortal.tsx** - Draft management incomplete
2. **Cheques.tsx** - Missing status workflow validation
3. **MemberClerkView.tsx** - Transfer request workflow incomplete
4. **Funds.tsx** - No historical tracking
5. **AccountSettings.tsx** - Delete account workflow unclear
6. **DepartmentPortal.tsx** - No bulk import or self-service
7. **Expenses.tsx** - Missing complex validation
8. **Payments.tsx** - No reconciliation
9. **BankAccounts.tsx** - No reconciliation or safeguards

### 🟢 LOW (Nice to Have)
1. **Dashboard.tsx** - Minor caching optimization
2. **MemberChoirView.tsx** - Add collaboration features
3. **MusicDepartmentPortal.tsx** - Add debug logging removal
4. **MemberStatements.tsx** - Add export features
5. **Contributions.tsx** - Fund split history tracking

---

## EFFORT ESTIMATES

| Category | Effort | Count |
|----------|--------|-------|
| Feature Unavailability (Feature Flags Needed) | HIGH | 2 |
| Data Binding / Dynamic Content | MEDIUM | 8 |
| Validation & Error Handling | MEDIUM | 9 |
| Workflow/Approval Systems | MEDIUM-HIGH | 6 |
| UI/UX Enhancements | LOW-MEDIUM | 7 |

---

## RECOMMENDATIONS

1. **Immediate (Week 1):**
   - Enable/disable MyDues and MemberSabbathLessons with feature flags
   - Complete RolesPermissions data binding
   - Fix critical validation in Cheques, Expenses, Users

2. **Short-term (Week 2-3):**
   - Implement all missing workflows (session closure, transfer requests, imprest retirement)
   - Add reconciliation features to Payments, BankAccounts
   - Complete ClerkPortal draft management

3. **Medium-term (Week 4+):**
   - Add collaboration features to DepartmentSharePoint, ChoirPortal
   - Implement historical tracking for Funds
   - Add bulk import to DepartmentPortal
   - Build export features in Statements

