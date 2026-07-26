/**
 * Test Script: API Response Format Analysis
 * 
 * This script analyzes the exact format of the member lookup API response
 */

const http = require('http');

function testAPIResponseFormat() {
  console.log('🧪 Testing Member Lookup API Response Format...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/members/lookup?limit=3',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Response Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        console.log('\n📋 Full Response Structure:');
        console.log('Type:', typeof result);
        console.log('Is Array:', Array.isArray(result));
        console.log('Keys:', Object.keys(result));
        
        console.log('\n📄 Raw Response (formatted):');
        console.log(JSON.stringify(result, null, 2));
        
        // Analyze structure
        if (result.success !== undefined) {
          console.log('\n✅ Response has "success" property:', result.success);
        }
        
        if (result.data !== undefined) {
          console.log('✅ Response has "data" property');
          console.log('Data type:', typeof result.data);
          console.log('Data is array:', Array.isArray(result.data));
          if (Array.isArray(result.data)) {
            console.log('Data length:', result.data.length);
            if (result.data.length > 0) {
              console.log('\n📋 First member structure:');
              console.log(JSON.stringify(result.data[0], null, 2));
            }
          }
        }
        
        if (result.statusCode !== undefined) {
          console.log('✅ Response has "statusCode" property:', result.statusCode);
        }
        
        if (result.message !== undefined) {
          console.log('✅ Response has "message" property:', result.message);
        }
        
        console.log('\n🔧 Frontend Fix Needed:');
        if (Array.isArray(result)) {
          console.log('• Frontend should expect: result (direct array)');
        } else if (result.data && Array.isArray(result.data)) {
          console.log('• Frontend should expect: result.data');
        } else {
          console.log('• Unexpected format - needs investigation');
        }
        
      } catch (error) {
        console.error('❌ JSON Parse Error:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
  });

  req.end();
}

// Run the test
testAPIResponseFormat();