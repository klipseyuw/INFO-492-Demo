import axios from 'axios';
import { config } from 'dotenv';

config();

async function testAccuracyEndpoint() {
  try {
    // Authenticate
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: process.env.DEMO_ADMIN_EMAIL,
      password: process.env.DEMO_ADMIN_PASSWORD
    });

    const setCookie = loginRes.headers['set-cookie'];
    const cookie = setCookie ? setCookie[0].split(';')[0] : '';

    // Test accuracy endpoint
    const res = await axios.get('http://localhost:3000/api/metrics/accuracy?days=7', {
      headers: { Cookie: cookie }
    });

    console.log('Accuracy Metrics Response:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

testAccuracyEndpoint();
