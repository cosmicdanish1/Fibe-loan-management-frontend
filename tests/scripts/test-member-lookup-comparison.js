const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('🔍 Testing Member Lookup Component Comparison');
console.log('='.repeat(60));

async function testMemberLookupComponent() {
  console.log('\n📋 Testing MemberLookup Component (used in Member Loan Detail)...');
  
  try {
    // This simulates the exact request that MemberLookup component makes
    const url = new URL(`${API_BASE_URL}/members/lookup`);
    url.searchParams.append('search', '610');
    url.searchParams.append('limit', '500');
    
    console.log('   🔗 Request URL:', url.toString());
    
    const response = await axios.get(url.toString());
    
    console.log('   📊 Response status:', response.status);
    console.log('   📦 Response structure:', {
      hasData: !!response.data,
      isWrapped: !!(response.data && response.data.data !== undefined),
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      length: response.data?.length || response.data?.data?.length || 0
    });
    
    // Check how MemberLookup processes the response
    const result = response.data;
    const data = result.data || result || [];
    const formattedData = (Array.isArray(data) ? data : []).map((m) => ({
      ...m,
      name: m.name || m.memberName || '' // Ensure name exists
    }));
    
    console.log('   ✅ MemberLookup would show:', formattedData.length, 'members');
    
    if (formattedData.length > 0) {
      console.log('   🎯 Sample results:');
      formattedData.slice(0, 3).forEach((member, index) => {
        console.log(`      ${index + 1}. ${member.memberNo} - ${member.memberName} (${member.officeName})`);
      });
    }
    
    return { success: true, count: formattedData.length };
    
  } catch (error) {
    console.error('   ❌ MemberLookup test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testMemberLookupInput() {
  console.log('\n📝 Testing MemberLookupInput Component (used in RD)...');
  
  try {
    // This simulates the API service request
    const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
      params: {
        search: '610',
        limit: 500,
        offset: 0
      }
    });
    
    console.log('   📊 Response status:', response.status);
    console.log('   📦 Response structure:', {
      hasData: !!response.data,
      isWrapped: !!(response.data && response.data.data !== undefined),
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      length: response.data?.length || response.data?.data?.length || 0
    });
    
    // Simulate API service response unwrapping
    const data = response.data;
    const actualData = (data && data.data !== undefined) ? data.data : data;
    
    console.log('   ✅ MemberLookupInput would show:', actualData.length, 'members');
    
    if (actualData.length > 0) {
      console.log('   🎯 Sample results:');
      actualData.slice(0, 3).forEach((member, index) => {
        console.log(`      ${index + 1}. ${member.memberNo} - ${member.memberName} (${member.officeName})`);
      });
    }
    
    return { success: true, count: actualData.length };
    
  } catch (error) {
    console.error('   ❌ MemberLookupInput test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testBothApproaches() {
  console.log('\n🔄 Testing Both Approaches with Different Search Terms...');
  
  const searchTerms = ['610', '30018785', 'ISHWAR'];
  
  for (const term of searchTerms) {
    console.log(`\n🔍 Testing search term: "${term}"`);
    
    // Test MemberLookup approach (direct fetch)
    try {
      const url = new URL(`${API_BASE_URL}/members/lookup`);
      if (term.trim()) {
        url.searchParams.append('search', term.trim());
      }
      url.searchParams.append('limit', '500');
      
      const response = await axios.get(url.toString());
      const result = response.data;
      const data = result.data || result || [];
      const formattedData = (Array.isArray(data) ? data : []);
      
      console.log(`   📋 MemberLookup: ${formattedData.length} results`);
    } catch (error) {
      console.log(`   📋 MemberLookup: Error - ${error.message}`);
    }
    
    // Test MemberLookupInput approach (API service)
    try {
      const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
        params: {
          search: term,
          limit: 500,
          offset: 0
        }
      });
      
      const data = response.data;
      const actualData = (data && data.data !== undefined) ? data.data : data;
      
      console.log(`   📝 MemberLookupInput: ${actualData.length} results`);
    } catch (error) {
      console.log(`   📝 MemberLookupInput: Error - ${error.message}`);
    }
  }
}

async function runComparisonTests() {
  console.log('🚀 Starting Member Lookup Component Comparison Tests...\n');
  
  const memberLookupResult = await testMemberLookupComponent();
  const memberLookupInputResult = await testMemberLookupInput();
  
  await testBothApproaches();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Comparison Results:');
  console.log(`   MemberLookup (Modal): ${memberLookupResult.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   MemberLookupInput (Dropdown): ${memberLookupInputResult.success ? '✅ Working' : '❌ Failed'}`);
  
  if (memberLookupResult.success && memberLookupInputResult.success) {
    console.log('\n🎯 Both approaches should work!');
    console.log('   The issue might be in the frontend component integration.');
  } else {
    console.log('\n⚠️  One or both approaches have issues.');
  }
  
  console.log('\n📝 Recommendations:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Verify the MemberLookupInput component is receiving props correctly');
  console.log('3. Test the search functionality step by step');
  console.log('4. Consider using the MemberLookup modal approach if dropdown continues to fail');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runComparisonTests().catch(console.error);