import axios from 'axios';

async function testNormalShipment() {
  console.log('🔍 Testing Normal Shipment Detection...\n');
  const normalShipment = {
    routeId: 'TEST-NORMAL-001',
    driverName: 'Normal Driver',
    expectedETA: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    actualETA: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    userId: 'user-1'
  };
  try {
    console.log('📦 Sending normal shipment data:');
    console.log(`   Route: ${normalShipment.routeId}`);
    console.log(`   Expected ETA: ${normalShipment.expectedETA}`);
    console.log(`   Actual ETA: ${normalShipment.actualETA}`);
    console.log(`   Delay: ~5 minutes (NORMAL)\n`);
    const response = await axios.post('http://localhost:3000/api/ai', normalShipment);
    console.log('🤖 AI Response:');
    console.log(JSON.stringify(response.data, null, 2));
    if (response.data.riskScore > 20) {
      console.log(`\n🚨 THREAT DETECTED! Risk Score: ${response.data.riskScore}%`);
      console.log(`   Alert Type: ${response.data.alertType}`);
      console.log(`   Description: ${response.data.description}`);
    } else {
      console.log(`\n✅ Normal operation. Risk Score: ${response.data.riskScore}%`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  testNormalShipment();
}

export { testNormalShipment };
