# ReCircle — Bug Fixes & Improvements (March 2026)

## Fix 1 + 2: Gemini Vision AI — Real Image Analysis + Accurate Environmental Impact

**Problem:** AI tags were generated from text only (image analysis was faked with a 2-second setTimeout). Environmental impact values (CO₂, tree equivalent) were arbitrary hardcoded numbers like `quantity * 0.9`.

**Solution:** Single Gemini 2.0 Flash vision API call analyzes the uploaded image and returns everything at once:
- **Suggested title & description** based on what the AI sees in the image
- **5-8 product-specific tags** (no generic filler like "sustainable", "eco-friendly")
- **Detected material type**, estimated condition, and best-matching category
- **Environmental impact** (CO₂ saved, water saved, tree equivalent, decomposition years) based on India-specific emission factors and AI-estimated quantity from the image
- **Impact transparency** — the AI explains its estimation basis so users understand where numbers come from

**Files changed:**
- `src/app/api/ai/analyze/route.ts` — NEW: Gemini Vision API endpoint
- `src/app/materials/new/page.tsx` — Real AI analysis on upload, auto-populate form, real impact sidebar
- `src/app/api/materials/route.ts` — Stores AI-generated co2SavedKg, weightKg, aiDetectedType
- `src/app/marketplace/page.tsx` — Removed fake `quantity * 0.5` CO₂ fallback
- `src/app/materials/[id]/page.tsx` — Removed fake impact fallbacks
- `src/app/marketplace/[id]/page.tsx` — Removed fake impact fallbacks

**Env var required:** `GEMINI_API_KEY` — Google AI Studio API key for Gemini 2.0 Flash

---

## Fix 3: Post-Deal Coordination Flow

**Problem:** After a bargain deal was agreed, the "My Deals" page just said "coordinate pickup with the seller" with zero mechanism to actually do it — no address, no phone number, no way to message.

**Solution:**
- Transaction was already being auto-created (existed in bargain agent code) ✓
- **Bargain buyer API** now returns seller's phone number, address, and material pickup location for agreed deals
- **My Deals page** now shows a "Pickup Details" card for agreed deals with:
  - Seller's pickup address
  - Seller's phone number (clickable tel: link)
  - Message Seller button linked to the transaction
  - Clear instructions for the buyer

**Files changed:**
- `src/app/api/bargain/buyer/route.ts` — Include seller phone/address + transaction ID for agreed deals
- `src/app/dashboard/my-deals/page.tsx` — Pickup details card with contact info

---

## Fix 4: Full Address & Distance in Listings

**Problem:** All products just showed "Mumbai" as location. Material creation API hardcoded `address: "Default Address"` and Mumbai coordinates. No way for buyer to know how close a listing is.

**Solution:**
- **Listing form** now has a "Pickup Address" text field + "Use my current location" GPS button
- **Backend** uses real address/coordinates from the form; falls back to city center coordinates if not provided (16 Indian cities supported)
- **Marketplace cards** show full address (with city as fallback) + distance from user in km (via browser geolocation + haversine formula)
- **Material detail pages** show full address in the location field

**Files changed:**
- `src/app/materials/new/page.tsx` — Address input + geolocation button
- `src/app/api/materials/route.ts` — Real address/coords with city-center fallback
- `src/app/marketplace/page.tsx` — Address display + distance calculation
- `src/app/materials/[id]/page.tsx` — Full address display
- `src/app/marketplace/[id]/page.tsx` — Full address display

---

## Fix 5: Transporter Registration Auth Bug

**Problem:** When a user registered as "transporter" or "volunteer", they were redirected to `/transporters/register` — but they weren't logged in yet (registration doesn't auto-login). The transporter API returned 401 Unauthorized.

**Solution:**
- **Register page** now auto-logs in the user via `signIn("credentials", ...)` immediately after successful registration, BEFORE redirecting to the transporter registration page
- **Transporter register page** now has a session guard — if user somehow lands there without a session, they're redirected to `/login?callbackUrl=/transporters/register`

**Files changed:**
- `src/app/(auth)/register/page.tsx` — Auto-login after registration
- `src/app/transporters/register/page.tsx` — Session guard with redirect
