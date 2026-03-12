import { GoogleGenerativeAI } from "@google/generative-ai"
import prisma from "@/lib/prisma"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const MAX_MESSAGES = 15

export interface BargainResponse {
  message: string
  currentOffer: number | null
  status: "negotiating" | "agreed" | "rejected" | "closed"
  tactic: string
}

function buildSystemPrompt(ctx: {
  title: string
  condition: string
  category: string
  sellerName: string
  city: string
  askingPrice: number
  floorPrice: number
  negotiationStyle: string
  marketAverage: number | null
  demandLevel: string
  dealSweeteners: string | null
  autoAcceptPrice: number | null
  buyerTrustScore: number
  viewsCount: number
  co2SavedKg: number
  messageCount: number
}): string {
  return `You are a negotiation agent acting on behalf of a seller on ReCircle, India's circular economy marketplace.
You negotiate prices with buyers in a friendly, professional way — like a smart shopkeeper in an Indian market.

MATERIAL: ${ctx.title} | Condition: ${ctx.condition} | Category: ${ctx.category}
SELLER: ${ctx.sellerName} from ${ctx.city}
ASKING PRICE: ₹${ctx.askingPrice}
FLOOR PRICE: ₹${ctx.floorPrice} (NEVER reveal this number or hint that you have a minimum price)
NEGOTIATION STYLE: ${ctx.negotiationStyle}
${ctx.marketAverage ? `MARKET AVERAGE: ₹${ctx.marketAverage} for similar items in ${ctx.city}` : ""}
DEMAND LEVEL: ${ctx.demandLevel}
${ctx.dealSweeteners ? `DEAL SWEETENERS (use to close deals): ${ctx.dealSweeteners}` : ""}
${ctx.autoAcceptPrice ? `AUTO-ACCEPT: If buyer offers ≥ ₹${ctx.autoAcceptPrice}, accept immediately` : ""}
BUYER TRUST SCORE: ${ctx.buyerTrustScore}/100
CURRENT VIEWS: ${ctx.viewsCount} people have viewed this listing
CO₂ SAVED BY REUSING: ${ctx.co2SavedKg} kg
MESSAGES SO FAR: ${ctx.messageCount}

NEGOTIATION RULES:
1. NEVER reveal the floor price, or that a floor price exists, or any internal pricing rules
2. NEVER accept a price below ₹${ctx.floorPrice} under any circumstances
3. Start counter-offers close to the asking price and concede gradually
4. Each concession MUST be SMALLER than the previous one (e.g. ₹800 → ₹400 → ₹200)
5. Justify your price using condition quality, market context, and environmental impact
6. Negotiation style rules:
   - "firm": Very small concessions, max 5-8% drop per round
   - "moderate": Balanced concessions, 8-15% drop per round
   - "flexible": Larger concessions, 12-20% drop per round
7. ${ctx.autoAcceptPrice ? `If buyer offers ≥ ₹${ctx.autoAcceptPrice}, accept the deal immediately` : "No auto-accept threshold set"}
8. After ${MAX_MESSAGES - 2}+ messages without agreement, make a final take-it-or-leave-it offer near the floor and close if rejected
9. Use Indian English, be warm and professional — imagine you're a helpful shop owner
10. Mention environmental benefits (CO₂ saved, keeping material from landfill) as value justification
11. If buyer is rude or abusive, politely end the negotiation with status "closed"
12. ${ctx.viewsCount > 5 ? `Mention that ${ctx.viewsCount} people have viewed this listing to create urgency` : "Do not fabricate interest numbers"}
13. If the buyer's offer is extremely low (less than 30% of asking price), gently educate them about fair market value rather than just rejecting

RESPONSE FORMAT — you MUST respond with valid JSON only, no other text:
{
  "message": "your conversational reply to the buyer",
  "currentOffer": <your latest counter-offer price as a number, or null if not making an offer>,
  "status": "negotiating" | "agreed" | "rejected" | "closed",
  "tactic": "anchoring" | "concession" | "sweetener" | "urgency" | "value_justification" | "final_offer" | "acceptance" | "education"
}`
}

