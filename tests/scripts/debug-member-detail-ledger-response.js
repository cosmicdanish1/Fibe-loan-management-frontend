const axios = require('axios');

async function debugMemberDetailLedgerResponse() {
  console.log('=== DEBUGGING MEMBER DETAIL LEDGER RESPONSE ===\n');
  
  const baseURL = 'http://localhost:3001/api/v1';
  const memberNo = '610026281'; // Known member with 813 transactions
  
  try {
    console.log(`🧪 Testing Member Detail Ledger API for member: ${memberNo}`);
    
    const response = await axios.get(`${baseURL}/member-ledger/detail-report`, {
      params: {
        memberNumber: memberNo,
        fromDate: '2019-01-01',
        toDate: '2025-12-31',
        outputType: 'screen'
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Headers:`, response.headers['content-type']);
    
    console.log('\n📄 FULL RESPONSE STRUCTURE:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n📊 RESPONSE ANALYSIS:');
    console.log('='.repeat(50));
    console.log(`Response type: ${typeof response.data}`);
    console.log(`Success field: ${response.data.success}`);
    console.log(`Data field exists: ${response.data.data !== undefined}`);
    console.log(`Data type: ${typeof response.data.data}`);
    
    if (response.data.data) {
      const data = response.data.data;
      console.log(`Data keys: ${Object.keys(data)}`);
      console.log(`Entries field exists: ${data.entries !== undefined}`);
      console.log(`Entries type: ${typeof data.entries}`);
      console.log(`Entries length: ${Array.isArray(data.entries) ? data.entries.length : 'Not array'}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`   Network Error: ${error.message}`);
    }
  }
  
  // Also test the regular member ledger API for comparison
  console.log('\n🧪 TESTING REGULAR MEMBER LEDGER API FOR COMPARISON...');
  console.log('='.repeat(60));
  
  try {
    const regularResponse = await axios.get(`${baseURL}/report/member-ledger`, {
      params: {
        memberNo: memberNo,
        headCode: 'SB001', // Savings Bank account
        fromDate: '2019-01-01',
        toDate: '2025-12-31'
      }
    });
    
    console.log(`✅ Regular API Status: ${regularResponse.status}`);
    console.log(`✅ Regular API Success: ${regularResponse.data.success}`);
    
    if (regularResponse.data.success && regularResponse.data.data) {
      const data = regularResponse.data.data;
      console.log(`📊 Regular API - Member Name: ${data.memberName}`);
      console.log(`📊 Regular API - Total Entries: ${data.entries?.length || 0}`);
      console.log(`💰 Regular API - Total Debits: ₹${data.totalDebits?.toFixed(2) || '0.00'}`);
      console.log(`💰 Regular API - Total Credits: ₹${data.totalCredits?.toFixed(2) || '0.00'}`);
    }
    
  } catch (error) {
    console.log(`❌ Regular API Error: ${error.message}`);
  }
}

debugMemberDetailLedgerResponse().catch(console.error);