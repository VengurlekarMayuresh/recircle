import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { wantId } = await req.json()

    if (!wantId) {
      return NextResponse.json({ message: "wantId is required" }, { status: 400 })
    }

    // 1. Fetch Want Request details
    const wantRequest = await prisma.wantRequest.findUnique({
      where: { id: parseInt(wantId) },
      include: { user: { select: { id: true, name: true } } }
    })

    if (!wantRequest) {
      return NextResponse.json({ message: "Want request not found" }, { status: 404 })
    }

    if (wantRequest.userId === currentUserId) {
      return NextResponse.json({ message: "You cannot respond to your own request" }, { status: 400 })
    }

    // 2. Find or Create a placeholder Material for the current user (Haver)
    // This represents what the user "has" to fulfill the want request
    let material = await prisma.material.findFirst({
      where: {
        userId: currentUserId,
        categoryId: wantRequest.categoryId,
        listingType: "fulfillment_placeholder"
      }
    })

    if (!material) {
      material = await prisma.material.create({
        data: {
          userId: currentUserId,
          categoryId: wantRequest.categoryId,
          title: `Fulfillment for: ${wantRequest.title}`,
          description: `This is a placeholder listing created to fulfill a want request: "${wantRequest.title}".`,
          condition: "good",
          quantity: wantRequest.quantityNeeded,
          unit: "units",
          listingType: "fulfillment_placeholder",
          price: 1, // Nominal price
          status: "available",
          locationLat: 19.076,
          locationLng: 72.8777,
          address: "Registered Address",
          city: "Mumbai", // Default or user city
          images: "",
          tags: "[]",
          bargainEnabled: true,
          negotiationStyle: "human",
          floorPrice: 1,
        }
      })
    }

    // 3. Find or Create Bargain Session
    // Haver (Current User) = Seller (Material Owner)
    // Requester = Buyer
    let bargainSession = await prisma.bargainSession.findFirst({
      where: {
        materialId: material.id,
        buyerId: wantRequest.userId,
      }
    })

    if (!bargainSession) {
      bargainSession = await prisma.bargainSession.create({
        data: {
          materialId: material.id,
          buyerId: wantRequest.userId,
          askingPrice: material.price,
          floorPrice: material.floorPrice || 1,
          negotiationStyle: "human",
          status: "active",
          messageCount: 1,
        }
      })

      // Send initial message from the HAVER (who is the seller in this session)
      await prisma.bargainMessage.create({
        data: {
          sessionId: bargainSession.id,
          role: "seller",
          content: "i have the your requiremenet if you still need this we can haev a talk",
        }
      })
    }

    return NextResponse.json({
      sessionId: bargainSession.id,
      status: bargainSession.status,
      isSeller: true // Indicate the current user is the seller in this session
    }, { status: 201 })

  } catch (error: any) {
    console.error("[Bargain Want Start] Error:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}
