# ReCircle — Circular Economy Marketplace for Reusable Materials

> **Tagline:** *"Every material deserves a second life."*
> **Hackathon Project** — Augenblick Hackathon, Problem Statement 2

---

## What Is This?

ReCircle is a **full-stack AI-powered circular economy marketplace** built for India. It connects suppliers of surplus/waste materials with receivers who can reuse them — powered by 4 specialized AI agents, India-localized sustainability data, and a trust-first design.

**This is NOT a basic CRUD marketplace.** It's a circular economy operating system with:
- **5 User Roles:** Supplier, Receiver, Transporter, Volunteer Courier, Admin — each with tailored dashboards
- **Multi-Agent AI Orchestration:** 4 specialized agents (Scout, Advisor, Quality, Sentinel) working together
- **AI photo detection + NLP text parsing** for zero-friction listing
- **India-specific CO₂ + ₹ impact calculations** with CPCB emission data
- **Predictive demand forecasting** with India seasonal patterns
- **AI quality verification** on delivery (photo comparison)
- **Fraud detection** with rule-based scoring
- **Digital Material Passports** with QR codes
- **Direct Material Request System** + public Want Board
- **Transport Marketplace:** Book transporters with cost estimation + delivery tracking
- **Predictive Supplier Discovery** for unmatched requests
- **Future Availability Matching** with reservations
- **No-Return Policy** with transparency features (inspections, condition grading)
- **Trust & verification system** (4-tier: Unverified → Basic → Verified → Trusted)
- **Gamification** (Green Points, badges, levels, leaderboard)
- **Real-time notifications** via SSE
- **FAQ / Help system**

---

## CRITICAL NOTES FOR IMPLEMENTERS (Read Before Building)

### 1. Role System — THIS IS IMPORTANT
The `users` table has a `role` enum with values: `individual / business / ngo / volunteer / transporter / admin`. These represent the **user's organization type**, NOT their marketplace behavior.

**Key rule: Users with role = `individual`, `business`, or `ngo` can act as BOTH suppliers AND receivers.**
- They become a **Supplier** when they create a material listing.
- They become a **Receiver** when they request/browse materials.
- The same user can do both. There is NO separate "supplier" or "receiver" role in the database.

Role-specific behaviors:
- `individual` / `business` / `ngo` → Can list materials (supplier behavior) AND request materials (receiver behavior). The navbar shows BOTH supplier links (My Listings, Create Listing) AND receiver links (My Requests, Want Board).
- `transporter` → Dedicated transporter. Gets transporter dashboard, accepts delivery jobs. Can also browse marketplace as receiver if needed.
- `volunteer` → A transporter who delivers for free/nominal cost. After registration, they MUST also complete the transporter vehicle registration form (at `/transporters/register`) with `is_volunteer=true` set automatically. Gets same dashboard as transporter but with bonus green points.
- `admin` → Platform administrator. **NOT available in the registration dropdown.** Admin accounts are created only via database seeding or direct DB insert. Never through the signup form.

### 2. Flow Connections — How Steps Link Together
The implementation steps reference each other. Here is the critical end-to-end flow:
```
Receiver finds material on Marketplace (Step 8)
  → Clicks "Request This Material" (Step 8B / Step 19)
  → Supplier sees request on their dashboard (Step 3E)
  → Supplier clicks Accept (Step 19)
  → System auto-creates a Transaction record (Step 10)
  → Receiver picks transport method (Step 22):
      → Self Pickup: just coordinate via chat
      → Supplier Delivery: coordinate via chat
      → Book Transporter: goes to transport booking flow (Step 22)
          → System finds nearby transporters (Step 22)
          → Receiver picks one → booking created
          → Transporter accepts → delivery tracking starts (Step 23)
  → After delivery: Receiver uploads pickup photo → Quality Agent verifies (Step 13)
  → Both parties leave reviews (Step 10)
  → Transaction marked complete → Green Points awarded (Step 18)
  → If material quantity = 0 → auto-set status to "claimed" (Step 27)
```

### 3. Two Request Systems (Don't Confuse Them)
- **Direct Request (Step 19):** Receiver requests a SPECIFIC listing they found on the marketplace. Goes directly to that listing's supplier. Like placing an order.
- **Want Request (Step 20):** Receiver posts a PUBLIC "I need X" request on the Want Board. Anyone can respond. Like a classifieds ad. The matching engine (Step 9) auto-matches against existing listings.

### 4. Status Values for Materials
The `materials.status` enum has these values with specific meanings:
- `available` — Listed and open for requests
- `reserved` — Someone has expressed interest, pending confirmation
- `claimed` — All quantity taken (quantity = 0). Auto-set when quantity hits 0. Removed from marketplace search. This is the final state when all units are claimed via accepted requests.
- `archived` — Manually deactivated by supplier (they chose to remove it). Different from "claimed".
- `future` — Not available yet. Has an `available_from_date` in the future. Shows with blue "Future" badge.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) — SSR + API routes in one project
- **Language:** TypeScript — type safety across frontend and backend
- **UI:** Tailwind CSS + shadcn/ui — rapid, beautiful components
- **Animations:** Framer Motion — smooth page/component animations
- **Database:** PostgreSQL 16.x on **Neon DB** (serverless Postgres) — IMPORTANT: version 16.x, NOT 17
- **ORM:** **Prisma** — type-safe database client, schema-driven migrations, seeding
- **AI:** OpenAI API (GPT-4) — function-calling for agentic workflows
- **Vision AI:** OpenAI Vision API — photo → material detection
- **Maps:** Leaflet + React-Leaflet — free, no API key needed
- **Charts:** Recharts — dashboard visualizations
- **Real-time:** Server-Sent Events (SSE) — notifications without WebSocket complexity
- **QR Codes:** `qrcode` npm package — Digital Material Passports
- **Auth:** NextAuth.js (credentials + JWT) — simple auth, no external providers needed

---

## Project Structure

