# AI-Powered Bargaining System — ReCircle

## Status: Phase 1 MVP — ✅ IMPLEMENTED

---

## What Was Built (Phase 1 — Complete)

### Files Created / Modified

| File | Status | Description |
|---|---|---|
| `prisma/schema.prisma` | ✅ Modified | Added 5 fields to `Material` + 2 new models (`BargainSession`, `BargainMessage`) |
| `src/app/api/materials/route.ts` | ✅ Modified | POST handler now accepts bargain fields |
| `src/app/materials/new/page.tsx` | ✅ Modified | Added bargain settings UI in Step 2 (toggle, floor price, style, auto-accept, sweeteners) |
| `src/lib/agents/bargain.ts` | ✅ Created | OpenAI-powered negotiation agent with smart tactics |
| `src/app/api/bargain/start/route.ts` | ✅ Created | POST — creates/resumes bargain sessions |
| `src/app/api/bargain/[sessionId]/message/route.ts` | ✅ Created | POST — sends buyer message, gets AI reply |
| `src/app/api/bargain/[sessionId]/route.ts` | ✅ Created | GET — fetch session + messages (for resume) |
| `src/app/api/bargain/seller/route.ts` | ✅ Created | GET — list seller's bargain sessions |
| `src/components/BargainChat.tsx` | ✅ Created | WhatsApp-style chat UI component |
| `src/app/materials/[id]/page.tsx` | ✅ Modified | Added "Make an Offer" button with BargainChat dialog |

### Database Migration
- Ran `prisma db push` to sync schema with PostgreSQL (Neon)
- New tables: `bargain_sessions`, `bargain_messages`
- New columns on `materials`: `floor_price`, `bargain_enabled`, `negotiation_style`, `auto_accept_price`, `deal_sweeteners`

---

## The Idea

When a seller lists a material for sale, they set two prices:
- **Asking Price** — the listed price buyers see (e.g. ₹5,000)
- **Floor Price** — the absolute minimum they'll accept (e.g. ₹3,500) — this is **private**, only the AI knows it

When a buyer views a listing and thinks the price is too high, they click **"Make an Offer"**. Instead of chatting directly with the seller, the buyer enters a **real-time negotiation chat with an AI bot** that acts on behalf of the seller. The seller never has to be online or respond manually.

---

## Why AI Negotiation Instead of Direct Chat?

1. **Instant response** — buyers don't wait hours/days for seller replies
2. **Consistent & fair** — the bot follows the seller's rules every time
3. **No emotional decisions** — the bot doesn't panic-sell or get angry
4. **24/7 availability** — bargaining works at 2 AM
5. **Seller stays in control** — they define the floor price, negotiation style, and deal-breakers upfront

---

## How It Works (Implemented)

### Seller Side — Setting Up Bargain Rules

In `src/app/materials/new/page.tsx`, when listing type = "sell", the seller sees:

1. **Asking Price (₹)** — the public price (already existed, now labeled "Asking Price")
2. **Enable AI Bargaining** — toggle switch to turn bargaining on/off
3. **Floor Price (₹)** — minimum acceptable price, hidden from buyers. Validation prevents floor >= asking price
4. **Negotiation Style** — 3 options:
   - 🪨 Firm (5-8% concession per round)
   - ⚖️ Moderate (8-15% per round, default)
   - 🤝 Flexible (12-20% per round)
5. **Auto-Accept Price (₹)** — optional, instant deal if buyer offers this or more
6. **Deal Sweeteners** — optional text like "Free delivery within 5km"

### Buyer Side — The Bargain Chat Flow

In `src/app/materials/[id]/page.tsx`:

1. Buyer sees an orange **"💬 Make an Offer"** button (only visible when `bargainEnabled === true`)
2. Clicking opens a Dialog containing the `BargainChat` component
3. Buyer clicks "Start Bargaining" → calls `POST /api/bargain/start`
4. Bot greets: "Hi! I'm negotiating on behalf of [Seller] for [Material]. The listed price is ₹X. What price did you have in mind?"
5. Buyer types offer or uses **Quick Offer buttons** (10%, 20%, 30% off)
6. Bot counter-offers using smart tactics
7. Price tracker at the top shows: Listed Price → Current Offer
8. Possible outcomes:
   - **Deal Agreed** → green confirmation, seller notified, session marked "agreed"
   - **No Deal / Closed** → gray ended state, buyer can still request at listed price
   - **Resume Later** → session saved, reopening resumes from where they left off

### AI Negotiation Agent — `src/lib/agents/bargain.ts`

The agent uses GPT-4o-mini with a detailed system prompt containing:
- Material details, condition, category
- Seller's asking price, floor price, negotiation style
- Market average price (computed from similar materials in same city)
- Demand level (from open WantRequests)
- Buyer's trust score
- Views count (for urgency)
- CO₂ saved (for value justification)

**Smart behaviors:**
- Never reveals floor price
- Concessions shrink each round (₹800 → ₹400 → ₹200)
- Uses tactics: anchoring, concession, sweetener, urgency, value_justification, education, final_offer
- Safety check: even if GPT agrees below floor, code overrides it back to floor + 5%
- Auto-accepts if buyer offer >= autoAcceptPrice
- Max 15 messages, then forces closure
- Educates lowballers about market value instead of just rejecting
- On deal agreed: creates notification for seller, updates session with agreed price

**Response format (JSON):**
```json
{
  "message": "conversational reply",
  "currentOffer": 4200,
  "status": "negotiating | agreed | rejected | closed",
  "tactic": "concession"
}
```

