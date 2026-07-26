// Test member lookup API
const http = require('http');

function testMemberLookupAPI() {
  console.log('🔍 Testing member lookup API...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/members/lookup?limit=10',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ API Response received');
        console.log('Data type:', Array.isArray(jsonData) ? 'Array' : typeof jsonData);
        console.log('Data length:', Array.isArray(jsonData) ? jsonData.length : 'N/A');
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          console.log('✅ Sample member data:');
          console.log(JSON.stringify(jsonData[0], null, 2));
          console.log(`\n📊 Total members found: ${jsonData.length}`);
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          console.log('✅ Wrapped response - Sample member data:');
          console.log(JSON.stringify(jsonData.data[0], null, 2));
          console.log(`\n📊 Total members found: ${jsonData.data.length}`);
        } else {
          console.log('⚠️ No member data found or unexpected format');
          console.log('Full response:', JSON.stringify(jsonData, null, 2));
        }
      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Network error:', error.message);
  });

  req.end();
}

testMemberLookupAPI();