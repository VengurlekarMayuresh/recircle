import { prisma } from '@/lib/prisma'
import { haversineDistance } from '@/lib/haversine'

export interface PotentialSupplier {
  userId: string
  name: string
  email: string
  city: string
  orgName: string | null
  avatarUrl: string | null
  avgRating: number
  trustScore: number
  verificationLevel: string
  pastListingCount: number
  lastListedAt: Date | null
  distanceKm: number | null
  likelihoodScore: number
  suggestedMessage: string
}

export async function discoverPotentialSuppliers(
  query: string,
  categoryId: number | null,
  city: string,
  requestLat?: number,
  requestLng?: number
): Promise<PotentialSupplier[]> {
  // 1. Find users who have listed materials in the same category (including archived/claimed)
  const where: any = {}
  if (categoryId) where.categoryId = categoryId

  const pastListings = await prisma.material.findMany({
    where,
    select: {
      userId: true,
      createdAt: true,
      city: true,
      title: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          city: true,
          orgName: true,
          avatarUrl: true,
          avgRating: true,
          trustScore: true,
          verificationLevel: true,
          locationLat: true,
          locationLng: true,
          role: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 2. Aggregate by user
  const userMap = new Map<string, {
    user: typeof pastListings[0]['user'],
    count: number,
    lastListedAt: Date | null,
    cities: Set<string>
  }>()

  for (const listing of pastListings) {
    const existing = userMap.get(listing.userId)
    if (existing) {
      existing.count++
      existing.cities.add(listing.city)
      if (!existing.lastListedAt || listing.createdAt > existing.lastListedAt) {
        existing.lastListedAt = listing.createdAt
      }
    } else {
      userMap.set(listing.userId, {
        user: listing.user,
        count: 1,
        lastListedAt: listing.createdAt,
        cities: new Set([listing.city])
      })
    }
  }

  // 3. Score and filter
  const results: PotentialSupplier[] = []
  const queryLower = query.toLowerCase()

  for (const [userId, data] of userMap) {
    const { user, count, lastListedAt, cities } = data

    // Skip admins
    if (user.role === 'admin') continue

    // Distance score
    let distanceKm: number | null = null
    let proximityScore = 0.5 // default if no coords

    if (requestLat && requestLng && user.locationLat && user.locationLng) {
      distanceKm = haversineDistance(requestLat, requestLng, user.locationLat, user.locationLng)
      proximityScore = distanceKm <= 10 ? 1.0 :
                       distanceKm <= 25 ? 0.8 :
                       distanceKm <= 50 ? 0.6 : 0.3
    } else if (user.city.toLowerCase() === city.toLowerCase() || cities.has(city)) {
      proximityScore = 0.85
    }

    // Past listing score (0-1, normalized to max 10 listings)
    const listingScore = Math.min(count / 10, 1.0)

    // Rating score (0-1)
    const ratingScore = user.avgRating > 0 ? user.avgRating / 5 : 0.5

    // Trust score (0-1)
    const trustNorm = Math.min(user.trustScore / 100, 1.0)

    // Recency bonus
    const daysSinceLastListing = lastListedAt
      ? (Date.now() - new Date(lastListedAt).getTime()) / 86400000
      : 365
    const recencyScore = daysSinceLastListing < 30 ? 1.0 :
                         daysSinceLastListing < 90 ? 0.8 :
                         daysSinceLastListing < 180 ? 0.6 : 0.4

    // Composite score: listing 30% + rating 25% + trust 25% + proximity 20%
    const likelihood = Math.round(
      (listingScore * 30 + ratingScore * 25 + trustNorm * 25 + proximityScore * 20) * 100
    ) / 100

    const cityDisplay = distanceKm !== null
      ? `${distanceKm.toFixed(0)}km away`
      : user.city === city ? 'same city' : `${user.city}`

    const suggestedMessage = `Hi ${user.name.split(' ')[0]}, we noticed you have previously listed ${categoryId ? 'similar materials' : 'materials'} on ReCircle. A user near you is looking for "${query.slice(0, 50)}". Do you have any available? Reply to let them know!`

    results.push({
      userId,
      name: user.name,
      email: user.email,
      city: user.city,
      orgName: user.orgName,
      avatarUrl: user.avatarUrl,
      avgRating: user.avgRating,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      pastListingCount: count,
      lastListedAt,
      distanceKm,
      likelihoodScore: likelihood,
      suggestedMessage
    })
  }

  // Sort by likelihood score
  results.sort((a, b) => b.likelihoodScore - a.likelihoodScore)
  return results.slice(0, 10)
}

export async function triggerSupplierDiscovery(wantRequestId: number): Promise<void> {
  const wantRequest = await prisma.wantRequest.findUnique({
    where: { id: wantRequestId },
    include: { category: true, user: true }
  })
  if (!wantRequest) return

  const suppliers = await discoverPotentialSuppliers(
    wantRequest.title,
    wantRequest.categoryId,
    wantRequest.user.city,
    wantRequest.locationLat,
    wantRequest.locationLng
  )

  // Notify top 5 potential suppliers
  for (const supplier of suppliers.slice(0, 5)) {
    if (supplier.userId === wantRequest.userId) continue // don't notify the requester themselves

    await prisma.notification.create({
      data: {
        userId: supplier.userId,
        type: 'supplier_discovery',
        title: 'Someone near you needs materials you may have 📦',
        body: `${wantRequest.user.name} is looking for "${wantRequest.title}" in ${wantRequest.user.city}. Do you have this?`,
        data: JSON.stringify({
          wantRequestId: wantRequest.id,
          query: wantRequest.title,
          categoryId: wantRequest.categoryId,
          city: wantRequest.user.city,
          type: 'discovery'
        })
      }
    }).catch(() => {})
  }

  // Log
  await prisma.agentLog.create({
    data: {
      agentName: 'scout',
      action: 'supplier_discovery',
      details: JSON.stringify({
        wantRequestId,
        suppliersFound: suppliers.length,
        notified: Math.min(suppliers.length, 5)
      })
    }
  }).catch(() => {})
}
