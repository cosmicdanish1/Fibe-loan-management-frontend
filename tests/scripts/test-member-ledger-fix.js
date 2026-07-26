const axios = require('axios');

async function testMemberLedgerAPI() {
  console.log('=== TESTING MEMBER LEDGER API FIX ===\n');
  
  // Test with a valid member number from the database
  const validMemberNo = '610033001'; // From our debug output
  const fromDate = '2020-01-01';
  const toDate = '2025-12-28';
  
  const apiUrl = `http://localhost:3001/api/v1/report/member-ledger?memberNo=${validMemberNo}&fromDate=${fromDate}&toDate=${toDate}`;
  
  console.log(`Testing API endpoint: ${apiUrl}\n`);
  
  try {
    const response = await axios.get(apiUrl);
    
    console.log('✅ API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Data length: ${response.data.length}`);
    
    if (response.data.length > 0) {
      console.log('\nSample response data:');
      console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
    } else {
      console.log('\nNo data returned for this member and date range.');
    }
    
  } catch (error) {
    console.log('❌ API call failed:');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || error.response.statusText}`);
      console.log('Response data:', error.response.data);
    } else {
      console.log(`Network error: ${error.message}`);
    }
  }
  
  // Also test with the original member number to show the difference
  console.log('\n=== Testing with original member number ===');
  const originalMemberNo = '610031566';
  const originalApiUrl = `http://localhost:3001/api/v1/report/member-ledger?memberNo=${originalMemberNo}&fromDate=${fromDate}&toDate=${toDate}`;
  
  console.log(`Testing API endpoint: ${originalApiUrl}\n`);
  
  try {
    const response = await axios.get(originalApiUrl);
    
    console.log('✅ API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Data length: ${response.data.length}`);
    
    if (response.data.length === 0) {
      console.log('No data found for member 610031566 - this member may not exist or have no transactions.');
    }
    
  } catch (error) {
    console.log('❌ API call failed:');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || error.response.statusText}`);
    } else {
      console.log(`Network error: ${error.message}`);
    }
  }
}

testMemberLedgerAPI().catch(console.error);