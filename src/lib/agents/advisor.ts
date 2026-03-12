import OpenAI from "openai"
import prisma from "@/lib/prisma"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are ReCircle's AI Sustainability Advisor. You help users in India's circular economy marketplace.
You can search for materials, find matches, estimate environmental impact, suggest reuse ideas, and more.
Always provide specific, actionable advice. Use Indian context (₹ currency, Indian cities, local examples).
When estimating impact, always show both CO₂ AND ₹ (rupees) saved.
You also provide repair guides when asked — e.g., "How to fix a wobbly table", "How to refurbish old electronics",
"How to restore wooden furniture". Give step-by-step repair instructions with estimated cost and tools needed.
You understand cross-industry symbiosis — you can explain how one industry's waste becomes another's input.`

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_materials",
      description: "Search marketplace for available materials",
      parameters: {
        type: "object",
        properties: {
          query:     { type: "string", description: "Search query" },
          category:  { type: "string", description: "Category name" },
          city:      { type: "string", description: "City name in India" },
          radius_km: { type: "number", description: "Search radius in km" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_impact_estimate",
      description: "Estimate CO2 and ₹ impact of reusing a material",
      parameters: {
        type: "object",
        required: ["category", "weight_kg"],
        properties: {
          category:  { type: "string" },
          weight_kg: { type: "number" },
          quantity:  { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_reuse_ideas",
      description: "Suggest specific reuse ideas for a material in Indian context",
      parameters: {
        type: "object",
        required: ["material_type", "condition"],
        properties: {
          material_type: { type: "string" },
          condition:     { type: "string", enum: ["new","like_new","good","fair","salvage"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_repair_hubs",
      description: "Find nearby repair hubs in a city",
      parameters: {
        type: "object",
        required: ["city"],
        properties: {
          city:     { type: "string" },
          category: { type: "string", description: "What type of repair" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_demand_forecast",
      description: "Get demand forecast for a category in a city",
      parameters: {
        type: "object",
        required: ["category", "city"],
        properties: {
          category: { type: "string" },
          city:     { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_symbiosis_suggestions",
      description: "Get cross-industry symbiosis suggestions — what industry can use this waste",
      parameters: {
        type: "object",
        required: ["waste_type"],
        properties: {
          waste_type: { type: "string", description: "Type of waste/material" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_want_board",
      description: "Get open want requests from the Want Board",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          city:     { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_repair_guide",
      description: "Generate a step-by-step repair guide for a material",
      parameters: {
        type: "object",
        required: ["material", "issue"],
        properties: {
          material: { type: "string", description: "What material/item to repair" },
          issue:    { type: "string", description: "What the problem is" },
        },
      },
    },
  },
]

// Tool implementations
async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "search_materials": {
      const where: any = { status: "available" }
      if (args.city) where.city = { contains: args.city, mode: "insensitive" }
      if (args.query) where.title = { contains: args.query, mode: "insensitive" }
      const mats = await prisma.material.findMany({
        where,
        take: 5,
        include: { category: true, user: { select: { name: true, city: true } } },
        orderBy: { createdAt: "desc" },
      })
      if (mats.length === 0) return "No materials found matching your criteria."
      return JSON.stringify(mats.map(m => ({
        id: m.id,
        title: m.title,
        condition: m.condition,
        quantity: m.quantity,
        unit: m.unit,
        listing_type: m.listingType,
        price: m.price,
        city: m.city,
        category: m.category?.name,
        supplier: m.user.name,
        co2_saved: m.co2SavedKg,
      })))
    }

    case "get_impact_estimate": {
      const cat = await prisma.category.findFirst({
        where: { name: { contains: args.category, mode: "insensitive" } },
      })
      if (!cat) return `Category "${args.category}" not found. Using default estimate.`
      const co2 = args.weight_kg * cat.co2FactorKg
      const rupees = (args.weight_kg / 1000) * cat.landfillCostInrPerTonne + (args.quantity || 1) * cat.newCostInrPerUnit
      return JSON.stringify({
        co2_saved_kg: co2.toFixed(2),
        rupees_saved: rupees.toFixed(0),
        trees_equivalent: (co2 / 22).toFixed(1),
        water_saved_liters: (args.weight_kg * cat.waterFactorLiters).toFixed(0),
      })
    }

    case "suggest_reuse_ideas": {
      const ideas: Record<string, string[]> = {
        wood:         ["Pallet furniture", "Garden raised beds", "Compost bin frames"],
        metal:        ["Garden tools", "Art sculptures", "Building reinforcement"],
        textile:      ["Cleaning rags", "Insulation batting", "Tote bags"],
        electronics:  ["Parts harvesting", "E-waste recycling", "STEM education kits"],
        construction: ["Road fill", "Rubble walls", "Foundation material"],
        furniture:    ["Refurbishment + resale", "Community center donation", "NGO shelter use"],
        packaging:    ["Craft workshops", "Seed starters", "Storage boxes"],
      }
      const key = Object.keys(ideas).find(k => args.material_type.toLowerCase().includes(k)) || "construction"
      return `Reuse ideas for ${args.material_type} (${args.condition} condition): ${ideas[key].join(", ")}`
    }

    case "find_repair_hubs": {
      const hubs = await prisma.repairHub.findMany({
        where: { address: { contains: args.city, mode: "insensitive" } },
        take: 3,
      })
      if (hubs.length === 0) return `No repair hubs found in ${args.city}.`
      return JSON.stringify(hubs.map(h => ({ name: h.name, type: h.type, address: h.address, hours: h.hours, website: h.website })))
    }

    case "get_demand_forecast": {
      const now = new Date()
      const history = await prisma.demandHistory.findMany({
        where: {
          city:     { contains: args.city, mode: "insensitive" },
          category: { name: { contains: args.category, mode: "insensitive" } },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
      })
      if (history.length === 0) return `No demand data for ${args.category} in ${args.city}.`
      const avgListings = history.reduce((s, h) => s + h.listingCount, 0) / history.length
      const trend = history[0].listingCount > avgListings ? "rising" : "falling"
      return `${args.category} demand in ${args.city} is ${trend}. Average ${avgListings.toFixed(0)} listings/month.`
    }

    case "get_symbiosis_suggestions": {
      const chains: Record<string, string> = {
        coffee:     "Coffee grounds → Mushroom farms (substrate for mushroom farming)",
        sawdust:    "Sawdust → Particleboard manufacturers (raw material)",
        textile:    "Textile scraps → Rag makers / Insulation (stuffing, cleaning rags)",
        construction: "Construction rubble → Road construction (fill material)",
        cooking_oil: "Used cooking oil → Biodiesel producers (feedstock)",
        packaging:  "Food packaging → Craft workshops (art/craft raw material)",
        wood:       "Wood offcuts → Furniture makers / Charcoal producers",
        metal:      "Metal scrap → Foundries / Blacksmiths",
      }
      const key = Object.keys(chains).find(k => args.waste_type.toLowerCase().includes(k))
      return key ? chains[key] : `For ${args.waste_type}: Consider listing on ReCircle marketplace — manufacturers, NGOs, and workshops often need surplus materials.`
    }

    case "get_want_board": {
      const wants = await prisma.wantRequest.findMany({
        where: { status: "open" },
        take: 5,
        include: { category: true, user: { select: { name: true, city: true } } },
        orderBy: { createdAt: "desc" },
      })
      if (wants.length === 0) return "No open want requests right now."
      return JSON.stringify(wants.map(w => ({
        title: w.title,
        category: w.category.name,
        urgency: w.urgency,
        city: w.user.city,
        quantity: w.quantityNeeded,
        poster: w.user.name,
      })))
    }

    case "get_repair_guide": {
      return `Repair guide for ${args.material} — Issue: ${args.issue}
      
