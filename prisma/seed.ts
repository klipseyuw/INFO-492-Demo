import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: 'admin@logistics-defense.com' },
    update: {},
    create: {
      id: 'user-1',
      email: 'admin@logistics-defense.com',
      name: 'Admin User',
      agentActive: false,
    },
  })

  // Create sample shipments
  const shipments = [
    {
      routeId: 'R-001',
      driverName: 'John Smith',
      expectedETA: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      actualETA: null,
      routeStatus: 'in-progress'
    },
    {
      routeId: 'R-002',
      driverName: 'Sarah Johnson',
      expectedETA: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      actualETA: null,
      routeStatus: 'in-progress'
    },
    {
      routeId: 'R-003',
      driverName: 'Mike Wilson',
      expectedETA: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      actualETA: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      routeStatus: 'completed'
    },
    {
      routeId: 'R-004',
      driverName: 'Lisa Brown',
      expectedETA: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      actualETA: null,
      routeStatus: 'delayed'
    }
  ]

  for (const shipmentData of shipments) {
    await prisma.shipment.create({
      data: shipmentData,
    })
  }

  // Create sample alerts
  const alerts = [
    {
      shipmentId: 'R-004',
      type: 'Route Deviation',
      severity: 'high',
      description: 'Shipment R-004 has deviated from expected route by more than 10 miles'
    },
    {
      shipmentId: 'R-002',
      type: 'Delay Warning',
      severity: 'medium',
      description: 'Shipment R-002 may experience delays due to traffic conditions'
    },
    {
      shipmentId: 'R-001',
      type: 'Security Check',
      severity: 'low',
      description: 'Routine security verification completed for shipment R-001'
    }
  ]

  for (const alertData of alerts) {
    await prisma.alert.create({
      data: alertData,
    })
  }

  console.log('Database seeded with sample data!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })