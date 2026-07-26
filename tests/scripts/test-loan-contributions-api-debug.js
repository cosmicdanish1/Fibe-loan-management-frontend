const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testLoanContributionsAPI() {
  console.log('🔍 LOAN CONTRIBUTIONS API DEBUG TEST');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if the endpoint exists with minimal params
    console.log('\n📊 Test 1: Basic endpoint test');
    try {
      const response = await axios.get(`${API_BASE_URL}/report/loan-contributions-register?memberNo=1&fromDate=2020-01-01&toDate=2020-01-02`);
      console.log('✅ Endpoint exists and responds');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Endpoint error:', error.response?.status, error.response?.data?.message || error.message);
      
      if (error.response?.status === 404) {
        console.log('🔍 Checking available routes...');
        
        // Try to get available routes
        try {
          const routesResponse = await axios.get(`${API_BASE_URL}/report`);
          console.log('Available routes response:', routesResponse.status);
        } catch (routeError) {
          console.log('Routes check error:', routeError.response?.status);
        }
      }
    }

    // Test 2: Check if other report endpoints work
    console.log('\n📊 Test 2: Testing other report endpoints');
    const testEndpoints = [
      'cash-book-monthly',
      'detail-ledger',
      'member-statement'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}/report/${endpoint}?memberNo=1&fromDate=2020-01-01&toDate=2020-01-02`);
        console.log(`✅ ${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'Connection error'}`);
      }
    }

    // Test 3: Check server info
    console.log('\n📊 Test 3: Server information');
    try {
      const response = await axios.get(`${API_BASE_URL}`);
      console.log('Root endpoint status:', response.status);
    } catch (error) {
      console.log('Root endpoint error:', error.response?.status || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLoanContributionsAPI().catch(console.error);