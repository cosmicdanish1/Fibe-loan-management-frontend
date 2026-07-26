const axios = require('axios');

async function testFDCertificate() {
  const baseURL = 'http://localhost:3000/api/v1';
  
  try {
    console.log('Testing Fixed Deposit Certificate API...');
    
    // Test with a sample member number
    const response = await axios.get(`${baseURL}/report/fd-certificate`, {
      params: {
        memberNo: '1001',
        outputType: 'screen'
      }
    });
    
    console.log('✅ FD Certificate API Response:');
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
  console.log('=== Fixed Deposit Certificate API Tests ===\n');
  
  // Test 1: Valid member with FD
  console.log('Test 1: Valid member number');
  await testFDCertificate();
  
  console.log('\n' + '='.repeat(50));
  
  // Test 2: Member with certificate number
  console.log('\nTest 2: Member with specific certificate number');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/report/fd-certificate', {
      params: {
        memberNo: '1001',
        certificateNo: 'FD001',
        outputType: 'screen'
      }
    });
    
    console.log('✅ FD Certificate with Cert No Response:');
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
    const response = await axios.get('http://localhost:3000/api/v1/report/fd-certificate', {
      params: {
        memberNo: '99999',
        outputType: 'screen'
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