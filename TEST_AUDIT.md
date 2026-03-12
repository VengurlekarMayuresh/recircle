# ReCircle – Full Functionality Test Audit

Each section covers: Backend API correctness → Frontend integration → Data flow → Fixes applied.

Status legend: ⏳ Pending | 🔍 In Progress | ✅ Passed | ❌ Fixed (was broken)

---

## Sections

| # | Section | Status |
|---|---|---|
| 1 | Auth – Register & Login | ❌ Fixed |
| 2 | Auth – Profile View & Edit | ❌ Fixed |
| 3 | Marketplace – Browse & Filter Materials | ❌ Fixed |
| 4 | Marketplace – Material Detail Page | ❌ Fixed |
| 5 | Material Listings – Create & My Listings | ❌ Fixed |
| 6 | Want Board – Browse & Create Want Requests | ⏳ |
| 7 | Material Requests – Send, Accept, Reject | ⏳ |
| 8 | Transactions – View, Status Update, Messages | ⏳ |
| 9 | Transport – Book, Register, Dashboard | ⏳ |
| 10 | Reviews & Disputes | ⏳ |
| 11 | Dashboard – Stats, Impact, Demand Forecast | ⏳ |
| 12 | Notifications | ⏳ |
| 13 | AI Agents – Scout, Advisor, Router, Tag | ⏳ |
| 14 | Repair Hubs | ⏳ |
| 15 | Admin Panel | ⏳ |
| 16 | ESG Reports & Leaderboard | ⏳ |

---

## Results (filled as testing progresses)

### Section 1 – Auth: Register & Login
**Status:** ❌ Fixed

**Issues found & fixed:**
- `auth.ts`: `PrismaAdapter` imported and configured but schema has no `Account/Session/VerificationToken` models. Adapter is never called (JWT + Credentials), removed it.
- `login/page.tsx`: "Forgot password?" linked to `/forgot-password` (page does not exist → 404). Removed the link.
- `register/page.tsx`: `confirmPassword` was included in the POST body sent to backend. Now excluded before sending.

### Section 2 – Auth: Profile View & Edit
**Status:** ❌ Fixed

**Issues found & fixed:**
- `profile/page.tsx`: Form used `org_name` key but PUT API reads `orgName` → org name edits were silently discarded. Fixed form state key to `orgName`.
- `profile/[id]/page.tsx`: 14 field references used snake_case (e.g. `avatar_url`, `trust_score`, `green_points`, `avg_rating`, `verification_level`, transporter sub-fields, review `created_at`) but Prisma returns camelCase. All corrected.
- `profile/[id]/page.tsx` (re-audit): Listing thumbnail used `m.images?.[0]` — since `images` is a comma-separated string, this gave the first character ('h' of 'https…') not the first URL. Fixed to `m.images?.split(",")[0]`.

### Section 3 – Marketplace: Browse & Filter
**Status:** ❌ Fixed

**Issues found & fixed:**
- `GET /api/materials`: `userId`, `status`, `limit` query params were silently ignored. Added full support: defaults `status=available` for public marketplace, supports `userId` filter for profile listings, supports `limit` for pagination.
- `POST /api/materials`: Removed leftover debug `console.log` statements.
- `marketplace/page.tsx`: Badge showed "For Sale" for `exchange` listing type. Fixed badge label and colour.

### Section 4 – Marketplace: Material Detail
**Status:** ❌ Fixed

**Issues found & fixed:**
- `materials/[id]/page.tsx`: Request dialog had `preferredTransport` default `"flexible"` (invalid enum). Changed to `"self_pickup"`.
- `materials/[id]/page.tsx`: Transport select options `"need_delivery"` and `"flexible"` are not valid schema values. Fixed to `"supplier_delivery"` and `"platform_transporter"`.
- `marketplace/[id]/page.tsx`: Supplier rating was hardcoded `4.9`. Now shows actual `material.user.avgRating`.
- `marketplace/[id]/page.tsx`: "View Profile" button was not linked. Wrapped in `<Link href=/profile/[id]>`.
- `marketplace/[id]/page.tsx`: Listing type label checked for `'giveaway'` (doesn't exist) → always showed "Resale". Fixed to `donate/exchange/sell` mapping.

### Section 5 – Material Listings: Create & My Listings
**Status:** ❌ Fixed

**Issues found & fixed:**
- `POST /api/materials`: `images` array not normalised — empty array `[]` is truthy so fallback URL never applied, and arrays weren't joined to comma-separated string. Fixed with explicit `filter(Boolean).join(",")`.
- `materials/new/page.tsx`: 6 debug `console.log` statements removed.
- `materials/new/page.tsx`: Error toast read `result.error` but API returns `result.message` — error messages never displayed. Fixed.
- `dashboard/my-listings/page.tsx`: CO₂ stat used `co2_saved_kg` (snake_case) — always showed 0. Fixed to `co2SavedKg`.
- `materials/new/page.tsx` (re-audit): Syntax error — missing comma after `description` property in error toast object literal. Would prevent page compilation. Fixed.

### Section 6 – Want Board
**Status:** ❌ Fixed

**Issues found & fixed:**
- `GET /api/want-requests`: Read `?city=` param and set `where.city = city` but `WantRequest` model has no `city` column → Prisma would throw if city filter was ever used. Removed the dead city filter.
- `want-board/page.tsx`: Clean — fetches, filters, renders all correctly. Display of city uses `req.user?.city` (from included user) which works correctly.
- `want-board/new/page.tsx`: Clean — form submits correct fields, validates title + categoryId, redirects on success.

### Section 7 – Material Requests
**Status:** ⏳

### Section 8 – Transactions & Messages
**Status:** ⏳

### Section 9 – Transport
**Status:** ⏳

### Section 10 – Reviews & Disputes
**Status:** ⏳

### Section 11 – Dashboard
**Status:** ⏳

### Section 12 – Notifications
**Status:** ⏳

### Section 13 – AI Agents
**Status:** ⏳

### Section 14 – Repair Hubs
**Status:** ⏳

### Section 15 – Admin Panel
**Status:** ⏳

### Section 16 – ESG Reports & Leaderboard
**Status:** ⏳
