const axios = require('axios');

async function testFDStatement() {
  const baseURL = 'http://localhost:3000/api/v1';
  
  try {
    console.log('Testing Fixed Deposit Statement API...');
    
    // Test with a sample member number and date range
    const response = await axios.get(`${baseURL}/report/fd-statement`, {
      params: {
        memberNo: '1001',
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-12-31T23:59:59.999Z',
        headCode: 'FD01'
      }
    });
    
    console.log('✅ FD Statement API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Test with different scenarios
async function runTests() {
  console.log('=== Fixed Deposit Statement API Tests ===\n');
  
  // Test 1: Valid member with FD
  console.log('Test 1: Valid member number with date range');
  await testFDStatement();
  
  console.log('\n' + '='.repeat(50));
  
  // Test 2: Different date range
  console.log('\nTest 2: Different date range');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/report/fd-statement', {
      params: {
        memberNo: '1001',
        fromDate: '2023-01-01T00:00:00.000Z',
        toDate: '2023-12-31T23:59:59.999Z',
        headCode: 'FD01'
      }
    });
    
    console.log('✅ FD Statement Response (2023):');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Test 3: Invalid member number
  console.log('\nTest 3: Invalid member number');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/report/fd-statement', {
      params: {
        memberNo: '99999',
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-12-31T23:59:59.999Z',
        headCode: 'FD01'
      }
    });
    
    console.log('✅ Response for invalid member:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Expected Error for invalid member:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Wait a bit for server to start, then run tests
setTimeout(runTests, 3000);