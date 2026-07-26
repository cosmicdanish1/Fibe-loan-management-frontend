const axios = require('axios');

async function testMemberLedgerResponseStructure() {
  console.log('=== TESTING MEMBER LEDGER RESPONSE STRUCTURE ===\n');
  
  // Test with a valid member number
  const memberNo = '610033001';
  const fromDate = '2022-01-01';
  const toDate = '2023-12-31';
  
  const apiUrl = `http://localhost:3001/api/v1/report/member-ledger?memberNo=${memberNo}&fromDate=${fromDate}&toDate=${toDate}`;
  
  try {
    const response = await axios.get(apiUrl);
    
    console.log('✅ API Response Status:', response.status);
    console.log('Response Headers:', response.headers['content-type']);
    
    if (response.data) {
      console.log('\n=== RESPONSE STRUCTURE ANALYSIS ===');
      console.log('Response Type:', typeof response.data);
      console.log('Is Array:', Array.isArray(response.data));
      
      if (Array.isArray(response.data)) {
        console.log('Array Length:', response.data.length);
        
        if (response.data.length > 0) {
          console.log('\n=== SAMPLE RECORD STRUCTURE ===');
          const sample = response.data[0];
          console.log('Sample Record:', JSON.stringify(sample, null, 2));
          
          console.log('\n=== AVAILABLE FIELDS ===');
          Object.keys(sample).forEach((key, index) => {
            console.log(`${index + 1}. ${key}: ${typeof sample[key]} = "${sample[key]}"`);
          });
          
          console.log('\n=== FRONTEND EXPECTED FIELDS ===');
          const expectedFields = [
            'key',
            'transDate', 
            'transType',
            'code',
            'transAmt',
            'narration',
            'voucherNo'
          ];
          
          expectedFields.forEach(field => {
            const exists = sample.hasOwnProperty(field);
            console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? 'Present' : 'MISSING'}`);
          });
          
          console.log('\n=== POTENTIAL MISSING FIELDS ===');
          // Check for common ledger fields that might be missing
          const potentialFields = [
            'balance',
            'runningBalance',
            'openingBalance',
            'closingBalance',
            'headName',
            'accountType',
            'memberName',
            'memberNo'
          ];
          
          potentialFields.forEach(field => {
            const exists = sample.hasOwnProperty(field);
            if (!exists) {
              console.log(`❌ ${field}: Not present in response`);
            } else {
              console.log(`✅ ${field}: Present - ${sample[field]}`);
            }
          });
        }
      } else if (typeof response.data === 'object') {
        console.log('\n=== OBJECT RESPONSE STRUCTURE ===');
        console.log('Response Object Keys:', Object.keys(response.data));
        console.log('Full Response:', JSON.stringify(response.data, null, 2));
      }
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

testMemberLedgerResponseStructure().catch(console.error);