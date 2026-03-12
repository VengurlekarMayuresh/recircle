/**
 * India-specific sustainability calculations
 * CO2 savings based on CPCB & TERI India emission factors
 */

interface CategoryFactors {
  co2FactorKg: number        // kg CO2 per unit saved
  waterFactorLiters: number  // liters water saved per unit
  landfillCostInrPerTonne: number
  newCostInrPerUnit: number
  decompositionYears: number
}

export function calculateSustainabilityImpact(
  quantityKg: number,
  category: CategoryFactors,
  price: number = 0
): {
  co2SavedKg: number
  rupeesSaved: number
  waterSavedLiters: number
  landfillCostAvoided: number
  treeEquivalent: number
  greenPoints: number
} {
  // CO2 saved = weight in tonnes × CO2 factor
  const weightTonnes = quantityKg / 1000
  const co2SavedKg = weightTonnes * category.co2FactorKg * 1000

  // Rupees saved = new cost - transaction price (minimum 0)
  const rupeesSaved = Math.max(0, category.newCostInrPerUnit - price)

  // Water saved
  const waterSavedLiters = weightTonnes * category.waterFactorLiters * 1000

  // Landfill cost avoided
  const landfillCostAvoided = weightTonnes * category.landfillCostInrPerTonne

  // Tree equivalents: 1 tree absorbs ~21kg CO2/year
  const treeEquivalent = co2SavedKg / 21

  // Green points: 1 point per kg CO2 saved + 0.1 per ₹ rupee saved (capped)
  const greenPoints = Math.round(co2SavedKg + rupeesSaved * 0.001)

  return {
    co2SavedKg: Math.round(co2SavedKg * 100) / 100,
    rupeesSaved: Math.round(rupeesSaved),
    waterSavedLiters: Math.round(waterSavedLiters),
    landfillCostAvoided: Math.round(landfillCostAvoided),
    treeEquivalent: Math.round(treeEquivalent * 10) / 10,
    greenPoints: Math.max(1, greenPoints)
  }
}

/**
 * Quick estimate when full category factors aren't available
 */
export function quickCO2Estimate(weightKg: number, categorySlug: string): number {
  const factors: Record<string, number> = {
    'construction': 0.9,
    'furniture-office': 3.5,
    'packaging': 1.2,
    'electronics': 20.0,
    'industrial-surplus': 4.0,
    'textiles': 15.0,
    'metals-scrap': 6.0,
    'wood-timber': 1.8,
  }
  const factor = factors[categorySlug] || 2.0
  return (weightKg / 1000) * factor * 1000
}
