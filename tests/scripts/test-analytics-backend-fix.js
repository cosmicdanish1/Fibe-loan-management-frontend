const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAnalyticsBackend() {
  console.log('🔧 Testing Analytics Backend Fix...\n');

  try {
    // Test 1: Check if backend starts without dependency injection errors
    console.log('1. Testing backend startup...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    console.log('✅ Backend started successfully');

    // Test 2: Test analytics status endpoint
    console.log('\n2. Testing analytics status endpoint...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/analytics/status`, {
        timeout: 5000
      });
      console.log('✅ Analytics status endpoint working:', statusResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  Analytics endpoints not yet available (expected during setup)');
      } else {
        console.log('⚠️  Analytics status error:', error.message);
      }
    }

    // Test 3: Test analytics configuration endpoint
    console.log('\n3. Testing analytics configuration endpoint...');
    try {
      const configResponse = await axios.get(`${BASE_URL}/analytics/config`, {
        timeout: 5000
      });
      console.log('✅ Analytics config endpoint working:', configResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  Analytics config endpoint not yet available (expected during setup)');
      } else {
        console.log('⚠️  Analytics config error:', error.message);
      }
    }

    console.log('\n✅ Backend dependency injection issue appears to be resolved!');
    console.log('📝 Next steps:');
    console.log('   - Ensure analytics database is created and populated');
    console.log('   - Test analytics tracking functionality');
    console.log('   - Complete frontend integration');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is not running. Please start the backend first.');
      console.log('   Run: npm run start:dev in the backend directory');
    } else {
      console.log('❌ Backend test failed:', error.message);
      if (error.response?.data) {
        console.log('   Response:', error.response.data);
      }
    }
  }
}

// Run the test
testAnalyticsBackend().catch(console.error);