Tools needed: Screwdriver set, sandpaper (120/220 grit), wood glue or epoxy, clamps
Difficulty: Medium | Estimated cost: ₹200–₹500 | Time: 1–2 hours

Steps:
1. Assess the damage thoroughly — identify all broken/worn parts
2. Clean the area: remove dust, rust, or old adhesive
3. Apply appropriate adhesive/filler — wood glue for wood, epoxy for metal
4. Clamp/hold pieces together for 30 mins (wood glue) or 2 hours (epoxy)
5. Sand smooth once dried
6. Apply protective finish (varnish for wood, paint for metal)
7. Test for structural stability before use

Cost estimate (Mumbai): Materials ₹150–300 + Labour (if hired) ₹200–400`
    }

    default:
      return `Tool ${name} not implemented.`
  }
}

export interface AdvisorMessage {
  role: "user" | "assistant"
  content: string
}

export async function runAdvisorAgent(
  userMessage: string,
  userId: string,
  history: AdvisorMessage[]
): Promise<{ reply: string; toolsUsed: string[] }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ]

  const toolsUsed: string[] = []

  // First call
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 1000,
  })

  let assistantMessage = response.choices[0].message

  // Agentic loop — max 3 rounds of tool calls
  for (let round = 0; round < 3; round++) {
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) break

    messages.push(assistantMessage)

    // Execute all tool calls
    const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = []
    for (const call of assistantMessage.tool_calls) {
      const args = JSON.parse(call.function.arguments)
      const result = await executeTool(call.function.name, args)
      toolsUsed.push(call.function.name)
      toolResults.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      })
    }

    messages.push(...toolResults)

    // Continue conversation
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 1000,
    })
    assistantMessage = response.choices[0].message
  }

  const reply = assistantMessage.content ?? "I'm sorry, I couldn't generate a response."

  // Save to chat history
  try {
    await prisma.chatHistory.createMany({
      data: [
        { userId, role: "user", content: userMessage },
        { userId, role: "assistant", content: reply, toolCalls: toolsUsed.length > 0 ? JSON.stringify(toolsUsed) : null },
      ],
    })
    // Log to agent_logs
    await prisma.agentLog.create({
      data: {
        agentName: "advisor",
        action: "chat_response",
        userId,
        details: JSON.stringify({ tools_used: toolsUsed, message_preview: userMessage.slice(0, 100) }),
      },
    })
  } catch (_) {}

  return { reply, toolsUsed }
}
