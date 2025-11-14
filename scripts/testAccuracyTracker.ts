import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAccuracy() {
  try {
    // Get recent analyses
    const analyses = await prisma.analysis.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${analyses.length} recent analyses`);

    // Add some test feedback if we have analyses
    for (const analysis of analyses) {
      const existingFeedback = await prisma.analysisFeedback.findUnique({
        where: { analysisId: analysis.id }
      });

      if (!existingFeedback) {
        await prisma.analysisFeedback.create({
          data: {
            analysisId: analysis.id,
            riskScoreAccurate: Math.random() > 0.3, // 70% accurate
            attackTypeCorrect: Math.random() > 0.3,
            valuePreference: 'balanced'
          }
        });
        console.log(`✓ Added feedback for analysis ${analysis.id}`);
      } else {
        console.log(`- Feedback already exists for ${analysis.id}`);
      }
    }

    // Check the metrics endpoint
    console.log('\n--- Checking Accuracy Metrics ---');
    const allFeedback = await prisma.analysisFeedback.findMany();
    const alertFeedback = await prisma.alertFeedback.findMany();
    
    console.log(`Total AnalysisFeedback: ${allFeedback.length}`);
    console.log(`Total AlertFeedback: ${alertFeedback.length}`);
    
    const accurate = allFeedback.filter(f => f.riskScoreAccurate && f.attackTypeCorrect).length;
    const rate = allFeedback.length > 0 ? ((accurate / allFeedback.length) * 100).toFixed(1) : 'N/A';
    
    console.log(`Accuracy: ${rate}% (${accurate}/${allFeedback.length})`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAccuracy();
