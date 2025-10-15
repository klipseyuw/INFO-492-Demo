// Test authentication system
// Run with: node tests/test-auth.js

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication System\n');

  try {
    // Test 1: Send verification code
    console.log('1️⃣ Testing: Send verification code...');
    const sendResponse = await fetch(`${BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });

    const sendData = await sendResponse.json();
    console.log('Response:', sendData);

    if (!sendData.success) {
      console.error('❌ Failed to send code:', sendData.error);
      return;
    }

    console.log('✅ Code sent successfully');
    
    if (sendData.testCode) {
      console.log(`\n🔐 Verification Code: ${sendData.testCode}\n`);

      // Test 2: Verify code
      console.log('2️⃣ Testing: Verify code...');
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'test@example.com',
          code: sendData.testCode 
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('Response:', verifyData);

      if (verifyData.success) {
        console.log('✅ Verification successful');
        console.log('👤 User:', verifyData.user);

        // Extract cookie for subsequent requests
        const cookies = verifyResponse.headers.get('set-cookie');
        console.log('\n🍪 Cookie set:', cookies ? 'Yes' : 'No');

        console.log('\n✅ Authentication system is working correctly!');
      } else {
        console.error('❌ Verification failed:', verifyData.error);
      }
    } else {
      console.log('⚠️ No test code returned (might be production mode)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure the dev server is running:');
    console.error('  npm run dev');
  }
}

testAuth();

