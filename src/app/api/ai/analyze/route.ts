import { NextResponse } from "next/server"

const GEMINI_MODEL = "gemini-2.0-flash"

const CATEGORY_SLUGS = [
  "construction",
  "furniture-office",
  "packaging",
  "electronics",
  "industrial-surplus",
  "textiles",
  "metals-scrap",
  "wood-timber",
]

const SYSTEM_PROMPT = `You are ReCircle Vision AI — an expert material identification and sustainability assessment system for India's circular economy marketplace.

You will receive an image of surplus/waste material being listed for reuse. Analyze the image carefully and return a JSON object with the following keys:

{
  "suggestedTitle": "concise product title with material name + estimated quantity if visible",
  "suggestedDescription": "2-3 sentences describing what you see, apparent condition, and potential reuse applications in Indian context",
  "tags": ["array", "of", "5-8", "specific", "tags"],
  "detectedMaterial": "what the material is e.g. clay bricks, wooden pallets, steel rods",
  "estimatedCondition": "one of: new, like_new, good, fair, salvage",
  "estimatedCategory": "one of: construction, furniture-office, packaging, electronics, industrial-surplus, textiles, metals-scrap, wood-timber",
  "estimatedWeightKg": number or null,
  "environmentalImpact": {
    "co2SavedKg": number,
    "waterSavedLiters": number,
    "landfillDiversionKg": number,
    "treeEquivalent": number,
    "decompositionYears": number,
    "impactBasis": "1-2 sentence explanation of how you estimated these numbers"
  }
}

RULES FOR TAGS:
- Generate 5-8 tags based ONLY on what you can see in the image
- Tags must be specific and searchable: material type, color, form factor, industry use
- NEVER use generic filler tags like "sustainable", "eco-friendly", "circular", "green", "recyclable", "reusable"
- Good examples: "red clay bricks", "construction", "burnt clay", "building material", "masonry"
- Bad examples: "sustainable", "eco", "reusable", "green product"

RULES FOR ENVIRONMENTAL IMPACT:
- Base your CO₂ estimate on the identified material type using these India-specific factors (kg CO₂ saved per tonne of material reused instead of manufacturing new):
  Construction materials: 900 | Furniture/wood: 1800-3500 | Packaging: 1200 | Electronics: 20000 | Textiles: 15000 | Metals/scrap: 6000 | Industrial surplus: 4000
- Estimate the visible quantity/weight from the image. Mention your weight estimate in impactBasis.
- Water savings per tonne: Construction ~500L, Textiles ~10000L, Metals ~8000L, Paper/Packaging ~26000L, Electronics ~15000L, Wood ~5000L
- treeEquivalent = co2SavedKg / 21 (one mature tree absorbs ~21kg CO₂ per year)
- decompositionYears: Bricks/Concrete 1000+, Plastic 500, Metal 200-500, Wood 15-50, Textiles 40-200, Electronics 1000+, Glass 1000000
- Be honest — if you can't estimate quantity from the image, say so in impactBasis and give a conservative per-unit estimate
- All numbers must be realistic. Do NOT inflate.

RULES FOR TITLE & DESCRIPTION:
- Title: concise, include material name + quantity if visible (e.g. "Red Clay Bricks — ~500 pieces")
- Description: what you see, apparent condition, potential reuse applications in Indian context
- If user provided their own title/description as context, improve upon it but respect their intent

RULES FOR CONDITION:
- new: still in packaging, unused, pristine
- like_new: minimal use, no defects
- good: minor wear, fully functional
- fair: visible wear, may need minor repair
- salvage: significant damage, best for parts/recycling

Return ONLY the JSON object. No markdown, no backticks, no extra text.`

export async function POST(req: Request) {
  try {
    const { imageUrl, title, description } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ message: "imageUrl is required" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || ""
    if (!apiKey) {
      console.error("[AI Analyze] GEMINI_API_KEY not set")
      return NextResponse.json({ message: "AI service not configured" }, { status: 500 })
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    // Build user message with optional context
    let userText = "Analyze this material image for the ReCircle marketplace."
    if (title) userText += `\nUser's title: "${title}"`
    if (description) userText += `\nUser's description: "${description}"`

    // Fetch the image and convert to base64 for Gemini inline_data
    let imageBase64: string
    let mimeType: string

    try {
      const imgResponse = await fetch(imageUrl)
      if (!imgResponse.ok) {
        return NextResponse.json({ message: "Could not fetch image from URL" }, { status: 400 })
      }
      const contentType = imgResponse.headers.get("content-type") || "image/jpeg"
      mimeType = contentType.split(";")[0].trim()
      const buffer = await imgResponse.arrayBuffer()
      imageBase64 = Buffer.from(buffer).toString("base64")
    } catch (err) {
      console.error("[AI Analyze] Image fetch error:", err)
      return NextResponse.json({ message: "Failed to fetch image" }, { status: 400 })
    }

    // Call Gemini with inline image data
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
              { text: userText },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[AI Analyze] Gemini API Error:", response.status, errorText)
      return NextResponse.json(
        { message: "AI analysis failed", error: errorText },
        { status: 502 }
      )
    }

    const data = await response.json()
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    let analysis: any
    try {
      // Clean potential markdown wrapping
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch (e) {
      console.error("[AI Analyze] Failed to parse Gemini response:", rawContent)
      return NextResponse.json(
        { message: "Failed to parse AI response", raw: rawContent },
        { status: 502 }
      )
    }

    // Validate and sanitize the category slug
    if (!CATEGORY_SLUGS.includes(analysis.estimatedCategory)) {
      analysis.estimatedCategory = "industrial-surplus" // safe default
    }

    // Validate condition
    const validConditions = ["new", "like_new", "good", "fair", "salvage"]
    if (!validConditions.includes(analysis.estimatedCondition)) {
      analysis.estimatedCondition = "good"
    }

    // Ensure tags is an array
    if (!Array.isArray(analysis.tags)) {
      analysis.tags = []
    }

    // Ensure environmentalImpact exists with defaults
    if (!analysis.environmentalImpact || typeof analysis.environmentalImpact !== "object") {
      analysis.environmentalImpact = {
        co2SavedKg: 0,
        waterSavedLiters: 0,
        landfillDiversionKg: 0,
        treeEquivalent: 0,
        decompositionYears: 0,
        impactBasis: "Could not estimate from image",
      }
    }

    // Ensure treeEquivalent is calculated correctly
    const co2 = analysis.environmentalImpact.co2SavedKg || 0
    analysis.environmentalImpact.treeEquivalent = Math.round((co2 / 21) * 10) / 10

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error("[AI Analyze] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
