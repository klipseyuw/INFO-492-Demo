import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const [activities, shipments, alerts, analyses, users] = await Promise.all([
    prisma.agentActivity.count(),
    prisma.shipment.count(),
    prisma.alert.count(),
    prisma.analysis.count(),
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, agentActive: true, continuousSimActive: true }
    })
  ]);

  console.log('=== Database Status ===');
  console.log(`Agent Activities: ${activities}`);
  console.log(`Shipments: ${shipments}`);
  console.log(`Alerts: ${alerts}`);
  console.log(`Analyses: ${analyses}`);
  console.log('\nAdmin Users:');
  users.forEach(u => {
    console.log(`  - ${u.email}: agentActive=${u.agentActive}, continuousSimActive=${u.continuousSimActive}`);
  });

  await prisma.$disconnect();
}

check();
