/**
 * Trust Score computation for ReCircle users
 * Score ranges 0-100
 */

export type VerificationLevel = 'unverified' | 'basic' | 'verified' | 'trusted'

interface UserStats {
  totalTransactions: number
  completedTransactions: number
  avgRating: number
  totalRatings: number
  verificationLevel: VerificationLevel
  idVerified: boolean
  accountAgeDays: number
  disputesRaised: number
  disputesAgainst: number
}

export function computeTrustScore(stats: UserStats): number {
  let score = 0

  // Verification level (max 25)
  const verificationScores: Record<VerificationLevel, number> = {
    unverified: 0,
    basic: 10,
    verified: 20,
    trusted: 25
  }
  score += verificationScores[stats.verificationLevel]

  // ID verification bonus (+5)
  if (stats.idVerified) score += 5

  // Rating score (max 30)
  if (stats.totalRatings > 0) {
    const ratingScore = (stats.avgRating / 5) * 30
    // Weight by number of ratings (more ratings = more reliable)
    const reliabilityFactor = Math.min(stats.totalRatings / 10, 1)
    score += ratingScore * reliabilityFactor
  }

  // Transaction completion rate (max 20)
  if (stats.totalTransactions > 0) {
    const completionRate = stats.completedTransactions / stats.totalTransactions
    score += completionRate * 20
  }

  // Account age (max 10)
  const ageScore = Math.min(stats.accountAgeDays / 365, 1) * 10
  score += ageScore

  // Dispute penalty (-5 per dispute raised against, -2 per dispute filed)
  score -= stats.disputesAgainst * 5
  score -= stats.disputesRaised * 2

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getTrustLabel(score: number): string {
  if (score >= 80) return 'Highly Trusted'
  if (score >= 60) return 'Trusted'
  if (score >= 40) return 'Verified'
  if (score >= 20) return 'Basic'
  return 'New User'
}

export function getTrustColor(score: number): string {
  if (score >= 80) return 'emerald'
  if (score >= 60) return 'green'
  if (score >= 40) return 'blue'
  if (score >= 20) return 'yellow'
  return 'gray'
}

export function getVerificationBadge(level: VerificationLevel): {
  label: string
  color: string
  icon: string
} {
  const badges = {
    unverified: { label: 'Unverified', color: 'gray', icon: '⚪' },
    basic: { label: 'Basic', color: 'yellow', icon: '🟡' },
    verified: { label: 'Verified', color: 'blue', icon: '🔵' },
    trusted: { label: 'Trusted', color: 'emerald', icon: '✅' },
  }
  return badges[level]
}