```
recircle/
├── prisma/
│   ├── schema.prisma                     # Prisma schema (21 tables)
│   ├── seed.ts                           # Database seeding script
│   └── migrations/                       # Auto-generated migrations
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (navbar, providers, chat panel)
│   │   ├── page.tsx                      # Landing/home page (hero, stats, trending, CTA)
│   │   ├── globals.css                   # Tailwind + custom styles
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx            # Login page (email + password)
│   │   │   └── register/page.tsx         # Registration (name, email, password, phone, role, city, org)
│   │   │
│   │   ├── marketplace/
│   │   │   └── page.tsx                  # Browse materials (grid + map toggle, filters, search)
│   │   │
│   │   ├── materials/
│   │   │   ├── new/page.tsx              # Create listing (photo/text AI paths)
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Material detail (full spec, request button, impact)
│   │   │       └── passport/page.tsx     # Full Digital Material Passport (QR scannable)
│   │   │
│   │   ├── want-board/
│   │   │   ├── page.tsx                  # Want Request board (public board — browse wants)
│   │   │   └── new/page.tsx              # Create new want request form
│   │   │
│   │   ├── my-requests/
│   │   │   └── page.tsx                  # My Requests dashboard (sent + received tabs)
│   │   │
│   │   ├── transactions/
│   │   │   ├── page.tsx                  # User's transactions list
│   │   │   └── [id]/page.tsx             # Transaction detail + messaging + delivery tracker
│   │   │
│   │   ├── transporters/
│   │   │   ├── page.tsx                  # Browse transporters (for receivers booking)
│   │   │   ├── register/page.tsx         # Register as transporter (vehicle details form)
│   │   │   └── dashboard/page.tsx        # Transporter's own dashboard (jobs, earnings)
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Impact dashboard (charts, stats, agent log)
│   │   │   ├── my-listings/page.tsx      # Supplier's listings + incoming requests
│   │   │   ├── my-impact/page.tsx        # Personal sustainability profile
│   │   │   └── demand-forecast/page.tsx  # Demand prediction charts
│   │   │
│   │   ├── profile/
│   │   │   ├── page.tsx                  # Own profile view + edit
│   │   │   └── [id]/page.tsx             # Public user profile (trust, badges, reviews, listings)
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx                  # Admin overview (stats, recent activity)
│   │   │   ├── users/page.tsx            # User management (all roles)
│   │   │   ├── transporters/page.tsx     # Transporter management
│   │   │   ├── flagged/page.tsx          # Sentinel fraud flags panel
│   │   │   └── disputes/page.tsx         # Dispute resolution panel
│   │   │
│   │   ├── faq/page.tsx                  # FAQ / Help page
│   │   ├── repair-hubs/page.tsx          # Repair hub map
│   │   ├── leaderboard/page.tsx          # Gamification leaderboard
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │       ├── auth/register/route.ts       # User registration
│   │       │
│   │       ├── materials/
│   │       │   ├── route.ts              # GET (list) + POST (create)
│   │       │   ├── [id]/route.ts         # GET/PUT/DELETE single material
│   │       │   ├── ai-detect/route.ts    # Vision API photo detection
│   │       │   ├── ai-parse-text/route.ts # NLP text parsing
│   │       │   └── [id]/
│   │       │       ├── passport/route.ts # DPP data
│   │       │       ├── qr/route.ts       # QR code generation
│   │       │       └── reuse-score/route.ts # RPS calculation
│   │       │
│   │       ├── material-requests/
│   │       │   ├── route.ts              # POST (receiver requests listing) + GET
│   │       │   └── [id]/route.ts         # GET detail, PUT accept/reject
│   │       │
│   │       ├── want-requests/
│   │       │   ├── route.ts              # GET/POST want requests (public board)
│   │       │   └── [id]/route.ts         # Single want request CRUD
│   │       │
│   │       ├── matches/
│   │       │   └── route.ts              # GET matches, POST accept/reject
│   │       │
│   │       ├── transactions/
│   │       │   ├── route.ts              # GET/POST transactions
│   │       │   ├── [id]/route.ts         # Single transaction
│   │       │   ├── [id]/messages/route.ts # Chat messages
│   │       │   └── [id]/verify/route.ts  # Quality verification (photo upload)
│   │       │
│   │       ├── transporters/
│   │       │   ├── route.ts              # GET list + POST register
│   │       │   ├── [id]/route.ts         # GET/PUT single transporter profile
│   │       │   └── nearby/route.ts       # GET nearby transporters for pickup+delivery
│   │       │
│   │       ├── transport-bookings/
│   │       │   ├── route.ts              # POST create booking + GET list
│   │       │   └── [id]/route.ts         # PUT update status (accept/collect/deliver/complete)
│   │       │
│   │       ├── supplier-discovery/
│   │       │   ├── trigger/route.ts      # POST trigger discovery for unmatched requests
│   │       │   └── respond/route.ts      # POST supplier responds
│   │       │
│   │       ├── auth/profile/route.ts      # PUT update own profile
│   │       │
│   │       ├── notifications/
│   │       │   ├── route.ts              # GET notifications list
│   │       │   ├── stream/route.ts       # GET SSE real-time stream
│   │       │   ├── [id]/route.ts         # PATCH mark single as read
│   │       │   └── mark-all-read/route.ts # PATCH mark all as read
│   │       ├── chat/route.ts             # Advisor Agent chat endpoint
│   │       │
│   │       ├── dashboard/
│   │       │   ├── stats/route.ts        # Platform-wide stats
│   │       │   ├── impact/route.ts       # User impact data
│   │       │   └── forecast/route.ts     # Demand forecast data
│   │       │
│   │       ├── agent-logs/route.ts       # GET agent activity logs
│   │       │
│   │       ├── saved-materials/
│   │       │   └── route.ts              # GET (list saved) + POST (save material)
│   │       │   └── [materialId]/route.ts # DELETE (unsave)
│   │       │
│   │       ├── reviews/
│   │       │   └── route.ts              # POST create review
│   │       │
│   │       ├── disputes/
│   │       │   └── route.ts              # POST create dispute
│   │       │
│   │       ├── admin/
│   │       │   ├── users/route.ts        # User management
│   │       │   ├── flagged/route.ts      # Fraud flags management
│   │       │   └── disputes/route.ts     # Dispute management
│   │       │
│   │       └── reports/esg/route.ts      # ESG/CSR report generation
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   ├── navbar.tsx                    # Top navigation bar (role-aware links)
│   │   ├── footer.tsx                    # Footer
│   │   ├── material-card.tsx             # Material listing card
│   │   ├── material-form.tsx             # Create/edit material form
│   │   ├── photo-upload.tsx              # AI photo detection upload
│   │   ├── nlp-text-input.tsx            # NLP text parsing input
│   │   ├── map-view.tsx                  # Leaflet map with markers
│   │   ├── impact-card.tsx               # CO₂ + ₹ impact display
│   │   ├── reuse-score-badge.tsx         # RPS colored badge
│   │   ├── route-flowchart.tsx           # Material Router animated flowchart
│   │   ├── match-card.tsx                # Matched receiver card
│   │   ├── request-card.tsx              # Direct material request card (for supplier dashboard)
│   │   ├── transaction-stepper.tsx       # Status progress stepper
│   │   ├── delivery-tracker.tsx          # Delivery tracking stepper (5 statuses)
│   │   ├── transporter-card.tsx          # Transporter profile card (for booking)
│   │   ├── cost-estimator.tsx            # Delivery cost breakdown display
│   │   ├── transport-option-picker.tsx   # Choose: self pickup / delivery / book transporter
│   │   ├── chat-panel.tsx                # AI Advisor slide-out chat
│   │   ├── agent-activity-log.tsx        # Real-time agent log sidebar
│   │   ├── quality-comparison.tsx        # Side-by-side photo comparison
│   │   ├── demand-forecast-chart.tsx     # Forecast line chart
│   │   ├── trust-badge.tsx               # Verification level badge
│   │   ├── notification-bell.tsx         # Notification dropdown
│   │   ├── badge-display.tsx             # Gamification badges
│   │   ├── animated-counter.tsx          # Counting animation component
│   │   ├── sankey-diagram.tsx            # Material flow Sankey
│   │   └── qr-code.tsx                   # QR code display
│   │
│   └── lib/
│       ├── prisma.ts                     # Prisma client singleton
│       ├── auth.ts                       # NextAuth config
│       ├── openai.ts                     # OpenAI client setup
│       │
│       ├── agents/
│       │   ├── scout.ts                  # Scout Agent (auto-process listings)
│       │   ├── advisor.ts                # Advisor Agent (chat with tools)
│       │   ├── quality.ts                # Quality Verification Agent
│       │   └── sentinel.ts              # Sentinel/Fraud Detection Agent
│       │
│       ├── material-router.ts            # Decision tree: condition → route
│       ├── matching-engine.ts            # Supply-demand matching logic
│       ├── supplier-discovery.ts         # Predictive supplier discovery logic
│       ├── transporter-matcher.ts        # Nearby transporter matching
│       ├── cost-estimator.ts             # Delivery cost calculation (base + distance × rate)
│       ├── sustainability-calc.ts        # India CO₂ + ₹ calculator
│       ├── demand-forecast.ts            # Predictive demand engine
│       ├── trust-score.ts                # Trust score computation
│       ├── green-points.ts               # Gamification points logic
│       ├── haversine.ts                  # Distance calculation (Haversine formula)
│       └── utils.ts                      # Shared utilities
│
├── public/
│   ├── uploads/                          # Material images
│   └── icons/                            # Category icons
│
├── .env.local                            # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## Database Schema (21 Tables — Prisma + Neon PostgreSQL 16.x)

### IMPORTANT: All tables defined in `prisma/schema.prisma`. Run `npx prisma migrate dev` to create. Run `npx prisma db seed` to seed.

**21 tables total.** Uses Prisma ORM with Neon DB (PostgreSQL 16.x — NOT version 17).

**1. users** — id (UUID, auto-generated), name, email (unique), password_hash, phone, role (enum: individual/business/ngo/volunteer/transporter/admin), org_name (nullable), bio (nullable), avatar_url (nullable), location_lat (Float nullable), location_lng (Float nullable), address (nullable), city, green_points (Int default 0), level (enum: seedling/sprout/sapling/tree/forest), trust_score (Int default 0), verification_level (enum: unverified/basic/verified/trusted), id_verified (Boolean default false), avg_rating (Float default 0), total_ratings (Int default 0), created_at (DateTime default now), updated_at (DateTime auto-update)

**2. categories** — id (Int autoincrement), name, slug (unique), icon, co2_factor_kg (Float), water_factor_liters (Float default 0), landfill_cost_inr_per_tonne (Float), new_cost_inr_per_unit (Float), decomposition_years (Int), peak_months (Json — array of month numbers), description

**3. materials** — id (Int autoincrement), user_id (FK→users), category_id (FK→categories), title, description, condition (enum: new/like_new/good/fair/salvage), quantity (Int default 1), unit (String default "pieces"), weight_kg (Float nullable), listing_type (enum: donate/sell/exchange), price (Float default 0), status (enum: available/reserved/claimed/archived/future), location_lat, location_lng, address, city, images (Json — array of URLs), tags (Json — array of strings), available_from_date (DateTime nullable — for future availability listings), ai_detected_type (nullable), reuse_potential_score (Int nullable), ai_use_cases (Json nullable), ai_route_recommendation (enum nullable: reuse/repair/recycle/dispose), co2_saved_kg (Float default 0), rupees_saved (Float default 0), fraud_risk_score (Int default 0), views_count (Int default 0), reuse_count (Int default 0), created_at, updated_at

**4. want_requests** (public "Want" board) — id, user_id (FK→users), category_id (FK→categories), title, description, keywords (String — comma-separated), quantity_needed (Int), location_lat, location_lng, radius_km (Int default 10), urgency (enum: low/medium/high), status (enum: open/fulfilled/expired), created_at

**5. direct_requests** (receiver requests a specific listing) — id, material_id (FK→materials), receiver_id (FK→users), quantity_requested (Int), message, preferred_transport (enum: self_pickup/need_delivery/flexible), status (enum: pending/accepted/rejected/in_progress/completed), response_message (nullable), created_at, responded_at (DateTime nullable)

**6. matches** — id, material_id (FK→materials), want_request_id (FK→want_requests nullable), user_id (FK→users — matched receiver), score (Float), reason, status (enum: pending/accepted/rejected), notified (Boolean default false), created_at

**7. transactions** — id, material_id (FK→materials), supplier_id (FK→users), receiver_id (FK→users), quantity (Int), transport_method (enum: self_pickup/supplier_delivery/platform_transporter), status (enum: negotiating/scheduled/in_transit/delivered/confirmed/cancelled), pickup_date (DateTime nullable), pickup_address, delivery_address, notes (nullable), supplier_rating (Int nullable), receiver_rating (Int nullable), pickup_photo_url (nullable), quality_match_score (Int nullable — AI 1-10), created_at, completed_at (DateTime nullable)

**8. transporters** — id, user_id (FK→users unique), vehicle_type (enum: mini_truck/pickup_van/tempo/autorickshaw/bike/other), vehicle_capacity_kg (Float), vehicle_capacity_cbm (Float nullable), vehicle_photo (nullable), service_area_city, service_radius_km (Int), price_per_km (Float), base_rate (Float), availability_status (enum: available/busy/offline), total_deliveries (Int default 0), avg_rating (Float default 0), total_ratings (Int default 0), is_volunteer (Boolean default false), created_at, updated_at

**9. transport_bookings** — id, transaction_id (FK→transactions), transporter_id (FK→transporters), receiver_id (FK→users), pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, distance_km (Float), estimated_cost (Float), actual_cost (Float nullable), status (enum: requested/accepted/pickup_scheduled/collected/in_transit/delivered/completed/cancelled), scheduled_date (DateTime nullable), transporter_rating (Int nullable), notes (nullable), created_at, updated_at

**10. messages** — id, transaction_id (FK→transactions), sender_id (FK→users), content, image_url (nullable), read (Boolean default false), created_at

**11. reviews** — id, transaction_id (FK→transactions), reviewer_id (FK→users), reviewee_id (FK→users), rating (Int 1-5), comment (nullable), review_type (enum: supplier_review/receiver_review/transporter_review), created_at

**12. disputes** — id, transaction_id (FK→transactions), raised_by (FK→users), reason, evidence_images (Json — array), status (enum: open/reviewing/resolved), resolution (nullable), resolved_by (FK→users nullable), created_at, resolved_at (DateTime nullable)

**13. notifications** — id, user_id (FK→users), type, title, body (nullable), data (Json default {}), read (Boolean default false), created_at

**14. badges** — id, name, slug (unique), description, icon, requirement_type, requirement_value (Int)

**15. user_badges** — id, user_id (FK→users), badge_id (FK→badges), earned_at (DateTime default now)

**16. chat_history** — id, user_id (FK→users), role (enum: user/assistant), content, tool_calls (Json nullable), created_at

**17. repair_hubs** — id, name, type (enum: workshop/makerspace/event), address, location_lat, location_lng, categories (Json — array), website (nullable), hours (nullable), created_at

**18. agent_logs** — id, agent_name (enum: scout/advisor/quality/sentinel), action, material_id (FK nullable), user_id (FK nullable), details (Json default {}), created_at

**19. demand_history** — id, category_id (FK→categories), city, month (Int), year (Int), listing_count (Int default 0), transaction_count (Int default 0), created_at

**20. fraud_flags** — id, material_id (FK nullable), user_id (FK nullable), risk_score (Int), reasons (Json — array), status (enum: pending/reviewed/cleared/banned), reviewed_by (FK nullable), created_at

**21. saved_materials** (watchlist/favorites) — id (Int autoincrement), user_id (FK→users), material_id (FK→materials), created_at (DateTime default now). Unique constraint on (user_id, material_id) to prevent duplicates. Used for the watchlist/save feature — when a saved material's status changes, a notification is sent to the user.

---

## Seed Data (CRITICAL for Demo)

### Categories (8) — with India-specific factors
```
Construction       | co2: 0.9  | landfill: ₹1,500/t  | new_cost: ₹800/unit   | peak: [10,11,12,1,2,3]
Furniture & Office | co2: 3.5  | landfill: ₹2,000/t  | new_cost: ₹15,000     | peak: [5,6,7]
Packaging          | co2: 1.2  | landfill: ₹1,200/t  | new_cost: ₹500        | peak: [9,10,11]
Electronics        | co2: 20.0 | landfill: ₹8,000/t  | new_cost: ₹25,000     | peak: [10,11]
Industrial Surplus | co2: 4.0  | landfill: ₹3,000/t  | new_cost: ₹10,000     | peak: [1,2,3,4]
Textiles           | co2: 15.0 | landfill: ₹1,800/t  | new_cost: ₹350/meter  | peak: [8,9,10]
Metals & Scrap     | co2: 6.0  | landfill: ₹2,500/t  | new_cost: ₹40/kg      | peak: [10,11,12,1,2,3]
Wood & Timber      | co2: 1.8  | landfill: ₹1,000/t  | new_cost: ₹1,200/cft  | peak: [10,11,12,1,2]
```

### Users (10+ seed) — different roles, cities, trust levels
- 3 businesses/suppliers (construction company Mumbai, IT firm Pune, textile factory Surat)
- 3 individuals/suppliers (various cities — Delhi, Bangalore, Ahmedabad)
- 2 NGOs/receivers (Habitat for Humanity Mumbai, local school Pune)
- 1 volunteer courier (Delhi)
- 2-3 transporters (Mumbai: mini truck + tempo, Pune: pickup van) — with full transporter profiles
- 1 admin

### Materials (50+) — spread across all categories, conditions, cities
- Must have realistic Indian city locations (Mumbai, Pune, Delhi, Bangalore, Surat, Ahmedabad)
- Each with lat/lng coordinates (use real coordinates for these cities)
- Mix of donate/sell/exchange listing types
- Mix of all 5 condition levels (new, like_new, good, fair, salvage)
- Some with completed transactions for history
- 2-3 with status="future" and available_from_date set (for future availability demo)
- Some with AI-generated use cases and RPS scores already filled

### Transporters (2-3 seed) — with full vehicle profiles
- Mini truck in Mumbai (capacity 500kg, ₹12/km, base ₹200)
- Tempo in Mumbai (capacity 1000kg, ₹18/km, base ₹350)
- Pickup van in Pune (capacity 300kg, ₹10/km, base ₹150, is_volunteer=true)

### Sample Transactions + Requests
- 5-8 sample transactions in various statuses (negotiating, scheduled, delivered, confirmed)
- 3-5 direct requests (some pending, some accepted, some completed)
- 2-3 want requests on the want board
- 3-5 reviews with ratings and comments
- 1 sample transport booking (completed, with rating)

### Demand History (6 months) — for forecast charts
- Generate for each category × each city × each of the last 6 months
- Bake in seasonal patterns (construction peaks Oct-Mar, electronics peaks Diwali season, etc.)
- Random noise ±15% for realism

### Badges (10+)
- First Listing, Waste Warrior (100kg), Community Champion (10 exchanges), Green Courier (5 deliveries), Circular Hero (1 ton), Early Adopter, Trusted Trader, Impact Leader, etc.

### Repair Hubs (5+) — real-ish locations
- Mumbai Makerspace, Pune Repair Cafe, Delhi Upcycle Workshop, etc.

---

## Implementation Guide — Step by Step

### STEP 1: Project Scaffolding
```bash
npx create-next-app@14 recircle --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd recircle
npm install prisma @prisma/client openai next-auth bcryptjs @types/bcryptjs uuid @types/uuid
npm install recharts leaflet react-leaflet @types/leaflet qrcode @types/qrcode framer-motion
npm install lucide-react class-variance-authority clsx tailwind-merge
npx prisma init
npx shadcn@latest init
npx shadcn@latest add button card input label select textarea badge dialog sheet tabs avatar dropdown-menu toast separator progress
```

Create `.env.local`:
```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/recircle?sslmode=require"
OPENAI_API_KEY=sk-your-key-here
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

