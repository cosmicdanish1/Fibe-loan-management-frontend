/**
 * Test Member Lookup Fix
 * Verify that the member lookup API now works correctly
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('=== TESTING MEMBER LOOKUP FIX ===');

async function testMemberLookupFix() {
  try {
    console.log('\n--- STEP 1: TEST MEMBER SEARCH API ---');
    
    // Test the main members search endpoint
    const searchTests = [
      { search: '610015819', description: 'Search by member number' },
      { search: 'MAHESH', description: 'Search by first name' },
      { search: 'AGRAWAL', description: 'Search by last name' }
    ];
    
    for (const test of searchTests) {
      try {
        console.log(`\nTesting: ${test.description} (${test.search})`);
        
        const response = await axios.get(`${API_BASE_URL}/members`, {
          params: { search: test.search },
          timeout: 10000
        });
        
        if (response.data && response.data.data) {
          console.log(`✅ Found ${response.data.data.length} results`);
          if (response.data.data.length > 0) {
            response.data.data.slice(0, 3).forEach(member => {
              console.log(`   ${member.memberNumber || member.memberNo}: ${member.firstName || member.memberName}`);
            });
          }
        } else {
          console.log('❌ Unexpected response structure:', Object.keys(response.data || {}));
        }
        
      } catch (error) {
        console.log(`❌ ${test.description} failed:`, error.response?.status, error.response?.statusText);
      }
    }
    
    console.log('\n--- STEP 2: TEST MEMBER LOOKUP API ---');
    
    // Test the member lookup endpoint specifically
    const lookupTests = [
      { search: '610015819', description: 'Lookup by member number' },
      { search: 'MAHESH', description: 'Lookup by first name' },
      { search: 'AGRAWAL', description: 'Lookup by last name' }
    ];
    
    for (const test of lookupTests) {
      try {
        console.log(`\nTesting: ${test.description} (${test.search})`);
        
        const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
          params: { search: test.search },
          timeout: 10000
        });
        
        if (Array.isArray(response.data)) {
          console.log(`✅ Found ${response.data.length} results`);
          if (response.data.length > 0) {
            response.data.slice(0, 3).forEach(member => {
              console.log(`   ${member.memberNo}: ${member.memberName}`);
            });
          }
        } else {
          console.log('❌ Unexpected response structure:', typeof response.data);
        }
        
      } catch (error) {
        console.log(`❌ ${test.description} failed:`, error.response?.status, error.response?.statusText);
      }
    }
    
    console.log('\n--- STEP 3: VERIFY SPECIFIC MEMBER ---');
    
    // Test specifically for our target member
    try {
      const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
        params: { search: '610015819' },
        timeout: 10000
      });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const member = response.data.find(m => m.memberNo === '610015819');
        if (member) {
          console.log('✅ SUCCESS! Member 610015819 found in lookup:');
          console.log(`   Member No: ${member.memberNo}`);
          console.log(`   Name: ${member.memberName}`);
          console.log(`   Office: ${member.officeName}`);
          console.log('');
          console.log('🎉 MEMBER LOOKUP IS NOW WORKING!');
          console.log('');
          console.log('📱 TO TEST IN UI:');
          console.log('1. Go to PassBook Printing');
          console.log('2. Click the search icon (🔍) next to Member Number');
          console.log('3. Search for "610015819" or "MAHESH"');
          console.log('4. You should now see the member in the results');
          console.log('5. Select the member and it will auto-fill');
          console.log('6. Click "SHOW" to load passbook data');
        } else {
          console.log('❌ Member 610015819 not found in results');
        }
      } else {
        console.log('❌ No results returned for member 610015819');
      }
      
    } catch (error) {
      console.log('❌ Verification failed:', error.response?.status, error.response?.statusText);
    }
    
    console.log('\n--- STEP 4: ALTERNATIVE MEMBERS TO TEST ---');
    
    // Test other members that should work
    const alternativeMembers = ['610016111', '610016572', '610022391'];
    
    for (const memberNo of alternativeMembers) {
      try {
        const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
          params: { search: memberNo },
          timeout: 5000
        });
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          const member = response.data[0];
          console.log(`✅ ${memberNo}: ${member.memberName}`);
        } else {
          console.log(`❌ ${memberNo}: Not found`);
        }
        
      } catch (error) {
        console.log(`❌ ${memberNo}: API error`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMemberLookupFix().catch(console.error);