/**
 * Green Points (GP) gamification system
 * Awards points for circular economy actions
 */

export const GP_REWARDS = {
  // Listing actions
  CREATE_LISTING: 10,
  CREATE_LISTING_WITH_PHOTO: 15,
  LISTING_DONATED: 50,
  LISTING_SOLD: 20,
  LISTING_EXCHANGED: 30,

  // Transaction actions
  COMPLETE_TRANSACTION: 25,
  FIRST_TRANSACTION: 100,

  // Community
  LEAVE_REVIEW: 5,
  RECEIVE_5_STAR: 10,
  INVITE_USER: 20,
  WANT_REQUEST_FULFILLED: 15,

  // Milestones (bonus)
  KG_CO2_SAVED_PER_KG: 1,        // 1 GP per kg CO2 saved
  RUPEES_SAVED_PER_1000: 1,       // 1 GP per ₹1000 saved
} as const

export const LEVELS = [
  { level: 'seedling', minPoints: 0, maxPoints: 99, label: 'Seedling 🌱' },
  { level: 'sprout', minPoints: 100, maxPoints: 499, label: 'Sprout 🌿' },
  { level: 'sapling', minPoints: 500, maxPoints: 1999, label: 'Sapling 🌳' },
  { level: 'tree', minPoints: 2000, maxPoints: 9999, label: 'Tree 🌲' },
  { level: 'forest', minPoints: 10000, maxPoints: Infinity, label: 'Forest 🌳🌲🌿' },
] as const

export type UserLevel = 'seedling' | 'sprout' | 'sapling' | 'tree' | 'forest'

export function getLevelFromPoints(points: number): UserLevel {
  for (const l of [...LEVELS].reverse()) {
    if (points >= l.minPoints) return l.level as UserLevel
  }
  return 'seedling'
}

export function getNextLevelInfo(points: number): {
  currentLevel: UserLevel
  nextLevel: UserLevel | null
  pointsToNext: number | null
  progress: number
} {
  const current = LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints)
  const idx = LEVELS.findIndex(l => l.level === current?.level)
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null

  if (!current) return { currentLevel: 'seedling', nextLevel: 'sprout', pointsToNext: 100, progress: 0 }

  const progress = next
    ? ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100
    : 100

  return {
    currentLevel: current.level as UserLevel,
    nextLevel: next?.level as UserLevel | null,
    pointsToNext: next ? next.minPoints - points : null,
    progress: Math.min(100, Math.round(progress))
  }
}

// --------------- Volunteer Delivery Points ---------------

export interface VolunteerDeliveryInput {
  distanceKm: number
  weightKg?: number | null
  rating?: number | null
}

/**
 * Calculate green points for a completed volunteer delivery.
 *
 * Formula:
 *   base              = 50
 *   + distanceKm × 5
 *   + weightKg × 2    (if provided)
 *   + 20 bonus        (if rating >= 4)
 *   × 1.5 streak      (3+ deliveries in last 7 days)
 */
export function calculateVolunteerDeliveryPoints(
  input: VolunteerDeliveryInput,
  recentDeliveryCount: number
): number {
  let points = 50
  points += Math.round(input.distanceKm * 5)
  if (input.weightKg && input.weightKg > 0) {
    points += Math.round(input.weightKg * 2)
  }
  if (input.rating && input.rating >= 4) {
    points += 20
  }
  // Streak bonus: 3+ deliveries in last 7 days
  if (recentDeliveryCount >= 3) {
    points = Math.round(points * 1.5)
  }
  return points
}

export function calculateListingPoints(
  listingType: string,
  hasPhoto: boolean,
  co2SavedKg: number,
  rupeesSaved: number
): number {
  let points = hasPhoto ? GP_REWARDS.CREATE_LISTING_WITH_PHOTO : GP_REWARDS.CREATE_LISTING

  if (listingType === 'donate') points += GP_REWARDS.LISTING_DONATED - GP_REWARDS.CREATE_LISTING
  else if (listingType === 'exchange') points += GP_REWARDS.LISTING_EXCHANGED - GP_REWARDS.CREATE_LISTING
  else points += GP_REWARDS.LISTING_SOLD - GP_REWARDS.CREATE_LISTING

  points += Math.floor(co2SavedKg * GP_REWARDS.KG_CO2_SAVED_PER_KG)
  points += Math.floor(rupeesSaved / 1000) * GP_REWARDS.RUPEES_SAVED_PER_1000

  return Math.max(1, points)
}