**IMPORTANT:** Get the DATABASE_URL from your Neon DB dashboard. Create a new project on neon.tech, select PostgreSQL **16.x** (NOT 17), copy the connection string.

### STEP 2: Prisma Schema + Migration + Seed Data

**File: `prisma/schema.prisma`**
- Define all 21 models (tables) with proper relations, enums, and defaults
- Use `@id @default(uuid())` for users, `@id @default(autoincrement())` for others
- Define all enums: Role, Condition, ListingType, MaterialStatus, TransportMethod, etc.

**File: `src/lib/prisma.ts`** — Prisma client singleton:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma
```

**File: `prisma/seed.ts`**
- Check if data already exists (don't double-seed)
- Insert all 8 categories with India-specific CO₂/cost factors
- Insert seed users (hash passwords with bcryptjs) — different roles, cities, trust levels
- Insert 2-3 seed transporters with vehicle profiles
- Insert 50+ materials with realistic data, images, lat/lng
- Insert 6 months of demand_history with seasonal patterns
- Insert badges (10+)
- Insert repair_hubs (5+)
- Insert some sample transactions, reviews, matches, direct_requests for demo realism

Run setup:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

### STEP 3: Auth System
**File: `src/lib/auth.ts`** — NextAuth config
- Credentials provider: email + password
- Validate with bcryptjs compare against Prisma user record
- JWT strategy with user id, name, email, role, city in token
- Session callback to expose user data

**Pages:**
- `src/app/(auth)/login/page.tsx` — Login Page
  - **Form fields:**
    - Email (required, text input, type="email")
    - Password (required, text input, type="password")
    - "Remember me" checkbox (optional, stores session longer)
    - "Forgot password?" link (can be a placeholder for hackathon)
  - **Submit button:** "Sign In"
  - **On success:** redirect to `/marketplace`
  - **On error:** show toast/alert: "Invalid email or password"
  - **Below form:** "Don't have an account? Register here" link to `/register`
  - **API call:** `POST /api/auth/callback/credentials` (NextAuth handles this internally via the credentials provider)

- `src/app/(auth)/register/page.tsx` — Registration Page
  - **Form fields:**
    - Full name (required, text input)
    - Email (required, text input, type="email", must be unique — show error if taken)
    - Password (required, text input, type="password", min 8 chars — show validation hint)
    - Confirm Password (required, must match password)
    - Phone number (required, text input, type="tel")
    - Role — dropdown with options: `Individual` / `Business` / `NGO` / `Volunteer Courier` / `Transporter` (NOTE: `Admin` is NOT shown here — admin accounts are seeded only)
    - City — dropdown: Mumbai, Delhi, Pune, Bangalore, Surat, Ahmedabad, Chennai, Kolkata, Hyderabad, Jaipur
    - Organization name (text input — **conditionally shown ONLY if role is Business or NGO**, hidden otherwise)
    - Profile image (optional, file upload)
  - **Submit button:** "Create Account"
  - **On success:**
    - If role = `Transporter` or `Volunteer Courier` → redirect to `/transporters/register` to fill vehicle details. For Volunteer Courier, `is_volunteer=true` is auto-set on the transporter record.
    - All other roles → redirect to `/marketplace`
  - **Below form:** "Already have an account? Sign in" link to `/login`
  - **API call:** `POST /api/auth/register`
  - **Role mapping to DB enum:** Individual→`individual`, Business→`business`, NGO→`ngo`, Volunteer Courier→`volunteer`, Transporter→`transporter`

**API: `POST /api/auth/register`** — Registration endpoint
- Body: `{ name, email, password, phone, role, city, org_name?, avatar_url? }`
- Validate: email unique, password min 8 chars, role valid
- Hash password with bcryptjs (12 rounds)
- Create user via Prisma with default: green_points=0, level=seedling, trust_score=0, verification_level=unverified
- Return user (without password_hash) + JWT token

**API: `PUT /api/auth/profile`** — Update own profile
- Body: `{ name?, phone?, bio?, avatar_url?, org_name?, address?, city?, location_lat?, location_lng? }`
- Requires auth (session user)
- Update via Prisma, return updated user

### STEP 3B: Landing Page

**Page: `src/app/page.tsx`** — Home/Landing Page (shown to all visitors including unauthenticated)

Sections top to bottom:
1. **Hero Section** — Large heading: "Every material deserves a second life." Subheading explaining the circular economy. Two CTA buttons: "Browse Marketplace" and "List Your Surplus". Background gradient or illustration.
2. **Animated Stats Bar** — 3 big animated counters: Total Materials Reused | kg CO₂ Saved | ₹ Saved. Use `animated-counter.tsx` component. Numbers count up on scroll.
3. **How It Works** — 3-step visual: (1) List your surplus material → (2) AI finds the best match → (3) Coordinate pickup/delivery. Icons + short description for each.
4. **Trending Materials** — Horizontal scroll of 6-8 material cards that are most viewed/requested this week. Pulls from `GET /api/materials?sort=views_count&limit=8`.
5. **Category Showcase** — 8 category cards with icons: Construction, Furniture, Packaging, Electronics, Industrial, Textiles, Metals, Wood. Click → navigates to `/marketplace?category=slug`.
6. **Impact Preview** — "Join X users saving the planet" with a small bar chart showing monthly impact. Link to full dashboard.
7. **Call-to-Action** — "Sign up in 30 seconds" + register button. If logged in, show "Go to Dashboard" instead.
8. **Footer** — Links: About, FAQ, Contact, Terms. Social icons.

### STEP 3C: Navbar (Role-Aware Navigation)

**Component: `src/components/navbar.tsx`** — Top navigation bar, visible on all pages.

**Left side:** ReCircle logo + name (links to home)

**Center links — based on DB role (NOT "supplier"/"receiver" since those are behaviors, not roles):**

**Not logged in:** Home | Marketplace | Want Board | FAQ

**role = `individual` / `business` / `ngo` (these users can be BOTH suppliers AND receivers):**
Marketplace | Want Board | Create Listing | My Listings | My Requests | Dashboard

**role = `transporter` / `volunteer`:**
Marketplace | My Deliveries | Dashboard

**role = `admin`:**
Marketplace | Dashboard | Admin Panel

**Right side:**
- If not logged in: Login / Register buttons
- If logged in: Notification bell (with unread count badge) + Avatar dropdown menu (Profile, Settings, Logout) + Green Points display (e.g. "🌱 120 GP")

### STEP 3D: Profile Pages

**Page: `src/app/profile/page.tsx`** — Own Profile (view + edit mode)
- Shows: name, email, phone, role, city, org_name, bio, avatar
- Editable fields: name, phone, bio, avatar_url, org_name, address, city, location
- "Edit Profile" button toggles edit mode → save calls `PUT /api/auth/profile`
- Below profile info: Trust Score badge, Verification Level badge, Green Points + Level, list of earned badges
- Tab: "My Impact" — personal CO₂ saved, ₹ saved, kg diverted, transaction count
- Tab: "My Reviews" — reviews received from other users (rating + comment + date)

**Page: `src/app/profile/[id]/page.tsx`** — Public Profile (view only, anyone can see)
- Shows: name, avatar, role, city, org_name, bio
- Trust Score badge + Verification Level badge
- Green Points + Level + earned badges
- Stats: total listings, total exchanges, avg rating
- Recent reviews received
- If supplier: recent active listings
- If transporter: vehicle info, delivery count, avg rating

### STEP 3E: Supplier Dashboard (My Listings)

**Page: `src/app/dashboard/my-listings/page.tsx`** — Supplier's Control Center

**Top stats cards:**
- Total active listings | Total claimed | Pending requests | This month's impact (CO₂ saved)

**Tab 1: "My Listings"**
- Table/grid of supplier's own materials: thumbnail, title, category, condition, quantity remaining, status badge, views, date
- Quick actions per listing: Edit, Deactivate, Delete, View Requests
- Sort by: newest, most viewed, most requested
- Filter by: status (available/reserved/claimed/archived/future)

**Tab 2: "Incoming Requests"**
- List of direct_requests where supplier's listings are being requested
- Each shows: request-card component with receiver name + trust badge, material requested, quantity, message, preferred transport, date
- Supplier actions: **Accept** (creates transaction, reduces quantity) or **Reject** (with optional message)
- Sorted by newest first

**Tab 3: "Discovery Responses"**
- Notifications from Predictive Supplier Discovery: "A user near you needs wooden pallets. Do you have any?"
- Supplier responds: "Available now" (redirects to create listing, pre-filled) / "Available later" (set date, creates future listing) / "Not available"

### STEP 4: Material CRUD + AI Listing

**API: `POST /api/materials`** — The most important endpoint. Flow:
1. Receive form data (title, description, category_id, condition, quantity, weight_kg, listing_type, price, location, images)
2. Save images to `/public/uploads/`
3. Insert into materials table
4. Calculate CO₂ saved + ₹ saved using category factors
5. **Trigger Scout Agent** (async, don't block response)
6. Return created material

**API: `POST /api/materials/ai-detect`** — Vision API
1. Receive image (base64 or file)
2. Send to OpenAI Vision API with prompt:
   ```
   Analyze this image of a material/item. Return JSON with:
   - material_type: what the material is
   - category: best match from [Construction, Furniture & Office, Packaging, Electronics, Industrial Surplus, Textiles, Metals & Scrap, Wood & Timber]
   - condition: one of [new, like_new, good, fair, salvage]
   - estimated_weight_kg: rough estimate
   - description: 2-3 sentence description for a marketplace listing
   - tags: array of 3-5 relevant tags
   ```
3. Parse response, return auto-fill data

**API: `POST /api/materials/ai-parse-text`** — NLP Parser
1. Receive `{ text: "200 steel rods, Andheri East, Mumbai" }`
2. Send to OpenAI GPT-4 with prompt:
   ```
   Parse this natural language material listing. Extract JSON:
   - title, category, quantity, unit, location (city + area), condition (guess if not stated), weight_kg (estimate), description, tags
   ```
3. Return parsed data for form auto-fill

**Page: `src/app/materials/new/page.tsx`** — Create Listing
- Two tabs: "📷 Photo Upload" and "✏️ Describe It"
- Photo tab: drag-drop image → calls ai-detect → shows auto-filled preview → user reviews/edits → submit
- Text tab: big text input → type naturally → calls ai-parse-text → auto-fills form → submit
- **Manual form fields (all shown after AI auto-fill, user can edit):**
  - Title (required)
  - Description (required, multiline)
  - Category — dropdown: Construction / Furniture & Office / Packaging / Electronics / Industrial Surplus / Textiles / Metals & Scrap / Wood & Timber
  - Condition — dropdown: New / Like New / Good / Fair / Salvage
    - **New** — Unused, still in original packaging or mint condition
    - **Like New** — Minimal use, no visible defects, fully functional
    - **Good** — Minor wear/scratches, fully functional, structurally sound
    - **Fair** — Visible wear, minor damage, may need minor repair but still usable
    - **Salvage** — Significant damage, best for parts/recycling/scrap, not directly reusable
  - Quantity (required, number)
  - Unit — dropdown: pieces / kg / meters / liters / tonnes
  - Weight (kg) — number (estimated if AI detected)
  - Listing Type — radio: Donate / Sell / Exchange
  - Price (₹) — number, shown only if Sell selected (default 0 for donate)
  - Images — multi-file upload (minimum 2 photos required), drag-drop zone
  - Location — address text input + city dropdown + optional map pin (lat/lng)
  - Tags — comma-separated or chip input (AI suggests, user can add/remove)
  - Available From Date — date picker (optional — for future availability listings). If set, status becomes "future" instead of "available"
- Below form: live preview card showing what the listing will look like
- **Batch Listing option:** "Upload CSV" button for businesses to bulk-list 50+ items at once. CSV columns: title, category, condition, quantity, unit, weight_kg, listing_type, price, address, city
- After submit: show RPS badge, use cases, matched receivers, route recommendation

### STEP 5: Scout Agent

**File: `src/lib/agents/scout.ts`**

This is a server-side function, NOT a chat. Called automatically after material creation.

```typescript
async function runScoutAgent(materialId: number) {
  // 1. Get material from DB
  // 2. If no category detected, call OpenAI to categorize
  // 3. Compute Reuse Potential Score (RPS)
  //    - category_demand = count of open requests for this category / total open requests
  //    - condition_factor = { new: 1.0, like_new: 0.85, good: 0.7, fair: 0.5, salvage: 0.2 }
  //    - weight_factor = min(weight_kg / 100, 1.0)
  //    - nearby_demand = count of requests within 10km / 10
  //    - RPS = round((category_demand * 30) + (condition_factor * 30) + (weight_factor * 20) + (nearby_demand * 20))
  //    - Clamp to 0-100
  // 4. Generate use cases via OpenAI:
  //    Prompt: "For [material_type] in [condition] condition, suggest 3-5 specific reuse ideas in Indian context. Return JSON array of strings."
  // 5. Run Material Router (see Step 6)
  // 6. Find top 5 matches (see matching engine)
  // 7. Create notifications for matched receivers
  // 8. Log to agent_logs table
  // 9. Update material record with RPS, use_cases, route_recommendation
}
```

Log every action to `agent_logs` table with `agent_name='scout'`.

### STEP 6: Material Router

**File: `src/lib/material-router.ts`**

Simple decision tree — no ML needed:

```typescript
function routeMaterial(condition: string, categorySlug: string): RouteRecommendation {
  // Electronics or hazardous → DISPOSE
  if (categorySlug === 'electronics') {
    return {
      route: 'dispose',
      reason: 'E-waste requires safe disposal per CPCB guidelines',
      action: 'Show nearest e-waste collection centers',
      extra_data: { cpcb_link: 'https://cpcb.nic.in', nearby_centers: [] }
    };
  }
  // Condition-based routing
  if (['new', 'like_new', 'good'].includes(condition)) {
    // Check if high-demand category → add Priority badge + boost in search ranking
    const isHighDemand = checkCategoryDemand(categorySlug); // compare open requests vs supply
    return {
      route: 'reuse',
      reason: 'Material in reusable condition',
      action: 'List on marketplace',
      priority_badge: isHighDemand // if true, show "High Demand" badge on listing card
    };
  }
  if (condition === 'fair') {
    // Find nearest repair hub from repair_hubs table
    return {
      route: 'repair',
      reason: 'Material can be repaired for extended use',
      action: 'Show nearest repair hub + estimated repair cost',
      repair_hub: { name: 'Mumbai Makerspace', distance_km: 2.3, estimated_cost: 500 }
    };
  }
  if (condition === 'salvage') {
    // Calculate scrap value from category factors
    return {
      route: 'recycle',
      reason: 'Material suitable for recycling/scrap',
      action: 'Show scrap value estimate + nearest recycling partner',
      scrap_value: { per_kg: 25, total: weight_kg * 25, currency: 'INR' }
    };
  }
}
```

**UI on material detail page:** Display as animated flowchart using Framer Motion. Show the route path with reason + extra data. User can click "Override" button to change the AI suggestion (e.g., list salvage material on marketplace anyway).

### STEP 7: QR Code / Digital Material Passport

**API: `GET /api/materials/[id]/qr`**
- Generate QR code using `qrcode` package
- QR points to: `{baseUrl}/materials/{id}/passport`
- Return as PNG image

**Page: `src/app/materials/[id]/passport/page.tsx`** — Full DPP
- Material origin (who listed, when, where)
- Material composition + AI-detected type
- Condition history (original → after each handoff)
- Reuse count + lifecycle timeline
- CO₂ saved + ₹ saved cumulative
- Full audit trail: every transaction, handoff, photo
- QR code display for sharing

### STEP 8: Marketplace Browse

**Page: `src/app/marketplace/page.tsx`**
- Toggle: Grid View (default) | Map View
- **Grid View:** Cards in responsive grid (3 cols desktop, 2 tablet, 1 mobile)
- **Map View:** Leaflet map with clustered markers, click marker → popup with material card
- **Filters sidebar:** Category checkboxes, Condition dropdown, Listing Type (donate/sell/exchange), Distance radius slider (10/25/50/100km), Weight range, Date posted, Availability (available / future)
- **Search bar** at top: full-text search across title + description + tags. Autocomplete suggestions as user types (match against existing material titles + tags).
- **"Materials Near You" section** (if user grants geolocation): horizontal scroll of materials within 10km, sorted by distance
- **"Recommended For You" section** (if logged in): based on user's past searches, saved items, request history. Show 4–6 cards. Logic: find materials matching categories the user has previously searched/saved/requested.
- **Sort:** Newest, Nearest, Most Impact, Highest RPS
- **Pagination:** Load more button or infinite scroll
- Each card shows: image, title, category badge, condition, distance from user, CO₂ impact preview, RPS badge, listing type tag (donate/sell/exchange), future availability date badge (if status=future)
- **Saved/Watchlist:** Heart icon on each card to save material. Saved materials stored in `saved_materials` table (table 21 in DB schema). When a saved material's status changes, a notification is sent to the user who saved it. API: `POST /api/saved-materials` to save, `DELETE /api/saved-materials/[materialId]` to unsave, `GET /api/saved-materials` to list user's saved materials.
- If search returns 0 results → show "No exact matches found" + trigger Predictive Supplier Discovery (Step 24) and show "We found potential suppliers who might have this" section

### STEP 8B: Material Detail Page

**Page: `src/app/materials/[id]/page.tsx`** — The most information-dense page. Shows everything about a material.

**Layout: Two-column on desktop (left = images + info, right = actions + sidebar), single column on mobile.**

**Left column:**
1. **Image Gallery** — Large main image + thumbnail strip. Click to enlarge. Swipeable on mobile.
2. **Title** — Large heading
3. **Status Badge** — Available (green) / Reserved (yellow) / Claimed (red) / Future (blue with available_from_date)
4. **Category Badge** with icon + **Condition Grade** (e.g. "Good" with color — green/yellow/orange/red)
5. **Condition Description** — Brief explanation of what "Good" means: "Minor wear, fully functional"
6. **Details Grid:**
   - Quantity: X pieces remaining
   - Weight: X kg (estimated if AI-detected)
   - Listing Type: Donate / Sell (₹X) / Exchange
   - Listed: date (relative, e.g. "3 days ago")
   - Location: City + area with small map preview
   - Views: X views
7. **Description** — Full text
8. **Tags** — Clickable tag chips
9. **AI Reuse Suggestions** — 3-5 use case cards: "Reinforcement in low-cost housing", "Garden trellis frames", etc.
10. **Material Router Flowchart** — Animated flowchart showing: Condition → Route (Reuse/Repair/Recycle/Dispose) with reason. Uses Framer Motion.
11. **Environmental Impact Card** — CO₂ saved + ₹ saved + water saved + landfill cost avoided + equivalencies ("= planting X trees")
12. **Material Decomposition Comparison** — "This material takes X years to decompose in landfill. By reusing, you give it Y more years of life."
13. **Reuse History** — If reuse_count > 0, show how many times this material has been redistributed. Link to DPP.

**Right column / sidebar:**
1. **Supplier Card** — Avatar, name, role, city, trust score badge, verification level badge, avg rating (stars), total transactions. Link to public profile.
2. **Reuse Potential Score (RPS)** — Large circular badge: score/100, color-coded (green 70+, yellow 40-69, red 0-39)
3. **"Request This Material" Button** (primary CTA, large) — Opens modal:
   - Quantity selector (1 to available quantity)
   - Message textarea ("Why do you need this?")
   - Preferred transport: Self Pickup / Need Delivery / Flexible
   - Submit → calls `POST /api/material-requests`
4. **Save/Watchlist Button** — Heart icon to save for later
5. **"⚠️ No Returns — Inspect before accepting"** banner — Links to FAQ explaining no-return policy
6. **QR Code** — Small QR code image linking to DPP. "Scan for Material Passport" text.
7. **Share Button** — Copy link to clipboard

**If status=future:** Show "Available from [date]" prominently. "Request This Material" button text changes to "Reserve This Material".

**If user is the supplier viewing their own listing:** Show "Edit Listing" and "Deactivate" buttons instead of "Request".

### STEP 9: Matching Engine

**File: `src/lib/matching-engine.ts`**

```typescript
function findTopMatches(materialId: number, maxRadius: number = 10): Match[] {
  // 1. Get material details
  // 2. Find open requests matching the category
  // 3. For each request, compute score:
  //    - keyword_score (0-30): overlap between material title/tags and request keywords
  //    - proximity_score (0-30): inverse of Haversine distance (closer = higher)
  //    - recency_score (0-20): newer requests score higher
  //    - trust_score (0-20): higher trust level of requester = higher score
  // 4. Sort by total score descending
  // 5. Return top 5 within radius
  // 6. If < 5 matches, expand to 25km, then 50km
  // 7. For each match, generate reason string:
  //    "Needs [material] for [purpose], [distance]km away, [trust_level] verified"
}
```

**Haversine function** — `src/lib/haversine.ts`:
```typescript
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Standard Haversine formula, returns km
}
```

**Industry Matching Profiles** — `src/lib/industry-profiles.ts`

Pre-built demand profiles for common business types. When a business/NGO registers, their org type is matched to a profile for tailored suggestions:
```typescript
const INDUSTRY_PROFILES: Record<string, string[]> = {
  'construction_company': ['timber', 'bricks', 'metal_beams', 'pipes', 'cement_bags', 'scaffolding'],
  'school': ['furniture', 'electronics', 'sports_equipment', 'stationery', 'textiles'],
  'restaurant': ['kitchen_equipment', 'furniture', 'packaging', 'electronics'],
  'office': ['furniture', 'electronics', 'stationery', 'packaging'],
  'manufacturing': ['industrial_surplus', 'metals', 'machinery_parts', 'packaging'],
  'ngo_shelter': ['furniture', 'textiles', 'electronics', 'construction'],
  'craft_workshop': ['wood', 'textiles', 'metals', 'packaging'],
};
// On marketplace page, if user.org_name matches a profile key, show "Recommended for your industry" section
// with materials matching that profile's categories
```

**Cross-Industry Symbiosis Suggestions** — `src/lib/symbiosis.ts`

One industry's waste is another's raw material. The Advisor Agent can explain these chains:
```typescript
const SYMBIOSIS_CHAINS = [
  { waste: 'coffee_grounds', from: 'Restaurants/Cafes', to: 'Mushroom farms', use: 'Substrate for mushroom farming' },
  { waste: 'sawdust', from: 'Carpentry/Woodwork', to: 'Particleboard manufacturers', use: 'Raw material for particleboard' },
  { waste: 'food_packaging', from: 'FMCG companies', to: 'Craft workshops', use: 'Art/craft raw material' },
  { waste: 'textile_scraps', from: 'Garment factories', to: 'Rag makers / Insulation', use: 'Stuffing, cleaning rags, insulation' },
  { waste: 'construction_rubble', from: 'Demolition sites', to: 'Road construction', use: 'Fill material for roads/foundations' },
  { waste: 'used_cooking_oil', from: 'Restaurants', to: 'Biodiesel producers', use: 'Biodiesel feedstock' },
];
// Show on material detail page: "Did you know? This material can also be used by [industry] for [use]."
// Advisor Agent uses this data when suggesting reuse ideas
```

### STEP 10: Transaction Flow + Messaging

**When is a Transaction created?** A transaction record is created automatically when a supplier ACCEPTS a direct request (Step 19). The `POST /api/material-requests/[id]` accept action creates the transaction with status=`negotiating`.

**Transaction Status Flow:**
`negotiating → scheduled → in_transit → delivered → confirmed`

**Transport Method Selection:** Immediately after transaction creation, the receiver is prompted to choose transport:
1. **Self Pickup** (`self_pickup`) — receiver goes to supplier location. Coordinate via in-app chat.
2. **Supplier Delivery** (`supplier_delivery`) — supplier delivers to receiver. Coordinate via in-app chat.
3. **Book Platform Transporter** (`platform_transporter`) — see Step 22 for full transport booking flow.

The chosen method is saved as `transport_method` on the transaction record.

**Page: `src/app/transactions/[id]/page.tsx`**
- Visual progress stepper at top showing current status (5 stages with colored dots)
- Material details card (thumbnail, title, category, quantity, condition)
- Both parties' info cards (supplier + receiver) with trust badges
- Transport method badge (Self Pickup / Supplier Delivery / Platform Transporter)
- If platform_transporter: show DeliveryTracker component (see Step 23) + transporter info card
- **Messages section:** In-app chat between supplier and receiver (poll every 5s or SSE)
  - Text input + send button + optional photo attachment
  - Messages stored in `messages` table linked to transaction
- **Action buttons (shown based on current status + user role):**
  - Supplier: "Schedule Pickup" → date picker + time window selector + confirm button
  - Transporter (if platform_transporter): status update buttons: "Material Collected" → "In Transit" → "Delivered"
  - Receiver: "Confirm Delivery" → upload pickup photo (required) → triggers Quality Agent (Step 13)
  - Both parties: "Confirm Completion" → triggers review prompt modal

**Review Form (shown as modal after both parties confirm completion):**
- **Form fields:**
  - Rating: 1-5 stars (required, clickable star selector)
  - Comment: textarea (optional, max 500 chars)
  - review_type: auto-set based on who is reviewing whom:
    - Receiver reviewing supplier → `supplier_review`
    - Supplier reviewing receiver → `receiver_review`
    - Receiver reviewing transporter → `transporter_review`
- **Submit button:** "Submit Review"
- **API call:** `POST /api/reviews` with body `{ transaction_id, reviewee_id, rating, comment, review_type }`
- After review: update reviewee's `avg_rating` and `total_ratings` in users table. Award green points if 5-star.

**Dispute Form (accessible from transaction page if status = delivered or confirmed, within 48 hours):**
- **"Report Issue" button** → opens modal:
  - Reason: textarea (required — describe the issue, e.g. "Material condition much worse than shown")
  - Evidence images: multi-file upload (required — at least 1 photo)
  - Submit button: "Raise Dispute"
- **API call:** `POST /api/disputes` with body `{ transaction_id, reason, evidence_images }`
- **On submit:** Creates dispute with status=`open`, notifies admin + other party

### STEP 11: India Sustainability Calculator

**File: `src/lib/sustainability-calc.ts`**

```typescript
function calculateImpact(categoryId: number, weightKg: number): Impact {
  // Get category from DB
  // co2_saved = weight_kg * category.co2_factor_kg
  // landfill_cost_saved = (weight_kg / 1000) * category.landfill_cost_inr_per_tonne
  // new_cost_saved = quantity * category.new_cost_inr_per_unit (or weight-based)
  // water_saved = weight_kg * category.water_factor_liters
  // equivalencies:
  //   trees_equivalent = co2_saved / 22  (1 tree absorbs ~22kg CO₂/year)
  //   households_powered = co2_saved / 500  (avg Indian household ~500kg CO₂/month)
  //   autorickshaws = co2_saved / 1200
  return { co2_saved, landfill_cost_saved, new_cost_saved, water_saved, equivalencies }
}
```

### STEP 12: Advisor Agent (Chat UI)

**File: `src/lib/agents/advisor.ts`**

Uses OpenAI function-calling. Define 8 tools:

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "search_materials",
      description: "Search marketplace for available materials",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          city: { type: "string" },
          radius_km: { type: "number" }
        }
      }
    }
  },
  // ... similar for all 8 tools
];
```