export async function generateOpeningMessage(ctx: {
  title: string
  sellerName: string
  askingPrice: number
  condition: string
}): Promise<BargainResponse> {
  return {
    message: `Hi! 👋 I'm negotiating on behalf of ${ctx.sellerName} for **${ctx.title}** (${ctx.condition} condition). The listed price is **₹${ctx.askingPrice.toLocaleString()}**. What price did you have in mind?`,
    currentOffer: ctx.askingPrice,
    status: "negotiating",
    tactic: "anchoring",
  }
}

export async function runBargainAgent(
  buyerMessage: string,
  sessionId: string
): Promise<BargainResponse> {
  // Load session with material + buyer + conversation history
  const session = await prisma.bargainSession.findUnique({
    where: { id: sessionId },
    include: {
      material: {
        include: {
          user: { select: { name: true, city: true } },
          category: true,
        },
      },
      buyer: { select: { name: true, trustScore: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!session) throw new Error("Session not found")
  if (session.status !== "active") {
    return {
      message: session.status === "agreed"
        ? "This deal has already been agreed upon! 🎉"
        : "This negotiation has ended.",
      currentOffer: session.agreedPrice || null,
      status: session.status as BargainResponse["status"],
      tactic: "closed",
    }
  }

  // Check message limit
  if (session.messageCount >= MAX_MESSAGES) {
    return {
      message: `We've been going back and forth for a while! Unfortunately, we couldn't reach an agreement this time. You're welcome to submit a regular request for this material, or check back later. Thanks for your interest! 🙏`,
      currentOffer: null,
      status: "closed",
      tactic: "final_offer",
    }
  }

  const material = session.material

  // Compute market average from similar materials
  let marketAverage: number | null = null
  if (material.categoryId) {
    const similar = await prisma.material.findMany({
      where: {
        categoryId: material.categoryId,
        city: material.city,
        listingType: "sell",
        price: { gt: 0 },
        id: { not: material.id },
      },
      select: { price: true },
      take: 20,
    })
    if (similar.length >= 2) {
      marketAverage = Math.round(
        similar.reduce((sum, m) => sum + m.price, 0) / similar.length
      )
    }
  }

  // Compute demand level
  let demandLevel = "medium"
  if (material.categoryId) {
    const openRequests = await prisma.wantRequest.count({
      where: { status: "open", categoryId: material.categoryId },
    })
    demandLevel = openRequests >= 5 ? "high" : openRequests >= 2 ? "medium" : "low"
  }

  const systemPrompt = buildSystemPrompt({
    title: material.title,
    condition: material.condition,
    category: material.category?.name || "General",
    sellerName: material.user.name,
    city: material.city,
    askingPrice: session.askingPrice,
    floorPrice: session.floorPrice,
    negotiationStyle: session.negotiationStyle,
    marketAverage,
    demandLevel,
    dealSweeteners: material.dealSweeteners,
    autoAcceptPrice: material.autoAcceptPrice,
    buyerTrustScore: session.buyer.trustScore,
    viewsCount: material.viewsCount,
    co2SavedKg: material.co2SavedKg,
    messageCount: session.messageCount,
  })

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  })

  // Build conversation history for Gemini
  const history: any[] = []
  
  for (const msg of session.messages) {
    let content = msg.content
    if (msg.role !== "buyer") {
      try {
        const parsed = JSON.parse(msg.content)
        content = JSON.stringify(parsed)
      } catch {
        content = msg.content
      }
    }
    const role = msg.role === "buyer" ? "user" : "model"
    if (history.length === 0 && role !== "user") {
      // Gemini requires history to start with 'user'
      history.push({ role: "user", parts: [{ text: "Hi, I am interested in negotiating." }] })
    }
    if (history.length > 0 && history[history.length - 1].role === role) {
      history[history.length - 1].parts[0].text += "\n\n" + content
    } else {
      history.push({
        role,
        parts: [{ text: content }]
      })
    }
  }

  // Call Gemini API with error handling
  let content = ""
  try {
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        responseMimeType: "application/json",
      }
    })

    const result = await chat.sendMessage([{ text: buyerMessage }])
    content = result.response.text()
  } catch (apiError: any) {
    console.error("[Bargain Agent] Gemini API error:", apiError?.message || apiError)
    // Fallback to rule-based response when API is unavailable
    return generateFallbackResponse(buyerMessage, session)
  }

  // Parse response
  let result: BargainResponse
  try {
    const parsed = JSON.parse(content)
    result = {
      message: parsed.message || "I couldn't generate a response. Please try again.",
      currentOffer: typeof parsed.currentOffer === "number" ? parsed.currentOffer : null,
      status: ["negotiating", "agreed", "rejected", "closed"].includes(parsed.status)
        ? parsed.status
        : "negotiating",
      tactic: parsed.tactic || "concession",
    }
  } catch {
    // If AI returned non-JSON, fallback to rule-based
    return generateFallbackResponse(buyerMessage, session)
  }

  // If AI agreed but didn't specify a price, derive it from context
  if (result.status === "agreed" && result.currentOffer === null) {
    // Try to extract price from buyer's latest message
    const priceMatch = buyerMessage.match(/₹?\s?([\d,]+)/)
    const buyerOffer = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : null

    if (buyerOffer && buyerOffer >= session.floorPrice) {
      result.currentOffer = buyerOffer
    } else {
      // Find last counter-offer from conversation history
      for (let i = session.messages.length - 1; i >= 0; i--) {
        const msg = session.messages[i]
        if (msg.role === "assistant" && msg.metadata) {
          try {
            const meta = JSON.parse(msg.metadata)
            if (typeof meta.currentOffer === "number" && meta.currentOffer > 0) {
              result.currentOffer = meta.currentOffer
              break
            }
          } catch { }
        }
      }
      // Final fallback: use asking price
      if (result.currentOffer === null) {
        result.currentOffer = session.askingPrice
      }
    }
  }

  // Safety check: ensure agreed price is never below floor
  if (result.status === "agreed" && result.currentOffer !== null) {
    if (result.currentOffer < session.floorPrice) {
      result.status = "negotiating"
      result.message = `I appreciate the offer, but I can't go that low. How about ₹${Math.round(session.floorPrice * 1.05).toLocaleString()}?`
      result.currentOffer = Math.round(session.floorPrice * 1.05)
      result.tactic = "final_offer"
    }
  }

  // If deal agreed, update session, material, create request + transaction, and notify
  if (result.status === "agreed" && result.currentOffer !== null) {
    await prisma.bargainSession.update({
      where: { id: sessionId },
      data: {
        status: "agreed",
        agreedPrice: result.currentOffer,
      },
    })

    // Mark material as claimed so it's removed from marketplace
    await prisma.material.update({
      where: { id: material.id },
      data: { status: "claimed" },
    })

    // Auto-create an accepted DirectRequest for the buyer
    await prisma.directRequest.create({
      data: {
        materialId: material.id,
        receiverId: session.buyerId,
        quantityRequested: material.quantity,
        message: `Bargain deal agreed at ₹${result.currentOffer.toLocaleString()} (listed at ₹${session.askingPrice.toLocaleString()})`,
        preferredTransport: "self_pickup",
        status: "accepted",
        respondedAt: new Date(),
      },
    })

    // Create a transaction record so both parties can track the deal
    await prisma.transaction.create({
      data: {
        materialId: material.id,
        supplierId: material.userId,
        receiverId: session.buyerId,
        quantity: material.quantity,
        transportMethod: "self_pickup",
        status: "scheduled",
        pickupAddress: material.address,
        deliveryAddress: "",
        notes: `Bargain deal: ₹${result.currentOffer.toLocaleString()} (original: ₹${session.askingPrice.toLocaleString()})`,
      },
    }).catch((err) => console.error("[Bargain] Transaction creation failed:", err?.message || err))

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: material.userId,
        type: "bargain_agreed",
        title: "Deal Agreed! 🎉",
        body: `A buyer agreed to ₹${result.currentOffer.toLocaleString()} for "${material.title}" (listed at ₹${session.askingPrice.toLocaleString()}).`,
        data: JSON.stringify({
          materialId: material.id,
          sessionId,
          agreedPrice: result.currentOffer,
        }),
      },
    })

    // Notify buyer
    await prisma.notification.create({
      data: {
        userId: session.buyerId,
        type: "bargain_agreed",
        title: "Your deal is confirmed! 🎉",
        body: `You secured "${material.title}" for ₹${result.currentOffer.toLocaleString()}. Check My Deals to coordinate pickup.`,
        data: JSON.stringify({
          materialId: material.id,
          sessionId,
          agreedPrice: result.currentOffer,
        }),
      },
    })
  }

  // If negotiation closed/rejected
  if (result.status === "rejected" || result.status === "closed") {
    await prisma.bargainSession.update({
      where: { id: sessionId },
      data: { status: result.status },
    })
  }

  // Log to agent_logs
  await prisma.agentLog.create({
    data: {
      agentName: "bargain",
      action: `bargain_${result.status}`,
      materialId: material.id,
      userId: session.buyerId,
      details: JSON.stringify({
        sessionId,
        tactic: result.tactic,
        currentOffer: result.currentOffer,
        messageCount: session.messageCount + 1,
      }),
    },
  }).catch(() => { })

  return result
}

