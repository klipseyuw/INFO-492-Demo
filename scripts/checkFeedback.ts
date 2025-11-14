import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFeedback() {
  try {
    const alertFeedback = await prisma.alertFeedback.findMany();
    console.log('AlertFeedback count:', alertFeedback.length);
    
    const analysisFeedback = await prisma.analysisFeedback.findMany();
    console.log('AnalysisFeedback count:', analysisFeedback.length);
    
    const analyses = await prisma.analysis.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Recent analyses:', JSON.stringify(analyses.map(a => ({
      id: a.id,
      riskScore: a.riskScore,
      severity: a.severity
    })), null, 2));
    
    const alerts = await prisma.alert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Recent alerts:', alerts.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeedback();
