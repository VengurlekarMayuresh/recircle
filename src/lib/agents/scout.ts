import { prisma } from "@/lib/prisma"
import { routeMaterial } from "@/lib/material-router"
import { haversineDistance } from "@/lib/haversine"

import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_KEY = process.env.GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(GEMINI_KEY)

async function callAI(messages: any[]): Promise<string> {
  if (!GEMINI_KEY) return ""
  try {
    const systemInstruction = messages.find(m => m.role === "system")?.content || ""
    const userPrompt = messages.find(m => m.role === "user")?.content || ""

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction
    })
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    })
    
    return result.response.text()
  } catch (error) {
    console.error("Scout AI Error:", error)
    return ""
  }
}

export async function runScoutAgent(materialId: number): Promise<void> {
  const startTime = Date.now()

  try {
    // 1. Get material from DB
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { category: true, user: true }
    })
    if (!material) return

    const logData: Record<string, any> = { materialId, materialTitle: material.title }

    // 2. Compute Reuse Potential Score (RPS)
    const totalOpenRequests = await prisma.wantRequest.count({ where: { status: "open" } })
    let categoryRequests = 0
    if (material.categoryId) {
      categoryRequests = await prisma.wantRequest.count({
        where: { status: "open", categoryId: material.categoryId }
      })
    }
    const categoryDemand = totalOpenRequests > 0 ? categoryRequests / totalOpenRequests : 0

    const conditionFactors: Record<string, number> = {
      new: 1.0, like_new: 0.85, good: 0.7, fair: 0.5, salvage: 0.2
    }
    const conditionFactor = conditionFactors[material.condition] || 0.5

    const weightFactor = material.weightKg ? Math.min(material.weightKg / 100, 1.0) : 0.3

    // Nearby demand (within 10km)
    let nearbyDemand = 0
    if (material.locationLat && material.locationLng) {
      const nearbyRequests = await prisma.wantRequest.findMany({
        where: { status: "open" },
        select: { locationLat: true, locationLng: true }
      })
      const withinRadius = nearbyRequests.filter(r =>
        r.locationLat && r.locationLng &&
        haversineDistance(material.locationLat!, material.locationLng!, r.locationLat, r.locationLng) <= 10
      ).length
      nearbyDemand = Math.min(withinRadius / 10, 1)
    }

    const rps = Math.min(100, Math.max(0, Math.round(
      (categoryDemand * 30) + (conditionFactor * 30) + (weightFactor * 20) + (nearbyDemand * 20)
    )))
    logData.rps = rps

    // 3. Generate AI use cases
    let aiUseCases: string[] = []
    const useCasePrompt = `For ${material.title} (${material.condition} condition, ${material.category?.name} category) in Indian context, suggest 3-5 specific reuse ideas. Return ONLY a JSON array of strings, no other text. Example: ["Use as building material", "Repair and resell"]`

    const aiResponse = await callAI([
      { role: "system", content: "You are a circular economy expert. Respond with ONLY valid JSON arrays." },
      { role: "user", content: useCasePrompt }
    ])

    if (aiResponse) {
      try {
        const parsed = JSON.parse(aiResponse.trim())
        if (Array.isArray(parsed)) aiUseCases = parsed.slice(0, 5)
      } catch {
        // Extract array from response if wrapped in text
        const match = aiResponse.match(/\[[\s\S]*\]/)
        if (match) {
          try { aiUseCases = JSON.parse(match[0]).slice(0, 5) } catch { }
        }
      }
    }

    // Default use cases if AI fails
    if (aiUseCases.length === 0) {
      aiUseCases = generateDefaultUseCases(material.condition, material.category?.slug || "")
    }
    logData.aiUseCases = aiUseCases

    // 4. Run Material Router
    const isHighDemand = categoryDemand > 0.15
    const routeResult = routeMaterial(
      material.condition,
      material.category?.slug || "",
      material.weightKg || 0,
      isHighDemand
    )
    logData.route = routeResult.route

    // 5. Find top matches
    const openRequests = material.categoryId ? await prisma.wantRequest.findMany({
      where: { status: "open", categoryId: material.categoryId },
      include: { user: true },
      take: 20
    }) : []

    interface ScoredRequest {
      request: typeof openRequests[0]
      score: number
      reason: string
    }

    const scored: ScoredRequest[] = []
    const materialKeywords = `${material.title} ${material.description} ${material.tags}`.toLowerCase()

    for (const req of openRequests) {
      let score = 0
      // Keyword match (0-30)
      const keywords = req.keywords?.split(",").map(k => k.trim().toLowerCase()) || []
      const titleWords = req.title.toLowerCase().split(" ")
      const matchCount = [...keywords, ...titleWords].filter(k => materialKeywords.includes(k)).length
      score += Math.min(matchCount * 5, 30)

      // Proximity (0-30)
      if (material.locationLat && material.locationLng && req.locationLat && req.locationLng) {
        const dist = haversineDistance(material.locationLat, material.locationLng, req.locationLat, req.locationLng)
        score += Math.max(0, 30 - dist)
      } else {
        score += 10 // Same-city assumption bonus
      }

      // Recency (0-20)
      const daysSinceRequest = (Date.now() - new Date(req.createdAt).getTime()) / 86400000
      score += Math.max(0, 20 - daysSinceRequest)

      // Trust (0-20)
      score += Math.min((req.user.trustScore || 0) / 5, 20)

      const distance = material.locationLat && req.locationLat
        ? `${haversineDistance(material.locationLat, material.locationLng!, req.locationLat, req.locationLng!).toFixed(1)}km away`
        : "same city"

      scored.push({
        request: req,
        score,
        reason: `Needs ${req.title.toLowerCase()} for similar use, ${distance}, ${req.user.verificationLevel || "basic"} verified`
      })
    }

    scored.sort((a, b) => b.score - a.score)
    const top5 = scored.slice(0, 5)

    // 6. Create match records and notify users
    for (const match of top5) {
      if (match.score < 10) continue // Skip very low relevance
      // Check if match already exists
      const existingMatch = await prisma.match.findFirst({
        where: { materialId, userId: match.request.userId }
      }).catch(() => null)

      if (!existingMatch) {
        await prisma.match.create({
          data: {
            materialId,
            wantRequestId: match.request.id,
            userId: match.request.userId,
            score: match.score,
            reason: match.reason,
            status: "pending",
            notified: true
          }
        }).catch(() => { })
      }

      // Notify matched user
      await prisma.notification.create({
        data: {
          userId: match.request.userId,
          type: "match_found",
          title: "New Match Found! 🎯",
          body: `A material matching your request "${match.request.title}" was just listed.`,
          data: JSON.stringify({ materialId, matchScore: match.score })
        }
      }).catch(() => { })
    }

    logData.matchesFound = top5.length

    // 7. Update material with RPS, use cases, route
    await prisma.material.update({
      where: { id: materialId },
      data: {
        reusePotentialScore: rps,
        aiUseCases: JSON.stringify(aiUseCases),
        aiRouteRecommendation: routeResult.route,
        co2SavedKg: material.co2SavedKg || calculateQuickCO2(material.weightKg || 0, material.category?.co2FactorKg || 2),
        rupeesSaved: material.rupeesSaved || (material.category?.newCostInrPerUnit || 0) - (material.price || 0)
      }
    })

    // 8. Log to agent_logs
    await prisma.agentLog.create({
      data: {
        agentName: "scout",
        action: "process_listing",
        materialId,
        userId: material.userId,
        details: JSON.stringify({ ...logData, durationMs: Date.now() - startTime })
      }
    }).catch(() => { })

  } catch (error) {
    console.error("[Scout Agent] Error:", error)
    // Log failure
    await prisma.agentLog.create({
      data: {
        agentName: "scout",
        action: "error",
        materialId,
        details: JSON.stringify({ error: String(error), durationMs: Date.now() - startTime })
      }
    }).catch(() => { })
  }
}