### API Routes

#### `POST /api/bargain/start`
- Creates new `BargainSession` or resumes existing active one
- Validates: user is logged in, material exists, bargain enabled, not own listing, sell type
- If floor price not set by seller, defaults to 70% of asking price
- Returns sessionId, opening message, and status

#### `POST /api/bargain/[sessionId]/message`
- Validates session belongs to buyer and is still active
- Saves buyer message to DB
- Calls `runBargainAgent()` which loads full context and calls OpenAI
- Saves AI response to DB
- Returns: reply text, currentOffer, status, tactic

#### `GET /api/bargain/[sessionId]`
- Returns full session with all messages
- Accessible by both buyer and seller

#### `GET /api/bargain/seller`
- Lists all bargain sessions for the logged-in seller's materials
- Includes: material info, buyer info, status, agreed price, discount %, message count

### Chat UI — `src/components/BargainChat.tsx`

- WhatsApp-style bubble messages (green for buyer, gray for assistant)
- Assistant messages labeled "[Seller]'s Assistant" with sparkle icon
- Price offer badges on assistant messages showing current counter-offer
- Price tracker bar: Listed Price → Current Offer → Deal status
- Quick Offer buttons (shown on first few messages): "Offer 10% less", "Offer 20% less", "Offer 30% less"
- Loading state: "Thinking..." with spinner
- Deal Agreed state: green banner with confetti emoji
- Ended state: gray banner with "request at listed price" suggestion
- Enter to send, disabled input during AI response

---

## Database Schema (Current State)

### New fields on `materials` table:
```
floor_price         Float?    — minimum seller will accept (hidden from buyers)
bargain_enabled     Boolean   — default false
negotiation_style   String    — "firm" | "moderate" | "flexible", default "moderate"
auto_accept_price   Float?    — instant deal threshold
deal_sweeteners     String?   — JSON string of sweetener text
```

### `bargain_sessions` table:
```
id                  String (UUID, PK)
material_id         Int (FK → materials)
buyer_id            String (FK → users)
status              String — "active" | "agreed" | "rejected" | "expired"
asking_price        Float
floor_price         Float
agreed_price        Float?
negotiation_style   String
message_count       Int
created_at          DateTime
updated_at          DateTime
```

### `bargain_messages` table:
```
id                  Int (autoincrement, PK)
session_id          String (FK → bargain_sessions)
role                String — "buyer" | "assistant"
content             String — raw text for buyer, JSON for assistant
metadata            String? — JSON: { currentOffer, tactic }
created_at          DateTime
```

---

## What's NOT Built Yet (Future Phases)

### Phase 2 — Seller Visibility
- [ ] Seller bargain dashboard page (view sessions, read transcripts)
- [ ] Bargain notification badges in the nav
- [ ] Bargain analytics (avg discount given, conversion rate, most common buyer offer range)

### Phase 3 — Intelligence & Polish
- [ ] AI-powered pricing suggestions for sellers ("Similar items sell for ₹X–₹Y")
- [ ] Demand-based AI firmness (high demand = firmer, automatic)
- [ ] Buyer reputation tracking for bargaining (complete deals = "Fair Negotiator" badge)
- [ ] Counter-offer push notifications ("Come back! The seller offered ₹4,000")
- [ ] Expired session cleanup (auto-expire after 24h of inactivity)

### Phase 4 — Advanced
- [ ] Group bargaining / auction mode ("3 buyers are negotiating — first to agree wins!")
- [ ] Bulk discount rules ("10% off if you take all 500 pieces")
- [ ] Post-deal AI rating system (buyer/seller rate fairness of negotiation)
- [ ] Multi-language bargaining (Hindi, Tamil, Telugu, etc.)
- [ ] Voice-based bargaining via speech-to-text

---

## Cost Estimate (OpenAI API)

Each bargain session ≈ 10-15 messages = ~2,000–4,000 tokens per session.
Using **GPT-4o-mini** at ~$0.15 per 1M input tokens:
- **Per negotiation**: ~$0.001–$0.002 (less than ₹0.2)
- **1,000 negotiations/month**: ~$1–$2
- Very cost-effective — the existing OpenAI setup handles this easily.

---

## How to Continue Development

### To implement Phase 2 (Seller Dashboard):
1. Create `src/app/dashboard/bargains/page.tsx` — fetch from `GET /api/bargain/seller`
2. Display cards/table with: material name, buyer name, status, agreed price, discount %, message count
3. Click any row → opens transcript view using `GET /api/bargain/[sessionId]`
4. Add bargain notification type handling in existing notification system

### To implement Phase 3 (Intelligence):
1. Price suggestions: Query similar materials by category+city, compute percentiles, show in listing form
2. Demand-based firmness: Already computed in `bargain.ts` (`demandLevel`), just make it affect `negotiationStyle` override
3. Buyer reputation: Add `bargainScore` field to User, increment on deal completion, decrement on abandonment
4. Notifications: Create a cron/scheduled task to check inactive sessions and send reminders

### Environment / Dependencies:
- **OpenAI API key**: Already set in `.env` as `OPENAI_API_KEY`
- **Database**: PostgreSQL on Neon (`DATABASE_URL` in `.env`)
- **Framework**: Next.js 16 (App Router) + Prisma 5.13 + NextAuth
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS
- **Model**: GPT-4o-mini via `openai` npm package (v6.27)
