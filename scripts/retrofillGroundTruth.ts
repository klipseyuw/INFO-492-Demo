import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const updated = await prisma.analysis.updateMany({
    where: { groundTruthIsAttack: null },
    data: { groundTruthIsAttack: false }
  });
  console.log(`Retrofilled analyses with null groundTruthIsAttack -> false: ${updated.count}`);
}

run().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
