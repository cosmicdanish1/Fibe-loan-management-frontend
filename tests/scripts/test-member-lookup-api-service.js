const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('🔍 Testing Member Lookup API Service Integration');
console.log('='.repeat(60));

async function testMemberLookupEndpoint() {
  console.log('\n📡 Testing /members/lookup endpoint...');
  
  try {
    const searchTerms = ['610', '30018785', 'ISHWAR'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Testing search: "${term}"`);
      
      const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
        params: {
          search: term,
          limit: 10,
          offset: 0
        }
      });
      
      console.log('   Status:', response.status);
      console.log('   Response structure:', {
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        length: response.data?.length || 0,
        firstItem: response.data?.[0] || null
      });
      
      if (response.data && response.data.length > 0) {
        console.log('   ✅ Found members:', response.data.length);
        response.data.slice(0, 3).forEach((member, index) => {
          console.log(`   ${index + 1}. ${member.memberNo} - ${member.memberName} (${member.officeName})`);
        });
      } else {
        console.log('   ❌ No members found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing member lookup endpoint:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

async function testApiServiceCompatibility() {
  console.log('\n🔧 Testing API Service Compatibility...');
  
  try {
    // Test the exact request that the API service would make
    const response = await axios.get(`${API_BASE_URL}/members/lookup?search=610&limit=500&offset=0`);
    
    console.log('   ✅ API Service compatible request successful');
    console.log('   Response type:', typeof response.data);
    console.log('   Is array:', Array.isArray(response.data));
    console.log('   Length:', response.data?.length || 0);
    
    if (response.data && response.data.length > 0) {
      const firstMember = response.data[0];
      console.log('   Sample member structure:', {
        memberNo: firstMember.memberNo,
        memberName: firstMember.memberName,
        officeNo: firstMember.officeNo,
        wingNo: firstMember.wingNo,
        officeName: firstMember.officeName
      });
    }
    
  } catch (error) {
    console.error('❌ API Service compatibility test failed:', error.message);
  }
}

async function testResponseFormat() {
  console.log('\n📋 Testing Response Format...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/members/lookup?search=ISHWAR&limit=5`);
    
    console.log('   Raw response data type:', typeof response.data);
    console.log('   Raw response structure:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    // Check if it's wrapped in a success/data structure
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      if (response.data.success !== undefined || response.data.data !== undefined) {
        console.log('   ⚠️  Response is wrapped in success/data structure');
        console.log('   Actual data:', response.data.data?.length || 0, 'items');
      } else {
        console.log('   ✅ Response is direct array');
      }
    } else if (Array.isArray(response.data)) {
      console.log('   ✅ Response is direct array with', response.data.length, 'items');
    }
    
  } catch (error) {
    console.error('❌ Response format test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Member Lookup API Service Tests...\n');
  
  await testMemberLookupEndpoint();
  await testApiServiceCompatibility();
  await testResponseFormat();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ API Service tests complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check if the MemberLookupInput component is now working');
  console.log('2. Test the search functionality in the RD component');
  console.log('3. Verify that member selection triggers the onChange callback');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);