**System Prompt:**
```
You are ReCircle's AI Sustainability Advisor. You help users in India's circular economy marketplace.
You can search for materials, find matches, estimate environmental impact, suggest reuse ideas, and more.
Always provide specific, actionable advice. Use Indian context (₹ currency, Indian cities, local examples).
When estimating impact, always show both CO₂ AND ₹ (rupees) saved.
You also provide repair guides when asked — e.g., "How to fix a wobbly table", "How to refurbish old electronics",
"How to restore wooden furniture". Give step-by-step repair instructions with estimated cost and tools needed.
You understand cross-industry symbiosis — you can explain how one industry's waste becomes another's input.
```

**Repair Guide capability:** When a user asks about repairing a material (e.g., "How do I fix a wobbly table?"), the Advisor generates a step-by-step repair guide including: tools needed, estimated repair cost (₹), difficulty level (Easy/Medium/Hard), and a link to the nearest repair hub from the `repair_hubs` table. This is also accessible from the Repair Hubs page via the "Ask AI" button.

**Chat API: `POST /api/chat`**
1. Receive user message + user context (location, role)
2. Load chat history from DB
3. Call OpenAI with messages + tools
4. If tool_calls returned → execute each tool → send results back → get final response
5. Save to chat_history
6. Log to agent_logs with agent_name='advisor'
7. Return response + tool calls made (for activity log)