function calculateQuickCO2(weightKg: number, co2Factor: number): number {
  return Math.round((weightKg / 1000) * co2Factor * 1000 * 100) / 100
}

function generateDefaultUseCases(condition: string, categorySlug: string): string[] {
  const useCases: Record<string, string[]> = {
    construction: [
      "Use as fill material for road construction",
      "Foundation reinforcement for low-cost housing",
      "Garden boundary walls",
      "Retaining wall construction",
      "Decorative landscape elements"
    ],
    "furniture-office": [
      "Refurbish for school use",
      "Donate to NGO offices",
      "Repair and resell through second-hand market",
      "Use in community centers",
      "Upcycle into creative furniture"
    ],
    metals: [
      "Sell to scrap dealers",
      "Use in fabrication workshops",
      "Recycle at authorized facilities",
      "Art and craft applications",
      "Structural reinforcement"
    ],
    textiles: [
      "Donate to rag makers",
      "Use as industrial cleaning rags",
      "Donate to NGOs for underprivileged",
      "Craft and art projects",
      "Insulation material"
    ]
  }

  const defaults = useCases[categorySlug] || [
    "List on marketplace for direct reuse",
    "Donate to local community organizations",
    "Sell to specialized recyclers",
    "Upcycle into new products",
    "Share with repair workshops"
  ]

  if (condition === "salvage") {
    return defaults.slice(-3).concat(["Recycle for raw material recovery", "Contact authorized e-waste/scrap dealers"])
  }
  return defaults.slice(0, 4)
}