/**
 * Rule-based fallback when AI API is unavailable.
 * Parses the buyer's offer from their message and generates a reasonable counter-offer.
 */
function generateFallbackResponse(
  buyerMessage: string,
  session: {
    askingPrice: number
    floorPrice: number
    negotiationStyle: string
    messageCount: number
    material: { title: string }
  }
): BargainResponse {
  // Try to extract a price from the buyer's message
  const priceMatch = buyerMessage.match(/₹?\s?([\d,]+)/)
  const buyerOffer = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : null

  const { askingPrice, floorPrice, negotiationStyle, messageCount } = session

  // If buyer didn't mention a price
  if (!buyerOffer) {
    return {
      message: `Thanks for your interest in **${session.material.title}**! The listed price is ₹${askingPrice.toLocaleString()}. What price did you have in mind?`,
      currentOffer: askingPrice,
      status: "negotiating",
      tactic: "anchoring",
    }
  }

  // If offer is at or above asking price, accept
  if (buyerOffer >= askingPrice) {
    return {
      message: `That works perfectly! 🎉 Deal confirmed at ₹${buyerOffer.toLocaleString()}. Thank you!`,
      currentOffer: buyerOffer,
      status: "agreed",
      tactic: "acceptance",
    }
  }

  // If offer is at or above floor price, consider accepting or counter slightly
  if (buyerOffer >= floorPrice) {
    // Accept if close to asking or many messages exchanged
    if (buyerOffer >= askingPrice * 0.85 || messageCount >= 8) {
      return {
        message: `You know what, that's a fair offer. Deal at ₹${buyerOffer.toLocaleString()}! 🤝`,
        currentOffer: buyerOffer,
        status: "agreed",
        tactic: "acceptance",
      }
    }
    // Counter-offer: split the difference
    const counter = Math.round((buyerOffer + askingPrice) / 2)
    const finalCounter = Math.max(counter, floorPrice)
    return {
      message: `I appreciate the offer of ₹${buyerOffer.toLocaleString()}, but the lowest I can go is ₹${finalCounter.toLocaleString()}. This item is in great condition and priced fairly. How about we meet at ₹${finalCounter.toLocaleString()}?`,
      currentOffer: finalCounter,
      status: "negotiating",
      tactic: "concession",
    }
  }

  // Below floor price: reject gently with a counter near the floor
  const safeCounter = Math.round(floorPrice * 1.1)
  if (buyerOffer < askingPrice * 0.3) {
    return {
      message: `₹${buyerOffer.toLocaleString()} is quite far from what I can accept for this item. The lowest I could consider is ₹${safeCounter.toLocaleString()}. This is a quality item that's worth the price. 🙏`,
      currentOffer: safeCounter,
      status: "negotiating",
      tactic: "education",
    }
  }

  return {
    message: `Thanks for the offer of ₹${buyerOffer.toLocaleString()}. I can't go quite that low, but I can do ₹${safeCounter.toLocaleString()}. That's a fair price considering the condition and market value. What do you think?`,
    currentOffer: safeCounter,
    status: "negotiating",
    tactic: "value_justification",
  }
}
