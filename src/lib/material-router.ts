export type RouteType = 'reuse' | 'repair' | 'recycle' | 'dispose'

export interface RouteRecommendation {
  route: RouteType
  reason: string
  action: string
  priority_badge?: boolean
  repair_hub?: { name: string; distance_km: number; estimated_cost: number } | null
  scrap_value?: { per_kg: number; total: number; currency: string } | null
  extra_data?: Record<string, any>
}

/**
 * Decision tree to route a material based on condition and category.
 */
export function routeMaterial(
  condition: string,
  categorySlug: string,
  weightKg: number = 0,
  isHighDemand: boolean = false
): RouteRecommendation {
  // E-waste → always dispose per CPCB guidelines
  if (categorySlug === 'electronics') {
    return {
      route: 'dispose',
      reason: 'E-waste requires safe disposal per CPCB guidelines',
      action: 'Show nearest e-waste collection centers',
      extra_data: {
        cpcb_link: 'https://cpcb.nic.in',
        nearby_centers: [
          { name: 'E-Waste Collection Center', city: 'Mumbai', address: 'Dharavi, Mumbai' },
          { name: 'Manufacturer Take-Back', city: 'Bangalore', address: 'Electronics City' }
        ]
      }
    }
  }

  // New/Like New/Good → Reuse
  if (['new', 'like_new', 'good'].includes(condition)) {
    return {
      route: 'reuse',
      reason: 'Material is in excellent reusable condition',
      action: 'List on marketplace for direct reuse',
      priority_badge: isHighDemand,
      extra_data: isHighDemand ? { badge: 'High Demand', boost: true } : undefined
    }
  }

  // Fair → Repair
  if (condition === 'fair') {
    return {
      route: 'repair',
      reason: 'Material can be restored to full functionality with minor repairs',
      action: 'Find nearest repair hub + estimated repair cost',
      repair_hub: {
        name: 'Mumbai Makerspace',
        distance_km: 2.3,
        estimated_cost: 500
      }
    }
  }

  // Salvage → Recycle
  if (condition === 'salvage') {
    const scrapRates: Record<string, number> = {
      'metals-scrap': 40,
      'wood-timber': 8,
      'construction': 5,
      'packaging': 3,
      'textiles': 10,
      'industrial-surplus': 20,
      'furniture-office': 6,
    }
    const perKg = scrapRates[categorySlug] || 10
    return {
      route: 'recycle',
      reason: 'Material is best suited for recycling or scrap value recovery',
      action: 'Show scrap value estimate + nearest recycling partner',
      scrap_value: {
        per_kg: perKg,
        total: weightKg * perKg,
        currency: 'INR'
      }
    }
  }

  // Default fallback
  return {
    route: 'reuse',
    reason: 'Material may have reuse potential',
    action: 'List on marketplace'
  }
}

export const ROUTE_COLORS: Record<RouteType, string> = {
  reuse: 'emerald',
  repair: 'amber',
  recycle: 'blue',
  dispose: 'red'
}

export const ROUTE_ICONS: Record<RouteType, string> = {
  reuse: '♻️',
  repair: '🔧',
  recycle: '🔄',
  dispose: '🗑️'
}
