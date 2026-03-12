import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function test() {
  try {
    const count = await (prisma as any).businessWasteStream.count()
    console.log('BusinessWasteStream count:', count)
    process.exit(0)
  } catch (e) {
    console.error('BusinessWasteStream count failed:', e.message)
    process.exit(1)
  }
}
test()