**Component: `src/components/chat-panel.tsx`**
- Floating button (bottom-right) → opens slide-out panel from right
- Chat messages with user/assistant bubbles
- Shows tool calls being made (loading states)
- Typing indicator while AI responds
- Persists across page navigation

### STEP 13: Quality Verification Agent

**File: `src/lib/agents/quality.ts`**

```typescript
async function verifyQuality(transactionId: number, pickupPhotoUrl: string) {
  // 1. Get transaction + original material
  // 2. Get listing image URL
  // 3. Call OpenAI Vision API with BOTH images:
  //    Prompt: "Compare these two images of materials. Image 1 is the original listing photo. 
  //    Image 2 is a photo taken at pickup/delivery.
  //    Return JSON: { match_score: 1-10, same_material: true/false, condition_comparison: string, flags: string[] }"
  // 4. Parse response
  // 5. Store quality_match_score on transaction
  // 6. If score < 5 → create dispute, reduce supplier trust_score
  // 7. If score >= 8 → increase supplier trust_score by 2
  // 8. Log to agent_logs with agent_name='quality'
  // 9. Create notification for both parties with result
}
```

**Trigger:** Called from `POST /api/transactions/[id]/verify` when receiver uploads pickup photo.

### STEP 14: Sentinel Agent (Fraud Detection)

**File: `src/lib/agents/sentinel.ts`**

```typescript
async function computeFraudRisk(material: Material, user: User): Promise<FraudResult> {
  let riskScore = 0;
  const reasons: string[] = [];

  // Rule 1: New account (< 24hrs old)
  const accountAge = Date.now() - new Date(user.created_at).getTime();
  if (accountAge < 24 * 60 * 60 * 1000) {
    riskScore += 30;
    reasons.push('Account created less than 24 hours ago');
  }

  // Rule 2: Bulk listings (>10 in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.material.count({
    where: { user_id: user.id, created_at: { gte: oneHourAgo } }
  });
  if (recentCount > 10) {
    riskScore += 25;
    reasons.push(`${recentCount} listings in the last hour`);
  }

  // Rule 3: Suspiciously low price
  const avgResult = await prisma.material.aggregate({
    where: { category_id: material.category_id, price: { gt: 0 } },
    _avg: { price: true }
  });
  if (material.price > 0 && avgResult._avg.price && material.price < avgResult._avg.price * 0.1) {
    riskScore += 20;
    reasons.push('Price is less than 10% of category average');
  }

  // Rule 4: Location mismatch
  if (material.city && user.city && material.city !== user.city) {
    riskScore += 15;
    reasons.push('Listed location differs from account city');
  }

  // Rule 5: Duplicate images (check against other listings)
  // Rule 6: Copy-pasted description (check if identical description exists)

  // Determine action
  let action = 'none';
  if (riskScore > 60) action = 'auto_hide';
  else if (riskScore > 30) action = 'hold_for_review';

  return { riskScore, reasons, action };
}
```

