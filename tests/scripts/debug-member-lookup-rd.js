const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('🔍 Testing Member Lookup API for RD Component');
console.log('='.repeat(50));

async function testMemberLookupAPI() {
  console.log('\n📡 Testing Member Lookup API...');
  
  try {
    // Test with different search terms
    const searchTerms = ['610', '30018785', 'ISHWAR', 'GOUTAM'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for: "${term}"`);
      
      const response = await axios.get(`${API_BASE_URL}/members/lookup?search=${encodeURIComponent(term)}`);
      
      if (response.data.success) {
        const members = response.data.data || [];
        console.log(`   ✅ Found ${members.length} members`);
        
        if (members.length > 0) {
          members.slice(0, 3).forEach((member, index) => {
            console.log(`   ${index + 1}. ${member.memberNo} - ${member.memberName} (${member.officeName})`);
          });
        }
      } else {
        console.log(`   ❌ API returned error: ${response.data.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing member lookup API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

async function testCORSHeaders() {
  console.log('\n🌐 Testing CORS Headers...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/members/lookup?search=610`);
    
    console.log('   Response Headers:');
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
        console.log(`   ${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking CORS headers:', error.message);
  }
}

async function simulateFrontendRequest() {
  console.log('\n🖥️  Simulating Frontend Request...');
  
  try {
    // Simulate the exact request that the frontend makes
    const config = {
      method: 'GET',
      url: `${API_BASE_URL}/members/lookup?search=610`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    };
    
    console.log('   Request config:', JSON.stringify(config, null, 2));
    
    const response = await axios(config);
    
    console.log('   ✅ Request successful');
    console.log('   Status:', response.status);
    console.log('   Data structure:', {
      success: response.data.success,
      dataLength: response.data.data?.length || 0,
      firstMember: response.data.data?.[0] || null
    });
    
  } catch (error) {
    console.error('❌ Frontend simulation failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
  }
}

async function runDebugTests() {
  console.log('🚀 Starting Member Lookup Debug Tests...\n');
  
  await testMemberLookupAPI();
  await testCORSHeaders();
  await simulateFrontendRequest();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Debug tests complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Verify network tab shows the API request being made');
  console.log('3. Check if the MemberLookupInput component is receiving props correctly');
  console.log('4. Ensure the search button click handler is being triggered');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the debug tests
runDebugTests().catch(console.error);