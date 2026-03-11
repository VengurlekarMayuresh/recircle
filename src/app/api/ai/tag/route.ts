import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json()
    console.log("[AI Tag Route] Received:", { title, description })

    if (!title || !description) {
      console.error("[AI Tag Route] Missing title or description")
      return NextResponse.json({ message: "Title and description are required" }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    console.log("[AI Tag Route] API Key status:", apiKey ? "Loaded (Starts with " + apiKey.substring(0, 4) + "...)" : "Not Loaded")
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY is not set. Falling back to mock tags.")
      return NextResponse.json({ tags: ["reusable", "surplus", "recircle"] })
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://recircle.com",
        "X-Title": "ReCircle",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `You are an expert in circular economy and material recycling. 
            Analyze the provided material title and description. 
            Identify the material type, its potential uses, and relevant keywords for a marketplace search.
            Return ONLY a JSON object with a key 'tags' containing an array of 5-10 specific, searchable tags.
            Example: { "tags": ["construction", "red bricks", "burnt clay", "surplus", "building material"] }`
          },
          {
            role: "user",
            content: `Material Title: ${title}\nDescription: ${description}`
          }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[AI Tag Route] OpenRouter Error:", response.status, errorText)
      // Fallback if API fails
      return NextResponse.json({ tags: ["circular", "recycled", "sustainable"] })
    }

    const data = await response.json()
    console.log("[AI Tag Route] OpenRouter Raw Response:", JSON.stringify(data, null, 2))
    
    let tags: string[] = []
    
    try {
      const content = data.choices?.[0]?.message?.content || "{}"
      const parsed = JSON.parse(content)
      tags = parsed.tags || []
      console.log("[AI Tag Route] Parsed Tags:", tags)
    } catch (e) {
      console.error("[AI Tag Route] Failed to parse AI response content:", e)
      // Fallback to simple split if JSON fails
      const rawContent = data.choices?.[0]?.message?.content || ""
      tags = rawContent.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      console.log("[AI Tag Route] Fallback Tags:", tags)
    }

    // Ensure we always return something
    if (tags.length === 0) tags = ["reusable", "surplus", "recircle"]

    return NextResponse.json({ tags })

  } catch (error: any) {
    console.error("AI Tagging Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
