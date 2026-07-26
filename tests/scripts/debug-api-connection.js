/**
 * Debug Script: API Connection Test
 * 
 * This script tests if the member lookup API is working correctly
 */

const http = require('http');

function testAPI() {
  console.log('🧪 Testing Member Lookup API Connection...\n');

  // Test the API endpoint
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
    console.log(`📡 Response Status: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ API Response Success!');
          console.log(`📊 Members returned: ${Array.isArray(result) ? result.length : 'Not an array'}`);
          
          if (Array.isArray(result) && result.length > 0) {
            console.log('\n📋 First 3 members:');
            result.slice(0, 3).forEach((member, index) => {
              console.log(`  ${index + 1}. ${member.memberNo} - ${member.memberName} (${member.officeName})`);
            });
          } else {
            console.log('❌ No members in response or invalid format');
            console.log('Raw response:', data.substring(0, 200));
          }
        } else {
          console.log('❌ API Error Response:');
          console.log(data);
        }
      } catch (error) {
        console.error('❌ JSON Parse Error:', error.message);
        console.log('Raw response:', data.substring(0, 200));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('• Backend server not running (npm run start:dev in backend folder)');
    console.log('• Database connection issues');
    console.log('• Port 3000 not accessible');
    console.log('\n🔧 To fix:');
    console.log('1. cd backend');
    console.log('2. npm run start:dev');
    console.log('3. Check database connection in .env file');
  });

  req.end();
}

// Run the test
testAPI();