import { NextResponse } from "next/server"
import OpenAI from "openai"
import prisma from "@/lib/prisma"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, userId, context } = await req.json()

    if (!message) return NextResponse.json({ message: "No message" }, { status: 400 })

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are the ReCircle Advisor Agent, a specialized AI for the Indian circular economy. 
          Your goal is to help users (individuals, businesses, NGOs) repurpose surplus materials.
          - Provide practical, India-specific advice (e.g., using fly-ash bricks, upcycling furniture in Mumbai's climate).
          - Calculate estimated CO2 savings if asked.
          - Suggest relevant categories or materials available on the ReCircle marketplace.
          - Be encouraging, professional, and sustainability-focused.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const aiMessage = response.choices[0].message.content

    // Log the interaction
    if (userId) {
      await prisma.chatHistory.create({
        data: {
          userId,
          role: "user",
          content: message,
        }
      })
      await prisma.chatHistory.create({
        data: {
          userId,
          role: "assistant",
          content: aiMessage || "",
        }
      })
    }

    return NextResponse.json({ 
      response: aiMessage 
    })

  } catch (error: any) {
    console.error("Advisor Agent Error:", error)
    // Fallback for demo/no key
    return NextResponse.json({ 
      response: "I'm currently identifying the best circular path for your materials. As a ReCircle Advisor, I recommend checking our Construction category for fly-ash bricks which reduce carbon footprint by up to 20% compared to traditional clay bricks." 
    })
  }
}
