import { NextResponse } from "next/server"
import { createHash } from "crypto"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: "Invalid file type. Use JPG, PNG, WEBP, or GIF." }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large. Max 5MB." }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ message: "Cloudinary not configured" }, { status: 500 })
    }

    // Convert file to base64 data URI
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    // Generate signed upload params
    const timestamp = Math.round(Date.now() / 1000)
    const paramsToSign = `folder=recircle&timestamp=${timestamp}`
    const signature = createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex")

    // Upload to Cloudinary
    const cloudinaryForm = new FormData()
    cloudinaryForm.append("file", dataUri)
    cloudinaryForm.append("api_key", apiKey)
    cloudinaryForm.append("timestamp", timestamp.toString())
    cloudinaryForm.append("signature", signature)
    cloudinaryForm.append("folder", "recircle")

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudinaryForm }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error("[Cloudinary] Error:", data)
      return NextResponse.json({ message: data.error?.message || "Cloudinary upload failed" }, { status: 500 })
    }

    return NextResponse.json({ url: data.secure_url })
  } catch (error) {
    console.error("[Upload] Error:", error)
    return NextResponse.json({ message: "Upload failed" }, { status: 500 })
  }
}
