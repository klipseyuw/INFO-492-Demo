import axios from 'axios';

async function testAIDetection() {
  console.log('🔍 Testing AI Threat Detection...\n');
  const suspiciousShipment = {
    routeId: 'TEST-THREAT-001',
    driverName: 'Test Driver',
    expectedETA: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actualETA: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    userId: 'user-1'
  };
  try {
    console.log('📦 Sending suspicious shipment data:');
    console.log(`   Route: ${suspiciousShipment.routeId}`);
    console.log(`   Expected ETA: ${suspiciousShipment.expectedETA}`);
    console.log(`   Actual ETA: ${suspiciousShipment.actualETA}`);
    console.log(`   Delay: ~3 hours (HIGHLY SUSPICIOUS)\n`);
    const response = await axios.post('http://localhost:3000/api/ai', suspiciousShipment);
    console.log('🤖 AI Response:');
    console.log(JSON.stringify(response.data, null, 2));
    if (response.data.riskScore > 20) {
      console.log(`\n🚨 THREAT DETECTED! Risk Score: ${response.data.riskScore}%`);
      console.log(`   Alert Type: ${response.data.alertType}`);
      console.log(`   Description: ${response.data.description}`);
    } else {
      console.log(`\n❌ No threat detected. Risk Score: ${response.data.riskScore}%`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  testAIDetection();
}

export { testAIDetection };
