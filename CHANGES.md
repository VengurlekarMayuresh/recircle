# ReCircle – Audit Changes Log

This file documents every bug found, tested, and fixed during the full backend + frontend audit of the ReCircle project.

---

## Critical Bug Fixes

### 1. `src/app/api/users/[id]/reviews/route.ts` — Wrong Prisma field names (snake_case)
**Problem:** The route used snake_case field names (`reviewee_id`, `avatar_url`, `created_at`) which do not exist in the Prisma schema. Prisma uses camelCase.  
**Fix:** Renamed all fields to camelCase (`revieweeId`, `avatarUrl`, `createdAt`). Also updated `params` to use the Next.js 16 `Promise<{id}>` pattern.

---

### 2. `src/app/marketplace/[id]/page.tsx` — `material.id.substring()` TypeError
**Problem:** Line 185 called `.substring(0, 8)` on `material.id`, but `material.id` is an `Int` (not a `String`). This threw a runtime TypeError and crashed the marketplace detail page.  
**Fix:** Changed to `String(material.id).padStart(8, '0').toUpperCase()` to convert the number to a zero-padded string.

---

### 3. Notification `data` field not JSON-serialised (multiple routes)
**Problem:** The Prisma schema defines `Notification.data` as `String @default("{}")`. Several routes passed a plain JavaScript object to this field, which causes a Prisma type validation error at runtime.  
**Affected files:**
- `src/app/api/material-requests/route.ts`
- `src/app/api/material-requests/[id]/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/lib/agents/scout.ts`

**Fix:** Wrapped all `data:` values with `JSON.stringify(...)`.

---

### 4. `AgentLog.details` field not JSON-serialised (`src/lib/agents/scout.ts`)
**Problem:** The schema defines `AgentLog.details` as `String @default("{}")`. The scout agent was passing plain JavaScript objects to this field in two places (lines 229 and 241).  
**Fix:** Wrapped both with `JSON.stringify(...)`.

---

### 5. `material-requests/route.ts` — Invalid `preferredTransport` default value
**Problem:** The default value for `preferredTransport` was `"flexible"`, which is not a valid enum value in the schema. Valid values are: `self_pickup`, `supplier_delivery`, `platform_transporter`.  
**Fix:** Changed the default to `"self_pickup"`.

---

### 6. `material-requests/[id]/route.ts` — Wrong transport status check (`"need_delivery"`)
**Problem:** The transport mapping logic checked for `"need_delivery"` when mapping `preferredTransport` to a transaction transport method, but this value does not exist in the schema.  
**Fix:** Updated the condition to check for `"supplier_delivery"` and `"platform_transporter"` (the actual valid values).

---

### 7. `src/app/my-requests/page.tsx` — Image parsing crash (JSON.parse vs comma-split)
**Problem:** Material images are stored in the database as a comma-separated string (e.g. `"url1,url2"`), but the frontend was calling `JSON.parse(material.images)`, which throws a SyntaxError on non-JSON strings.  
**Fix:** Changed the parse logic to use `.split(",").filter(Boolean)` instead of `JSON.parse`.

---

## Try-Catch Coverage Added

The following API routes were missing try-catch error handling, meaning any unexpected error would result in an unhandled crash instead of a proper 500 response. All have been fixed:

| Route | Handlers Fixed |
|---|---|
| `src/app/api/transport-bookings/route.ts` | GET, POST |
| `src/app/api/transport-bookings/[id]/route.ts` | PUT |
| `src/app/api/transporters/route.ts` | GET, POST |
| `src/app/api/transporters/[id]/route.ts` | GET, PUT |
| `src/app/api/reviews/route.ts` | GET, POST |
| `src/app/api/disputes/route.ts` | GET, POST |
| `src/app/api/agent-logs/route.ts` | GET |
| `src/app/api/repair-hubs/route.ts` | GET |
| `src/app/api/dashboard/forecast/route.ts` | GET (missing closing `} catch` block added) |

---

## Next.js 16 Dynamic Route Params — Promise Pattern

Next.js 15+ requires that `params` in dynamic route handlers be typed as `Promise<{id: string}>` and awaited. Several routes still used the old synchronous style which would throw deprecation warnings or errors.

**Updated to Promise pattern:**

| Route | Handlers Updated |
|---|---|
| `src/app/api/users/[id]/route.ts` | GET |
| `src/app/api/users/[id]/reviews/route.ts` | GET |
| `src/app/api/transactions/[id]/route.ts` | GET, PUT |
| `src/app/api/transactions/[id]/messages/route.ts` | POST |
| `src/app/api/material-requests/[id]/route.ts` | GET, PUT |
| `src/app/api/want-requests/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/transporters/[id]/route.ts` | GET, PUT |
| `src/app/api/transport-bookings/[id]/route.ts` | PUT |

**Pattern used:**
```ts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ... use id
}
```

---

## Summary

| Category | Count |
|---|---|
| Critical runtime bugs fixed | 7 |
| Routes with try-catch added | 9 |
| Routes updated for Next.js 16 params | 8 |
| **Total changes** | **24** |
