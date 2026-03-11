import { PrismaClient, Role, Condition, ListingType, MaterialStatus, TransportMethod, TransactionStatus, VehicleType, TransporterStatus, BookingStatus, Urgency, WantStatus, UserLevel, VerificationLevel, ReviewType, DisputeStatus, AgentName, RepairHubType, FraudStatus, RouteRecommendation } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed started...')

  // 1. Categories
  const categoriesData = [
    { name: 'Construction', slug: 'construction', icon: 'building', co2FactorKg: 0.9, landfillCostInrPerTonne: 1500, newCostInrPerUnit: 800, decompositionYears: 100, peakMonths: [10, 11, 12, 1, 2, 3], description: 'Surplus bricks, cement, steel rods, and other building materials.' },
    { name: 'Furniture & Office', slug: 'furniture-office', icon: 'armchair', co2FactorKg: 3.5, landfillCostInrPerTonne: 2000, newCostInrPerUnit: 15000, decompositionYears: 50, peakMonths: [5, 6, 7], description: 'Used desks, chairs, cabinets, and office equipment.' },
    { name: 'Packaging', slug: 'packaging', icon: 'box', co2FactorKg: 1.2, landfillCostInrPerTonne: 1200, newCostInrPerUnit: 500, decompositionYears: 20, peakMonths: [9, 10, 11], description: 'Cardboard boxes, pallets, crates, and wrapping materials.' },
    { name: 'Electronics', slug: 'electronics', icon: 'cpu', co2FactorKg: 20.0, landfillCostInrPerTonne: 8000, newCostInrPerUnit: 25000, decompositionYears: 1000, peakMonths: [10, 11], description: 'Computers, printers, cables, and other e-waste for repair or recycling.' },
    { name: 'Industrial Surplus', slug: 'industrial-surplus', icon: 'factory', co2FactorKg: 4.0, landfillCostInrPerTonne: 3000, newCostInrPerUnit: 10000, decompositionYears: 200, peakMonths: [1, 2, 3, 4], description: 'Machinery parts, factory surplus, and industrial chemicals/containers.' },
    { name: 'Textiles', slug: 'textiles', icon: 'shirt', co2FactorKg: 15.0, landfillCostInrPerTonne: 1800, newCostInrPerUnit: 350, decompositionYears: 40, peakMonths: [8, 9, 10], description: 'Fabric scraps, old uniforms, and other textile waste.' },
    { name: 'Metals & Scrap', slug: 'metals-scrap', icon: 'settings', co2FactorKg: 6.0, landfillCostInrPerTonne: 2500, newCostInrPerUnit: 40, decompositionYears: 1000, peakMonths: [10, 11, 12, 1, 2, 3], description: 'Steel scrap, copper wiring, and aluminum offcuts.' },
    { name: 'Wood & Timber', slug: 'wood-timber', icon: 'log', co2FactorKg: 1.8, landfillCostInrPerTonne: 1000, newCostInrPerUnit: 1200, decompositionYears: 15, peakMonths: [10, 11, 12, 1, 2], description: 'Wooden planks, timber offcuts, and sawdust.' },
  ]

  const categories = []
  for (const cat of categoriesData) {
    const createdCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    })
    categories.push(createdCat)
  }
  console.log('Categories created.')

  // 2. Users (Seed passwords with bcrypt)
  const passwordHash = await bcrypt.hash('password123', 12)
  const usersData = [
    { name: 'Admin User', email: 'admin@recircle.com', passwordHash, phone: '9876543210', role: Role.admin, city: 'Mumbai', greenPoints: 1000, level: UserLevel.forest, trustScore: 100, verificationLevel: VerificationLevel.trusted, address: 'Worli, Mumbai' },
    { name: 'BuildWell Corp', email: 'supply@buildwell.com', passwordHash, phone: '9876543211', role: Role.business, city: 'Mumbai', orgName: 'BuildWell Construction', greenPoints: 500, level: UserLevel.tree, trustScore: 85, verificationLevel: VerificationLevel.verified, address: 'Andheri East, Mumbai' },
    { name: 'Tech Solutions Pune', email: 'it@techsolutions.com', passwordHash, phone: '9876543212', role: Role.business, city: 'Pune', orgName: 'Tech Solutions Ltd', greenPoints: 300, level: UserLevel.sapling, trustScore: 70, verificationLevel: VerificationLevel.basic, address: 'Hinjewadi, Pune' },
    { name: 'Anita Sharma', email: 'anita@gmail.com', passwordHash, phone: '9876543213', role: Role.individual, city: 'Delhi', greenPoints: 150, level: UserLevel.sprout, trustScore: 60, verificationLevel: VerificationLevel.unverified, address: 'Dwarka, Delhi' },
    { name: 'Habitat for Humanity', email: 'ngo@habitat.org', passwordHash, phone: '9876543214', role: Role.ngo, city: 'Mumbai', orgName: 'Habitat for Humanity India', greenPoints: 800, level: UserLevel.forest, trustScore: 95, verificationLevel: VerificationLevel.trusted, address: 'Chembur, Mumbai' },
    { name: 'Rahul Courier', email: 'rahul@volunteer.com', passwordHash, phone: '9876543215', role: Role.volunteer, city: 'Delhi', greenPoints: 400, level: UserLevel.tree, trustScore: 80, address: 'Rohini, Delhi' },
    { name: 'Mumbai Transporters', email: 'mumbai@trans.com', passwordHash, phone: '9876543216', role: Role.transporter, city: 'Mumbai', orgName: 'Mumbai Logistics Co', greenPoints: 200, level: UserLevel.sapling, trustScore: 75, address: 'Vashi, Navi Mumbai' },
    { name: 'Arjun Singh', email: 'arjun@gmail.com', passwordHash, phone: '9876543217', role: Role.individual, city: 'Bangalore', greenPoints: 50, level: UserLevel.seedling, trustScore: 40, address: 'Indiranagar, Bangalore' },
  ]

  const users = []
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    })
    users.push(user)
  }
  console.log('Users created.')

  // 3. Transporters
  const mumbaiTrans = users.find(u => u.email === 'mumbai@trans.com')!
  const rahulVolunteer = users.find(u => u.email === 'rahul@volunteer.com')!

  await prisma.transporter.upsert({
    where: { userId: mumbaiTrans.id },
    update: {},
    create: {
      userId: mumbaiTrans.id,
      vehicleType: VehicleType.mini_truck,
      vehicleCapacityKg: 500,
      serviceAreaCity: 'Mumbai',
      serviceRadiusKm: 30,
      pricePerKm: 12,
      baseRate: 200,
      availabilityStatus: TransporterStatus.available,
    }
  })

  await prisma.transporter.upsert({
    where: { userId: rahulVolunteer.id },
    update: {},
    create: {
      userId: rahulVolunteer.id,
      vehicleType: VehicleType.bike,
      vehicleCapacityKg: 20,
      serviceAreaCity: 'Delhi',
      serviceRadiusKm: 15,
      pricePerKm: 0,
      baseRate: 0,
      isVolunteer: true,
      availabilityStatus: TransporterStatus.available,
    }
  })
  console.log('Transporters created.')

  // 4. Materials (Simplified list)
  const buildWell = users.find(u => u.email === 'supply@buildwell.com')!
  const constructionCat = categories.find(c => c.slug === 'construction')!

  await prisma.material.create({
    data: {
      userId: buildWell.id,
      categoryId: constructionCat.id,
      title: 'Surplus Bricks (500 pieces)',
      description: 'Leftover burnt clay bricks from recent project. Good condition, ready for pickup.',
      condition: Condition.good,
      quantity: 500,
      unit: 'pieces',
      weightKg: 1500,
      listingType: ListingType.sell,
      price: 2500,
      status: MaterialStatus.available,
      locationLat: 19.1136,
      locationLng: 72.8697, // Andheri East
      address: 'Near SEEPZ, Andheri East',
      city: 'Mumbai',
      images: ['https://images.unsplash.com/photo-1590069324154-04663e9f4577'],
      tags: ['bricks', 'construction', 'surplus'],
      co2SavedKg: 500 * 0.9,
      rupeesSaved: 500 * 5,
    }
  })

  // 5. Badges
  const badgesData = [
    { name: 'First Listing', slug: 'first-listing', icon: 'award', description: 'Created your first material listing', requirementType: 'count', requirementValue: 1 },
    { name: 'Waste Warrior', slug: 'waste-warrior', icon: 'shield', description: 'Diverted 100kg of waste from landfill', requirementType: 'weight', requirementValue: 100 },
    { name: 'Community Champion', slug: 'community-champion', icon: 'users', description: 'Completed 10 exchanges', requirementType: 'exchange_count', requirementValue: 10 },
  ]

  for (const badge of badgesData) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge,
    })
  }

  // 6. Repair Hubs
  const repairHubsData = [
    { name: 'Mumbai Makerspace', type: RepairHubType.makerspace, address: 'Santacruz West, Mumbai', locationLat: 19.0843, locationLng: 72.8360, categories: ['furniture-office', 'electronics'], website: 'https://mumbaimakerspace.com' },
    { name: 'Pune Repair Cafe', type: RepairHubType.workshop, address: 'Kothrud, Pune', locationLat: 18.5074, locationLng: 73.8077, categories: ['electronics', 'textiles'] },
  ]

  for (const hub of repairHubsData) {
    await prisma.repairHub.create({ data: hub })
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
