const axios = require('axios');

async function debugFrontendResponseStructure() {
  console.log('=== DEBUGGING FRONTEND RESPONSE STRUCTURE ===\n');
  
  const baseURL = 'http://localhost:3001/api/v1';
  const memberNo = '610023352'; // Known member with data
  
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
    
    console.log('\n📄 RAW BACKEND RESPONSE STRUCTURE:');
    console.log('='.repeat(50));
    console.log('Response keys:', Object.keys(response.data));
    console.log('Success:', response.data.success);
    console.log('StatusCode:', response.data.statusCode);
    console.log('Message:', response.data.message);
    console.log('Data exists:', response.data.data !== undefined);
    
    if (response.data.data) {
      const data = response.data.data;
      console.log('\n📊 DATA OBJECT STRUCTURE:');
      console.log('='.repeat(50));
      console.log('Data keys:', Object.keys(data));
      console.log('Member Number:', data.memberNumber);
      console.log('Member Name:', data.memberName);
      console.log('From Date:', data.fromDate);
      console.log('To Date:', data.toDate);
      console.log('Entries exists:', data.entries !== undefined);
      console.log('Entries type:', typeof data.entries);
      console.log('Entries length:', Array.isArray(data.entries) ? data.entries.length : 'Not array');
      console.log('Total Debits:', data.totalDebits);
      console.log('Total Credits:', data.totalCredits);
      
      if (data.entries && data.entries.length > 0) {
        console.log('\n📄 SAMPLE ENTRY STRUCTURE:');
        console.log('='.repeat(50));
        const sampleEntry = data.entries[0];
        console.log('Entry keys:', Object.keys(sampleEntry));
        console.log('Sample entry:', JSON.stringify(sampleEntry, null, 2));
      }
    }
    
    console.log('\n🔧 FRONTEND API SERVICE SIMULATION:');
    console.log('='.repeat(50));
    
    // Simulate what the frontend API service does
    const actualData = (response.data && response.data.data !== undefined) ? response.data.data : response.data;
    
    console.log('After API service unwrapping:');
    console.log('actualData keys:', Object.keys(actualData));
    console.log('actualData.entries exists:', actualData.entries !== undefined);
    console.log('actualData.entries length:', Array.isArray(actualData.entries) ? actualData.entries.length : 'Not array');
    
    console.log('\n✅ FRONTEND SHOULD ACCESS:');
    console.log('='.repeat(50));
    console.log('response.data.entries (length:', actualData.entries?.length || 0, ')');
    console.log('response.data.memberName:', actualData.memberName);
    console.log('response.data.totalDebits:', actualData.totalDebits);
    console.log('response.data.totalCredits:', actualData.totalCredits);
    
  } catch (error) {
    console.log(`❌ ERROR:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`   Network Error: ${error.message}`);
    }
  }
}

debugFrontendResponseStructure().catch(console.error);