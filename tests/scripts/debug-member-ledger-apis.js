const axios = require('axios');

async function debugMemberLedgerAPIs() {
  try {
    console.log('🔍 DEBUGGING MEMBER LEDGER APIs');
    console.log('=' .repeat(50));
    
    // Test Head Masters API
    console.log('\n1. Testing Head Masters API');
    console.log('-'.repeat(30));
    const headMastersResponse = await axios.get('http://localhost:3000/api/v1/member-ledger/head-masters');
    console.log('Status:', headMastersResponse.status);
    console.log('Full Response:');
    console.log(JSON.stringify(headMastersResponse.data, null, 2));
    
    // Test Member Validation API
    console.log('\n2. Testing Member Validation API');
    console.log('-'.repeat(30));
    const validateResponse = await axios.get('http://localhost:3000/api/v1/member-ledger/validate-member?memberNumber=1001');
    console.log('Status:', validateResponse.status);
    console.log('Full Response:');
    console.log(JSON.stringify(validateResponse.data, null, 2));
    
    // Test Member Ledger Report API
    console.log('\n3. Testing Member Ledger Report API');
    console.log('-'.repeat(30));
    const reportResponse = await axios.get('http://localhost:3000/api/v1/member-ledger/report?memberNumber=1001&headCode=A001&fromDate=2024-12-01&toDate=2024-12-24&outputType=screen');
    console.log('Status:', reportResponse.status);
    console.log('Full Response:');
    console.log(JSON.stringify(reportResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    }
  }
}

debugMemberLedgerAPIs();