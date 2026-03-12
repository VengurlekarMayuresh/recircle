import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/supplier-discovery/respond
// Body: { notification_id, response: 'available_now' | 'available_later' | 'not_available', available_date?, want_request_id? }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { notification_id, response, available_date, want_request_id } = body

    if (!response || !['available_now', 'available_later', 'not_available'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response value' }, { status: 400 })
    }

    // Mark the discovery notification as read
    if (notification_id) {
      await prisma.notification.update({
        where: { id: parseInt(notification_id), userId: session.user.id },
        data: { read: true }
      }).catch(() => {})
    }

    // Get the want request info if provided
    let wantRequest = null
    const wantRequestId = want_request_id ? parseInt(want_request_id) : null

    if (wantRequestId) {
      wantRequest = await prisma.wantRequest.findUnique({
        where: { id: wantRequestId },
        include: { user: true, category: true }
      })
    }

    // Log the response
    await prisma.agentLog.create({
      data: {
        agentName: 'scout',
        action: 'supplier_discovery_response',
        userId: session.user.id,
        details: JSON.stringify({
          response,
          wantRequestId: wantRequestId,
          availableDate: available_date
        })
      }
    }).catch(() => {})

    if (response === 'not_available') {
      return NextResponse.json({
        success: true,
        message: 'Response recorded. Thank you for letting us know.',
        action: null
      })
    }

    if (response === 'available_now') {
      // Return pre-fill data for create listing page
      const prefill: any = {}
      if (wantRequest) {
        prefill.categoryId = wantRequest.categoryId
        prefill.title = wantRequest.title
        prefill.description = `Responding to a want request: ${wantRequest.description}`
        prefill.city = wantRequest.user.city
      }

      // Notify the requester that a supplier responded
      if (wantRequest) {
        await prisma.notification.create({
          data: {
            userId: wantRequest.userId,
            type: 'supplier_responded',
            title: 'A supplier has materials for you! 🎉',
            body: `A supplier is listing materials that match your request "${wantRequest.title}"`,
            data: JSON.stringify({ wantRequestId, supplierId: session.user.id })
          }
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        message: 'Great! You will be redirected to create your listing.',
        action: 'create_listing',
        prefill,
        redirect: `/materials/new?${new URLSearchParams(
          Object.fromEntries(Object.entries(prefill).map(([k, v]) => [k, String(v)]))
        )}`
      })
    }

    if (response === 'available_later') {
      // Create a future availability listing if we have enough data
      const prefill: any = { status: 'future' }
      if (wantRequest) {
        prefill.categoryId = wantRequest.categoryId
        prefill.title = wantRequest.title
        prefill.description = `Future availability — responding to want request: ${wantRequest.description}`
        prefill.city = wantRequest.user.city
      }
      if (available_date) {
        prefill.availableFromDate = available_date
      }

      // Notify requester
      if (wantRequest) {
        await prisma.notification.create({
          data: {
            userId: wantRequest.userId,
            type: 'supplier_future_availability',
            title: 'A supplier will have materials for you soon! 📅',
            body: `A supplier indicated they'll have materials matching "${wantRequest.title}" available${available_date ? ` on ${new Date(available_date).toLocaleDateString('en-IN')}` : ' soon'}.`,
            data: JSON.stringify({ wantRequestId, supplierId: session.user.id, availableDate: available_date })
          }
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        message: 'Thank you! You can create a future availability listing now.',
        action: 'create_future_listing',
        prefill,
        redirect: `/materials/new?${new URLSearchParams(
          Object.fromEntries(Object.entries(prefill).map(([k, v]) => [k, String(v)]))
        )}`
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Supplier Discovery Respond]', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}
