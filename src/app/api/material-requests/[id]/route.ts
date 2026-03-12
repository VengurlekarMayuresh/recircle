import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// PUT /api/material-requests/[id] — accept or reject a request
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    const body = await req.json()
    const { action, responseMessage } = body // action: "accept" | "reject"

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ message: "action must be 'accept' or 'reject'" }, { status: 400 })
    }

    // Get request with material
    const request = await prisma.directRequest.findUnique({
      where: { id },
      include: { material: true, receiver: true }
    })

    if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 })
    if (request.material.userId !== session.user.id) {
      return NextResponse.json({ message: "Only the supplier can respond to this request" }, { status: 403 })
    }
    if (request.status !== "pending") {
      return NextResponse.json({ message: "Request is no longer pending" }, { status: 400 })
    }

    if (action === "reject") {
      await prisma.directRequest.update({
        where: { id },
        data: { status: "rejected", responseMessage: responseMessage || null, respondedAt: new Date() }
      })

      // Notify receiver
      await prisma.notification.create({
        data: {
          userId: request.receiverId,
          type: "request_rejected",
          title: "Request Declined",
          body: `Your request for "${request.material.title}" was declined.`,
          data: JSON.stringify({ requestId: id, materialId: request.materialId })
        }
      }).catch(() => {})

      return NextResponse.json({ message: "Request rejected" })
    }

    // Accept: create transaction + update material quantity
    const transaction = await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.directRequest.update({
        where: { id },
        data: { status: "accepted", responseMessage: responseMessage || null, respondedAt: new Date() }
      })

      // Create transaction
      const newTransaction = await tx.transaction.create({
        data: {
          materialId: request.materialId,
          supplierId: session.user.id,
          receiverId: request.receiverId,
          quantity: request.quantityRequested,
          transportMethod: request.preferredTransport === "self_pickup" ? "self_pickup"
            : request.preferredTransport === "supplier_delivery" ? "supplier_delivery"
            : request.preferredTransport === "platform_transporter" ? "platform_transporter"
            : "self_pickup",
          status: "negotiating",
          pickupAddress: request.material.address || "",
          deliveryAddress: ""
        }
      })

      // Reduce material quantity
      const newQty = request.material.quantity - request.quantityRequested
      const newStatus = newQty <= 0 ? "claimed" : "available"

      await tx.material.update({
        where: { id: request.materialId },
        data: { quantity: Math.max(0, newQty), status: newStatus }
      })

      return newTransaction
    })

    // Notify receiver of acceptance
    await prisma.notification.create({
      data: {
        userId: request.receiverId,
        type: "request_accepted",
        title: "Request Accepted! 🎉",
        body: `Your request for "${request.material.title}" was accepted. Proceed to transaction.`,
        data: JSON.stringify({ transactionId: transaction.id, requestId: id, materialId: request.materialId })
      }
    }).catch(() => {})

    return NextResponse.json({ message: "Request accepted", transaction })
  } catch (error) {
    console.error("[Material Requests PUT] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

// GET /api/material-requests/[id] — get single request
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    const request = await prisma.directRequest.findUnique({
      where: { id },
      include: {
        material: { include: { category: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, avgRating: true } }
      }
    })

    if (!request) return NextResponse.json({ message: "Not found" }, { status: 404 })

    // Only supplier or receiver can see
    if (request.material.userId !== session.user.id && request.receiverId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(request)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
