import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { discoverPotentialSuppliers, triggerSupplierDiscovery } from '@/lib/supplier-discovery'

// GET /api/supplier-discovery/trigger?query=X&category_id=Y&city=Z
// Search for potential suppliers (used on marketplace when 0 results)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') || ''
    const categoryId = searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : null
    const city = searchParams.get('city') || ''
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined

    if (!query && !categoryId) {
      return NextResponse.json({ suppliers: [] })
    }

    const suppliers = await discoverPotentialSuppliers(query, categoryId, city, lat, lng)
    return NextResponse.json({ suppliers, count: suppliers.length })
  } catch (error) {
    console.error('[Supplier Discovery GET]', error)
    return NextResponse.json({ error: 'Failed to discover suppliers' }, { status: 500 })
  }
}

// POST /api/supplier-discovery/trigger — Trigger discovery for a want request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const { want_request_id } = body

    if (want_request_id) {
      await triggerSupplierDiscovery(parseInt(want_request_id))
      return NextResponse.json({ success: true, message: 'Discovery triggered' })
    }

    // Manual discovery query
    const { query, category_id, city, lat, lng } = body
    const suppliers = await discoverPotentialSuppliers(
      query || '',
      category_id ? parseInt(category_id) : null,
      city || '',
      lat,
      lng
    )

    return NextResponse.json({ suppliers, count: suppliers.length })
  } catch (error) {
    console.error('[Supplier Discovery POST]', error)
    return NextResponse.json({ error: 'Failed to trigger discovery' }, { status: 500 })
  }
}