**Integration:** Called inside `POST /api/materials` before returning. If action is 'hold_for_review' or 'auto_hide', insert into `fraud_flags` table and notify admin.

**Admin page: `src/app/admin/flagged/page.tsx`**
- Table of flagged listings with: material info, risk score, reasons, date
- Actions: Approve (clear flag), Reject (archive listing), Ban user

### STEP 15: Demand Forecasting

**File: `src/lib/demand-forecast.ts`**

```typescript
// Seasonal multipliers (India-specific)
const SEASONAL_MULTIPLIERS = {
  construction: { 1: 1.3, 2: 1.3, 3: 1.2, 4: 0.8, 5: 0.6, 6: 0.5, 7: 0.5, 8: 0.6, 9: 0.8, 10: 1.2, 11: 1.4, 12: 1.3 },
  furniture:    { 1: 0.8, 2: 0.8, 3: 0.9, 4: 1.0, 5: 1.3, 6: 1.4, 7: 1.3, 8: 0.9, 9: 0.8, 10: 0.9, 11: 0.8, 12: 0.7 },
  electronics:  { 1: 0.7, 2: 0.7, 3: 0.8, 4: 0.8, 5: 0.9, 6: 0.9, 7: 0.9, 8: 1.0, 9: 1.1, 10: 1.5, 11: 1.4, 12: 0.8 },
  packaging:    { 1: 0.7, 2: 0.7, 3: 0.8, 4: 0.8, 5: 0.9, 6: 0.9, 7: 1.0, 8: 1.1, 9: 1.3, 10: 1.4, 11: 1.3, 12: 0.8 },
  // ... etc for each category
};

function forecastDemand(categorySlug: string, city: string, targetMonth: number, targetYear: number) {
  // 1. Get last 12 weeks of demand_history for this category + city
  // 2. Compute 12-week moving average
  // 3. Apply seasonal multiplier for target month
  // 4. Apply city growth factor (Mumbai=1.2, Delhi=1.15, Bangalore=1.1, others=1.0)
  // 5. Return: { predicted_demand, trend ('rising'|'falling'|'stable'), percentage_change, season_label }
}
```

Seed `demand_history` with 6 months of data matching these seasonal patterns + random noise.

**Proactive Alerts (Scout Agent integration):**
When `forecastDemand` returns a `trend` of `'rising'` with `percentage_change > 20%`, the Scout Agent generates a proactive notification to suppliers who have previously listed materials in that category:
- Notification: "Good time to list steel — demand is trending up 35% in your area this month."
- These appear as notifications (Step 27B) and optionally on the supplier dashboard (Step 3E).
- API: `GET /api/dashboard/proactive-alerts?user_id=X` — returns personalized alerts based on user's past listing categories + current demand trends in their city.

### STEP 16: Impact Dashboard

**Page: `src/app/dashboard/page.tsx`**

Sections (top to bottom):
1. **Animated Hero Stats** — 4 big numbers with counting animation:
   - Total Materials Listed | Total Exchanges | kg Diverted | CO₂ Saved
2. **Bar Chart** — Materials by category (monthly)
3. **Pie Chart** — Material types distribution
4. **Area Chart** — Cumulative waste diverted over time
5. **Demand Forecast Chart** — Line chart with solid (actual) + dashed (predicted) lines
6. **Platform Growth Chart** — Line chart showing new users + new listings per week (two lines on same chart). Shows platform adoption trend.
7. **Waste Heatmap** — Leaflet map with colored circles for material density
8. **Agent Activity Log** — Collapsible panel showing recent agent actions
9. **Leaderboard** — Top contributors
10. **Time Range Filter** — 7d / 30d / 90d / All time
11. **"Export CSV" button** — Downloads all visible dashboard data as a CSV file (summary stats, category breakdown, monthly data)

### STEP 17: Trust System

**File: `src/lib/trust-score.ts`**

```typescript
function computeTrustScore(userId: number): number {
  let score = 0;
  // Profile completeness: +10 if name, bio, avatar all filled
  // Phone verified: +8, Email verified: +7
  // Govt ID uploaded: +20
  // Transaction history: +5 per completed transaction (max 25)
  // Ratings: avg_rating * 6 (max 30)
  return Math.min(score, 100);
}

function determineVerificationLevel(user): string {
  if (user.total_ratings >= 5 && user.avg_rating >= 4) return 'trusted';
  if (user.id_verified) return 'verified';
  if (user.phone && user.email) return 'basic';
  return 'unverified';
}
```

### STEP 18: Gamification

**File: `src/lib/green-points.ts`**

Point awards (call after each action):
- List a material: +10 GP
- Complete an exchange: +50 GP
- 5-star review received: +20 GP
- Volunteer delivery: +30 GP
- First listing badge: +15 GP
- Complete a transport delivery (transporter): +25 GP
- Accept a direct request (supplier): +15 GP
- Post a want request: +5 GP

Level thresholds:
- Seedling: 0-99 GP
- Sprout: 100-499 GP
- Sapling: 500-1499 GP
- Tree: 1500-4999 GP
- Forest: 5000+ GP

Check badge eligibility after each GP update.

### STEP 19: Direct Material Request System

**How it works:** A receiver browses the marketplace, finds a listing they want, and sends a direct request to the supplier. The supplier can accept or reject. This is like placing an order on a specific listing.

**API: `POST /api/material-requests`** — Create a direct request
- Body: `{ material_id, quantity_requested, message, preferred_transport }`
- Validate: material exists, is available, quantity_requested <= material.quantity
- Insert into `direct_requests` table with status=pending
- Send notification to supplier
- Return created request

**Direct Request Status Flow:** `pending → accepted → in_progress → completed` (or `pending → rejected`)
- **pending** — receiver has submitted, waiting for supplier response
- **accepted** — supplier approved, transaction created (Step 10)
- **in_progress** — transaction is active (transport selected, pickup scheduled, etc.)
- **completed** — transaction fully confirmed by both parties
- **rejected** — supplier declined the request

**API: `PUT /api/material-requests/[id]`** — Supplier responds
- Body: `{ action: 'accept' | 'reject', response_message }`
- If accept:
  1. Update direct_request status to `accepted`, set `responded_at`
  2. **Create a new transaction record** (Step 10) with: material_id, supplier_id=material.user_id, receiver_id=request.receiver_id, quantity=request.quantity_requested, status=`negotiating`
  3. Reduce material quantity by quantity_requested
  4. If material quantity reaches 0 → auto-set material status to `claimed` (NOT archived — see Step 27)
  5. Send notification to receiver: "Your request was accepted!"
  6. When transaction moves to `scheduled` or `in_transit` → update direct_request status to `in_progress`
  7. When transaction status becomes `confirmed` → update direct_request status to `completed`
- If reject: update status to `rejected`, set response_message, notify receiver

**Page: `src/app/materials/[id]/page.tsx`** — Add "Request This Material" button
- Opens modal with: quantity selector (max = available), message textarea, transport preference (Self Pickup / Need Delivery / Flexible)
- Shows supplier info, material condition, estimated cost

**Page: `src/app/my-requests/page.tsx`** — My Requests dashboard
- Two tabs: "Sent Requests" (as receiver) and "Received Requests" (as supplier)
- Each request card shows: material thumbnail, title, quantity, status badge, message preview, date
- Supplier can Accept/Reject from this page

### STEP 20: Want Board (Public Material Requests)

**How it works:** A receiver posts a public "Want" request describing what material they need. The system matches it against available listings and notifies potential suppliers. Other users can browse the want board and offer their materials.

**API: `POST /api/want-requests`** — Post a want request
- Body: `{ title, description, category_id, keywords, quantity_needed, location_lat, location_lng, radius_km, urgency }`
- Insert into `want_requests` table
- Trigger matching engine to find existing materials matching this request
- Send notifications to matched suppliers

**API: `GET /api/want-requests`** — Browse want board
- Query params: category, city, urgency, status
- Returns paginated list of open want requests

**Page: `src/app/want-board/page.tsx`** — Public Want Board
- Grid of want request cards with: title, category badge, quantity needed, urgency indicator (Low=gray, Medium=yellow, High=red), location, date posted, poster avatar + name
- Filter by: category, city, urgency
- "I Have This" button → links supplier to create a listing (pre-filled with request info) or offer existing listing
- "Post a Want Request" button → navigates to `/want-board/new`

**Page: `src/app/want-board/new/page.tsx`** — Create Want Request form
- Fields: Title (required), Description, Category (dropdown), Keywords (comma-separated), Quantity Needed (number), Location (city dropdown + optional lat/lng), Search Radius (km — slider: 10/25/50/100), Urgency (Low/Medium/High)
- After submit: system triggers matching engine → if matches found, shows "We found X materials matching your request" + triggers notifications to matched suppliers

### STEP 20B: Future Availability & Reservations

**How it works:** Suppliers can list materials that are NOT available now but will be in the future. Receivers can reserve them.

**Supplier flow:**
1. When creating a listing (Step 4), supplier sets "Available From Date" → date picker
2. Status is automatically set to "future" instead of "available"
3. Listing appears on marketplace with a blue "Future" badge + date: "Available from March 18"
4. When the date arrives, status auto-transitions to "available" (via a cron job or check-on-access pattern)

**Receiver flow:**
1. Receiver sees a "future" listing on marketplace
2. Instead of "Request This Material", button says "Reserve This Material"
3. Receiver submits a reservation (same as direct request but with status=pending until available_from_date)
4. When the material becomes available, the reservation auto-converts to an active direct request
5. Supplier is notified: "Your listing [title] is now available. You have X pending reservations."

**Implementation:**
- `POST /api/materials` — if `available_from_date` is set and is in the future, set status to "future"
- `GET /api/materials` — include future listings in results but clearly marked
- Background check (on page load or via API middleware): if material.status === 'future' AND available_from_date <= now → update status to 'available', notify reservers
- Reservations use the same `direct_requests` table with a note that it's a reservation

### STEP 21: Transporter Registration & Profile

**Who is a Transporter?** A user with role=`transporter` or role=`volunteer` who has registered their vehicle. They earn money (or green points for volunteers) by delivering materials between suppliers and receivers. Both roles redirect to this page after registration (see Step 3 auth flow).

**Page: `src/app/transporters/register/page.tsx`** — Transporter Vehicle Registration
- Form fields:
  - Vehicle type — dropdown: Mini Truck / Pickup Van / Tempo / Auto Rickshaw / Bike / Other
  - Vehicle capacity (kg) — number input
  - Vehicle capacity (cubic meters) — number input (optional)
  - Vehicle photo — image upload
  - Service area city — dropdown (same city list as registration)
  - Service radius (km) — slider: 5/10/25/50/100
  - Price per km (₹) — number input
  - Base rate (₹) — number input (minimum charge per delivery)
  - Is volunteer? — checkbox (auto-checked and disabled if user role=`volunteer`; if role=`transporter`, user can check to opt-in to volunteer deliveries)
