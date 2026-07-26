const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAnalyticsEndpoints() {
  console.log('🔍 Testing Analytics Endpoints...\n');

  try {
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/analytics/health`);
    console.log('✅ Health check response:', healthResponse.data);

    // Test status endpoint
    console.log('\n2. Testing status endpoint...');
    const statusResponse = await axios.get(`${BASE_URL}/analytics/status`);
    console.log('✅ Status response:', statusResponse.data);

    // Test users endpoint
    console.log('\n3. Testing users endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/analytics/users?limit=5`);
    console.log('✅ Users response:', usersResponse.data);

    console.log('\n✅ All analytics endpoints are working!');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend server is not running. Please start it with: npm run start:dev');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAnalyticsEndpoints();