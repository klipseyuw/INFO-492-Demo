import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('🧹 Clearing shipments and alerts data...');
    
    // Delete all alerts first (due to potential foreign key constraints)
    const deletedAlerts = await prisma.alert.deleteMany({});
    console.log(`✅ Deleted ${deletedAlerts.count} alerts`);
    
    // Delete all shipments
    const deletedShipments = await prisma.shipment.deleteMany({});
    console.log(`✅ Deleted ${deletedShipments.count} shipments`);
    
    console.log('🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();