- On submit: create `transporters` record linked to user via user_id. If is_volunteer=true, set price_per_km=0 and base_rate=0 automatically.

**Page: `src/app/transporters/dashboard/page.tsx`** — Transporter Dashboard
- Stats: total deliveries, earnings this month, avg rating, active bookings
- Toggle: availability status (Available / Busy / Offline)
- List of current bookings with status
- Earnings history chart

**API: `GET /api/transporters`** — Search available transporters
- Query params: city, min_capacity_kg, max_price_per_km, vehicle_type
- Returns transporters with availability_status=available, sorted by rating

### STEP 22: Transport Booking System

**How it works:** When a transaction is created (after a direct request is accepted or a match is confirmed), the receiver chooses a transport method:
1. **Self Pickup** — receiver picks up from supplier address. No booking needed.
2. **Supplier Delivery** — supplier delivers to receiver. No platform booking needed.
3. **Book Platform Transporter** — receiver books a transporter through the platform.

**File: `src/lib/transporter-matcher.ts`** — Nearby Transporter Matching
```typescript
async function findNearbyTransporters(pickupLat: number, pickupLng: number, weightKg: number, city: string) {
  // 1. Get all transporters in the same city with availability_status='available'
  // 2. Filter by vehicle_capacity_kg >= weightKg
  // 3. Calculate distance from transporter's service area center to pickup location using Haversine
  // 4. Filter by distance <= service_radius_km
  // 5. Sort by: distance (30%), price_per_km (30%), avg_rating (40%)
  // 6. Return top 5 with estimated cost for each
}
```

**File: `src/lib/cost-estimator.ts`** — Delivery Cost Estimator
```typescript
function estimateDeliveryCost(transporter: Transporter, distanceKm: number): CostEstimate {
  // cost = base_rate + (distance_km * price_per_km)
  // If distance > 50km, add 10% surcharge
  // If weight > 500kg, add 15% heavy load surcharge
  // Return: { base_rate, distance_charge, surcharges, total_estimated_cost, currency: 'INR' }
}
```

**Route Optimization Preview:**
- Show Leaflet map with two markers: pickup location (green marker) and delivery location (red marker)
- Draw straight-line between them + display distance (Haversine)
- Show estimated travel time: `distance_km / 30` (assuming 30 km/h city average)
- Receiver can see the route before confirming the booking

**API: `POST /api/transport-bookings`** — Book a transporter
- Body: `{ transaction_id, transporter_id, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, scheduled_date, notes }`
- Calculate distance using Haversine
- Calculate estimated_cost using cost estimator
- Create `transport_bookings` record with status=requested
- Notify transporter

**API: `PATCH /api/transport-bookings/[id]`** — Update booking status
- Transporter actions: accept (→accepted), schedule pickup (→pickup_scheduled), collect (→collected), deliver (→delivered)
- Receiver action: confirm delivery (→completed), rate transporter
- Cancel: either party can cancel if status < collected

**Component: `src/components/transport-option-picker.tsx`**
- 3 cards: Self Pickup / Supplier Delivery / Book Transporter
- If "Book Transporter" selected: shows nearby transporter list, each with: name, vehicle type, rating, estimated cost
- Select transporter → confirm booking

**Component: `src/components/cost-estimator.tsx`**
- Shows breakdown: Base Rate ₹X + Distance (Y km × ₹Z/km) = ₹Total
- Shows any surcharges
- Updates live as user selects different transporters

### STEP 23: Delivery Tracking

**Delivery Status Flow (5 stages):**
`pickup_scheduled → collected → in_transit → delivered → completed`

**Component: `src/components/delivery-tracker.tsx`**
- Visual progress stepper with 5 dots connected by lines
- Each dot: grey (pending), blue (current), green (done)
- Below each dot: status label + timestamp when reached
- Current status shows: transporter name, vehicle type, estimated arrival
- Live updates via polling (every 10 seconds) or SSE

**Page: `src/app/transactions/[id]/page.tsx`** — Update to include delivery tracking
- If transport_method = 'platform_transporter': show DeliveryTracker component
- Show transporter info card: name, phone, vehicle type, rating
- Transporter can update status from their dashboard
- Receiver sees real-time status updates

### STEP 24: Predictive Supplier Discovery

**How it works:** When a receiver searches for a material that doesn't exist on the marketplace, the system suggests potential suppliers who are likely to have that material based on their history, category, location, and role.

**File: `src/lib/supplier-discovery.ts`**
```typescript
async function discoverPotentialSuppliers(query: string, categoryId: number, city: string): Promise<PotentialSupplier[]> {
  // 1. Search materials table for similar past listings (even archived ones)
  // 2. Find users who have listed materials in the same category before
  // 3. Filter by city or nearby cities (within 50km)
  // 4. Score each potential supplier:
  //    - past_listing_count (in category): 30%
  //    - avg_rating: 25%
  //    - trust_score: 25%
  //    - proximity: 20%
  // 5. Return top 10 with: user info, past listing summary, likelihood score, suggested contact message
}
```

**API: `GET /api/supplier-discovery`** — Query params: query, category_id, city
- Returns list of potential suppliers who might have the material
- Each result includes: user profile, number of past listings in category, avg rating, distance, suggested outreach message

**API: `POST /api/supplier-discovery/trigger`** — Trigger discovery for unmatched want requests
- Called automatically when a want_request has no matches after 24 hours
- Or manually by admin for specific requests
- Finds potential suppliers, sends notifications

**API: `POST /api/supplier-discovery/respond`** — Supplier responds to discovery notification
- Body: `{ notification_id, response: 'available_now' | 'available_later' | 'not_available', available_date? }`
- If "available_now" → redirect to create listing page, pre-filled from request data
- If "available_later" → create future availability listing with the date (status=future, available_from_date set)
- If "not_available" → mark notification as resolved, won't ask again for this request
- Notify original requester when a supplier responds positively

**UI Integration:**
- On marketplace search: if 0 results found, show "No exact matches, but we found potential suppliers" section
- On want board: after posting a want request, show discovered suppliers with "Contact" button
- On supplier dashboard (Step 3E, Tab 3): supplier sees discovery notifications and responds

### STEP 25: No-Return Policy & Transparency Features

**Policy:** All materials are sold/donated AS-IS. No returns accepted. This is realistic for a reused materials marketplace.

**Transparency compensations:**
1. **Detailed condition grading** — 5 levels (New, Like New, Good, Fair, Salvage) with descriptions shown on every listing
2. **Multiple photos required** — Minimum 2 photos for listing creation. AI detects if photos are stock/fake.
3. **AI Quality Verification** — Quality Agent compares listing photo with pickup photo (Step 13)
4. **Trust Score visible** — Every user's trust score + verification level shown on their profile and listings
5. **On-Site Inspection option** — For high-value materials (>₹5000), receiver can request an on-site inspection before accepting. Status flow: inspection_requested → inspector_assigned → inspection_completed → report_shared → proceed/cancel
6. **Dispute resolution** — Even without returns, receivers can raise disputes within 48 hours of delivery. Admin reviews evidence (photos, messages) and can: issue partial refund, reduce supplier trust score, ban repeat offenders.
7. **Material Passport** — QR-scannable full history (Step 7) so receiver knows exactly what they're getting

**UI:** Show "No Returns — Inspect before accepting" banner on every listing detail page. Link to FAQ explaining the policy.

### STEP 26: FAQ / Help Page

**Page: `src/app/faq/page.tsx`**
- Accordion-style FAQ sections:
  - **General:** What is ReCircle? How does it work? Is it free?
  - **For Suppliers:** How to list materials? What conditions are accepted? How to set pricing?
  - **For Receivers:** How to find materials? How to request materials? What is the no-return policy?
  - **For Transporters:** How to register as a transporter? How are earnings calculated? How to update availability?
  - **Trust & Safety:** What is trust score? How does verification work? How to report fraud? Dispute resolution process?
  - **AI Features:** What do the AI agents do? How does quality verification work? How does demand forecasting help?
  - **Green Points:** How to earn points? What are the levels? What do badges mean?
- Each FAQ item: question (clickable) → expands to show answer with relevant links
- Search bar at top to filter FAQs
- "Still need help?" section with contact form

### STEP 27: Auto-Unavailable on Quantity Zero

**Logic:** Whenever a material's quantity is reduced (via direct request acceptance or transaction confirmation):
1. Check if remaining quantity = 0
2. If yes → automatically set material status to **`claimed`** (NOT `archived` — `archived` is for manual deactivation by supplier)
3. Listing is removed from marketplace search results (filter out status=`claimed` in `GET /api/materials`)
4. Notify supplier: "Your listing [title] is now fully claimed — all units taken"
5. Any pending direct_requests for this material with status=pending → auto-reject with message "Material no longer available"

**Implementation:** Add this check in:
- `PUT /api/material-requests/[id]` (when accepting a direct request — this is the most common trigger)
- `PUT /api/transactions/[id]` (when confirming a transaction)
- `PUT /api/materials/[id]` (manual quantity update by supplier)

### STEP 27B: Notifications System

**How notifications work:** SSE (Server-Sent Events) for real-time + database storage for persistence.

**API: `GET /api/notifications`** — Get user's notifications
- Query params: unread_only, limit, offset
- Returns paginated list of notifications for the authenticated user

**API: `GET /api/notifications/stream`** — SSE stream for real-time notifications
```typescript
// Server-Sent Events endpoint
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Poll DB every 5 seconds for new unread notifications
      // Send as SSE: data: {"type":"new_match","title":"New match found!",...}
      // Client listens with EventSource
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

**API: `PATCH /api/notifications/[id]`** — Mark notification as read
**API: `PATCH /api/notifications/mark-all-read`** — Mark all as read

**Component: `src/components/notification-bell.tsx`**
- Bell icon in navbar with unread count badge (red circle with number)
- Click → dropdown showing recent notifications
- Each notification: icon (type-based), title, body preview, timestamp, read/unread indicator
- Click notification → navigate to relevant page (e.g. transaction, listing, request)
- "Mark all as read" link at bottom

**What triggers notifications (insert into notifications table + push via SSE):**
- New match found for your listing (Scout Agent match)
- Someone requested your material (direct request received)
- Your request was accepted/rejected by supplier
- Transaction status changed (scheduled, in transit, delivered, etc.)
- Transport booking status changed (accepted, collected, delivered)
- Quality verification result (match score)
- Dispute opened/resolved
- Badge earned / level up
- Predictive Supplier Discovery notification ("Someone near you needs X")
- Want request match found
- Material you saved/watchlisted changed status
- Future material you reserved is now available

### STEP 28: Admin Panel Enhancements

**Page: `src/app/admin/users/page.tsx`** — User Management
- Table of all users with: name, email, role, city, trust score, verification level, date joined
- Filter by role, city, verification level
- Actions: View profile, Edit role, Verify user, Ban user
- Stats at top: total users by role, new users this week

**Page: `src/app/admin/transporters/page.tsx`** — Transporter Management
- Table of transporters with: name, vehicle type, capacity, city, rating, total deliveries, status
- Actions: Approve transporter, Suspend, View booking history

### STEP 28B: Admin Disputes Page

**Page: `src/app/admin/disputes/page.tsx`** — Dispute Resolution Panel
- **Stats at top:** Open disputes | Under review | Resolved this week
- **Table of disputes:** Each row shows:
  - Dispute ID, Transaction ID (clickable link)
  - Raised by: user name + role + trust badge
  - Against: user name + role + trust badge
  - Reason (truncated, click to expand)
  - Evidence images (thumbnail gallery, click to enlarge)
  - Status badge: Open (red) / Reviewing (yellow) / Resolved (green)
  - Date raised
- **Actions per dispute:**
  - "Review" button → opens detail panel showing: full reason, all evidence photos, transaction details, both users' profiles + ratings, chat history from that transaction
  - "Resolve" button → modal with: Resolution textarea (required), Action dropdown: Warn Supplier / Reduce Trust Score / Ban User / No Action, Submit button
- **Filter by:** status (open/reviewing/resolved), date range

### STEP 28C: Admin Overview Page

**Page: `src/app/admin/page.tsx`** — Admin Home Dashboard
- **Stats cards row:** Total users | Total active listings | Total transactions | Total CO₂ saved | Open disputes | Flagged listings
- **Recent Activity feed:** Last 10 actions on platform (new listings, transactions, disputes, flags) with timestamps
- **Quick links:** Manage Users | Review Flagged | Resolve Disputes | View Impact Dashboard
- **Platform health indicators:** New users this week, listings this week, transactions this week (with % change vs last week)

### STEP 29: Remaining Pages UI Specifications

**Page: `src/app/leaderboard/page.tsx`** — Gamification Leaderboard
- **Toggle tabs:** Weekly | Monthly | All Time
- **Leaderboard table:** Rank (#), Avatar, Name, Role badge, Green Points, Level badge (Seedling/Sprout/etc.), kg Diverted, CO₂ Saved, Number of badges
- **Top 3 highlighted** with gold/silver/bronze styling and larger avatars
- **"Your Rank" card** (sticky at bottom if user is logged in): shows user's current rank, GP, level, next level threshold
- **Category leaderboards dropdown:** Top Suppliers (most material listed) | Top Receivers (most material reused) | Top Couriers (most deliveries) | Top Impact (highest CO₂ saved)

**Page: `src/app/repair-hubs/page.tsx`** — Community Repair Hub Map
- **Full-width Leaflet map** with markers for each repair_hub from DB
- **Marker popup:** Hub name, type (Workshop/Makerspace/Event), address, hours, website link, categories served
- **Sidebar list** (left side): scrollable list of repair hubs, each showing: name, type badge, distance from user, categories (tag chips)
- **Filter bar at top:** Category dropdown (filter hubs by what they repair), City dropdown, Type dropdown (Workshop/Makerspace/Event)
- **"Don't discard it, repair it!"** banner at top with brief explanation
- **Each hub card has:** "Get Directions" button (opens Google Maps), "Ask AI" button (opens Advisor chat with pre-filled "How do I repair [material] near [location]?")

**Page: `src/app/transactions/page.tsx`** — My Transactions List
- **Tab toggle:** As Supplier | As Receiver | As Transporter (tabs shown based on user's activity)
- **Each transaction card shows:**
  - Material thumbnail + title
  - Other party: avatar + name + trust badge
  - Quantity + transport method badge (Self Pickup / Delivery / Transporter)
  - Status badge with color: Negotiating (gray) / Scheduled (blue) / In Transit (orange) / Delivered (purple) / Confirmed (green) / Cancelled (red)
  - Date (relative: "2 days ago")
  - "View Details" button → navigates to `/transactions/[id]`
- **Filter by:** status, date range
- **Sort by:** newest, oldest, status

**Page: `src/app/dashboard/my-impact/page.tsx`** — Personal Sustainability Profile
- **Hero stat cards (4):** Total kg Diverted | Total CO₂ Saved | Total ₹ Saved | Total Transactions
- **Equivalency translations section:** "Your impact = planting X trees / powering X households / saving ₹X in new costs"
- **Impact by category:** Pie chart showing breakdown of materials by category
- **Monthly trend:** Line chart showing user's monthly impact over time (kg diverted per month)
- **Materials donated vs received:** Bar chart comparing the two
- **Badges earned:** Grid of badge icons with names. Earned ones in color, unearned ones grayed out with requirement shown on hover
- **Green Points + Level display:** Current GP, current level, progress bar to next level (e.g., "320/500 GP to reach Sapling")
- **"Share My Impact" button** → generates shareable image/card with user's impact stats

**Page: `src/app/dashboard/demand-forecast/page.tsx`** — Demand Prediction
- **City selector dropdown** at top (default: user's city)
- **Category tabs:** All | Construction | Furniture | Electronics | etc.
- **Main chart:** Recharts line chart with:
  - Solid line = actual demand (past 6 months from demand_history)
  - Dashed line = predicted demand (next 3 months from forecast engine)
  - X-axis: months, Y-axis: listing/transaction count
- **Insight cards below chart:** For each category:
  - "Steel demand in Mumbai: Rising ↑ 35% — Construction season (Oct–Mar)"
  - Trend arrow (green up / red down / gray stable)
  - Season label: "Building Season", "Festive Season", "Off-Season", etc.
- **"Best Time to List" recommendation:** "List your construction materials NOW — demand peaks this month"
- **API:** `GET /api/dashboard/forecast?city=mumbai&category=construction`

**Page: `src/app/transporters/page.tsx`** — Browse Transporters (for receivers)
- **Search/filter bar:** City dropdown, Vehicle type dropdown, Max price per km slider, Min capacity slider
- **Transporter cards grid:** Each card shows:
  - Avatar + name + "Volunteer" tag if is_volunteer=true
  - Vehicle type badge + vehicle photo
  - Capacity: X kg / X cbm
  - Price: ₹X base + ₹Y/km (or "FREE — Volunteer" if is_volunteer)
  - Service area: city + radius
  - Rating: X.X★ (Y reviews)
  - Availability badge: Available (green) / Busy (yellow) / Offline (gray)
  - Total deliveries count
- **Sort by:** Nearest, Cheapest, Highest rated, Most deliveries
- This page is for browsing only. Actual booking happens from within a transaction (Step 22)

### STEP 29B: ESG Report Generator

**API: `GET /api/reports/esg?user_id=X`** — Generate ESG data
- Returns JSON with: total_materials_redistributed, kg_diverted, co2_saved, rupees_saved, water_saved, communities_impacted (distinct receiver cities), organizations_served (distinct receiver org_names), scope3_carbon_data, monthly_breakdown

**Page (print-friendly):** Rendered via a dedicated page or modal with:
- ReCircle branding header with logo
- Company name + date range
- Summary stats: Materials redistributed, kg diverted, CO₂ saved, ₹ saved
- Category breakdown table
- Monthly trend chart
- Equivalencies: trees planted, households powered
- **"Download as PDF" button** (uses `window.print()` with `@media print` CSS styling)
- **"Export CSV" button** for raw data download

### STEP 29C: Material Flow Sankey Diagram

**Component: `src/components/sankey-diagram.tsx`**
- Uses `d3-sankey` or custom SVG with Framer Motion animations
- **Left column (Sources):** Individuals, Businesses, NGOs — width proportional to materials listed
- **Middle column (Categories):** Construction, Furniture, Electronics, etc.
- **Right column (Destinations):** Reuse, Repair, Recycle, Dispose — based on material router decisions
- **Flow lines** colored by category, width proportional to quantity
- **Hover on any flow:** shows tooltip with count + kg + CO₂ saved
- Shown on the main Impact Dashboard (Step 16)

### STEP 30: Polish
- Framer Motion: page transitions, card hover effects, counter animations, flowchart animations
- Responsive: test all pages on mobile/tablet breakpoints
- Loading states: skeleton loaders on all data-fetching pages
- Error handling: toast notifications for errors
- Demo seed data: make sure the seeded data tells a compelling story

---

## Environment Variables

```
DATABASE_URL="postgresql://...@...neon.tech/recircle?sslmode=require"  # Neon DB PostgreSQL 16.x connection string
OPENAI_API_KEY=sk-...          # Required for AI features
NEXTAUTH_SECRET=...            # Any random string
NEXTAUTH_URL=http://localhost:3000
```

---

## How to Run

```bash
cd recircle
npx prisma migrate dev --name init    # Create tables on Neon DB
npx prisma db seed                     # Seed with demo data
npm run dev                            # Start dev server
```

Visit `http://localhost:3000`.

### Demo Accounts (seeded)
- Admin: admin@recircle.in / admin123
- Business (Supplier): rahul@buildcorp.in / password123
- Individual (Supplier): priya@gmail.com / password123
- NGO (Receiver): contact@habitatindia.org / password123
- Volunteer Courier: amit@gmail.com / password123
- Transporter: deepak@transport.in / password123

---

## Key Design Decisions

1. **Prisma + Neon PostgreSQL 16.x** — Type-safe ORM with serverless Postgres. Neon gives free tier, instant branching, and zero-config connection. Using version 16.x (NOT 17) for stability.
2. **OpenAI function-calling over LangChain** — Simpler, more reliable, less abstraction.
3. **SSE over WebSockets** — Simpler for notifications, works with Next.js API routes.
4. **Seed data over empty DB** — Judges need to see a populated, realistic-looking platform.
5. **India-first data** — ₹ currency, Indian cities, CPCB CO₂ factors, Aadhaar/PAN for verification. This shows judges we understand the market.
6. **4 AI agents visible to user** — The Agent Activity Log is a demo showstopper. Judges see multiple AI agents working in parallel.
7. **5 distinct user roles** — Supplier, Receiver, Transporter, Volunteer, Admin — each with tailored dashboard and permissions.
8. **Full transport marketplace** — Not just volunteer couriers — a proper transporter marketplace with booking, cost estimation, and delivery tracking.
9. **Direct requests + Want board** — Two request systems: direct request on a specific listing (like an order) + public Want board (like a classifieds ad).
10. **No-return policy with transparency** — Realistic for reused materials. Compensated with AI quality verification, inspections, condition grading, and dispute resolution.

---

## What Makes This Win

1. **AI Depth:** Not just a chatbot — 4 specialized agents (Scout, Advisor, Quality, Sentinel) + photo detection + NLP parsing + demand forecasting + material routing + predictive supplier discovery. That's 9 distinct AI/ML features.
2. **India Relevance:** ₹ savings alongside CO₂, Indian seasonal patterns, trust system for Indian market, real CPCB emission data, Indian city coverage.
3. **Visual Impact:** Animated dashboard, Sankey diagram, map heatmap, agent activity log, QR codes, flowcharts, delivery tracking with live status.
4. **Full Marketplace Ecosystem:** Not just listings — direct requests, want board, transport booking with cost estimation, delivery tracking, dispute resolution. A complete circular economy loop.
5. **5 User Roles:** Supplier, Receiver, Transporter, Volunteer Courier, Admin — each with tailored dashboard, permissions, and workflows.
6. **Transport Marketplace:** Nearby transporter matching, cost estimation (base rate + distance × price/km), delivery tracking (5-stage), transporter ratings — solves the "last mile" problem for material reuse.
7. **Trust & Safety:** Trust scoring, verification levels, fraud detection agent, quality verification (AI photo comparison), no-return policy with transparency features, dispute resolution.
8. **Beyond Requirements:** Predictive supplier discovery, future availability matching, gamification (green points + badges + levels), repair hub map, ESG reports, FAQ system — each one could be its own feature.
9. **Working Demo:** Rich seed data (50+ materials, 12+ users across all roles, 3 transporters, sample transactions, reviews, and demand history) means judges see a fully populated platform from the first click.
