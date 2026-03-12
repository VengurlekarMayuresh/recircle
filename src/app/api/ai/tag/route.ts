import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json()
    console.log("[AI Tag Route] Received:", { title, description })

    if (!title || !description) {
      console.error("[AI Tag Route] Missing title or description")
      return NextResponse.json({ message: "Title and description are required" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("[AI Tag Route] Missing GEMINI_API_KEY")
      return NextResponse.json({ message: "API key configuration missing" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const prompt = `You are an expert in circular economy and material recycling. 
Analyze the provided material title and description. 
Identify the material type, its potential uses, and relevant keywords for a marketplace search.
Return ONLY a JSON object with a key 'tags' containing an array of 5-10 specific, searchable tags.
Example: { "tags": ["construction", "red bricks", "burnt clay", "surplus", "building material"] }

Material Title: ${title}
Description: ${description}`

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const responseText = result.response.text()

    let tags: string[] = []

    try {
      const parsed = JSON.parse(responseText)
      tags = parsed.tags || []
    } catch (e) {
      console.error("[AI Tag Route] Failed to parse AI response content:", e)
      tags = responseText.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean)
    }

    // Ensure we always return something
    if (tags.length === 0) tags = ["reusable", "surplus", "recircle"]

    return NextResponse.json({ tags })

  } catch (error: any) {
    console.error("AI Tagging Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
