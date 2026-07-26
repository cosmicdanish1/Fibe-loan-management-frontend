const axios = require('axios');

async function debugExactResponse() {
  console.log('=== DEBUGGING EXACT RESPONSE STRUCTURE ===\n');
  
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
    
    console.log('\n📄 COMPLETE RESPONSE STRUCTURE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 DEEP DIVE INTO NESTED DATA:');
    console.log('='.repeat(80));
    
    let currentLevel = response.data;
    let path = 'response.data';
    let depth = 0;
    
    while (currentLevel && typeof currentLevel === 'object' && depth < 5) {
      console.log(`\n${path}:`);
      console.log(`  Type: ${typeof currentLevel}`);
      console.log(`  Keys: [${Object.keys(currentLevel).join(', ')}]`);
      
      if (currentLevel.data) {
        console.log(`  Has 'data' property: ${typeof currentLevel.data}`);
        if (typeof currentLevel.data === 'object' && currentLevel.data !== null) {
          console.log(`  data keys: [${Object.keys(currentLevel.data).join(', ')}]`);
        }
      }
      
      if (currentLevel.entries) {
        console.log(`  Has 'entries' property: ${typeof currentLevel.entries}`);
        if (Array.isArray(currentLevel.entries)) {
          console.log(`  entries length: ${currentLevel.entries.length}`);
        }
        break; // Found entries, stop here
      }
      
      // Go deeper if there's a data property
      if (currentLevel.data && typeof currentLevel.data === 'object') {
        currentLevel = currentLevel.data;
        path += '.data';
        depth++;
      } else {
        break;
      }
    }
    
    console.log('\n🎯 FINAL ANALYSIS:');
    console.log('='.repeat(80));
    
    // Try different paths to find the entries
    const paths = [
      'response.data',
      'response.data.data', 
      'response.data.data.data',
      'response.data.data.data.data'
    ];
    
    for (const testPath of paths) {
      try {
        let testData = response.data;
        const pathParts = testPath.split('.').slice(2); // Remove 'response.data'
        
        for (const part of pathParts) {
          testData = testData[part];
        }
        
        if (testData && testData.entries) {
          console.log(`✅ FOUND ENTRIES AT: ${testPath}`);
          console.log(`   Entries length: ${testData.entries.length}`);
          console.log(`   Member name: ${testData.memberName}`);
          console.log(`   Total debits: ${testData.totalDebits}`);
          console.log(`   Total credits: ${testData.totalCredits}`);
          
          if (testData.entries.length > 0) {
            console.log(`   Sample entry keys: [${Object.keys(testData.entries[0]).join(', ')}]`);
          }
          break;
        }
      } catch (e) {
        // Path doesn't exist, continue
      }
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
}

debugExactResponse().catch(console.error);