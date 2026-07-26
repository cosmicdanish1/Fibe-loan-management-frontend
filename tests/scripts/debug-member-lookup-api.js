/**
 * Debug Member Lookup API
 * Test the member lookup API endpoint to see why it's not finding members
 */

const axios = require('axios');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('=== MEMBER LOOKUP API DEBUG ===');

async function debugMemberLookupAPI() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\n--- STEP 1: TEST MEMBER LOOKUP API ENDPOINTS ---');
    
    // Test different possible member lookup endpoints
    const possibleEndpoints = [
      '/member/search',
      '/member/lookup',
      '/member/find',
      '/member',
      '/members',
      '/member-lookup',
      '/common/member-lookup'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`\nTesting: ${API_BASE_URL}${endpoint}`);
        
        // Test with different query parameters
        const testParams = [
          { search: '610015819' },
          { memberNo: '610015819' },
          { query: '610015819' },
          { term: '610015819' },
          { q: 'MAHESH' },
          { search: 'MAHESH' }
        ];
        
        for (const params of testParams) {
          try {
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
              params,
              timeout: 5000
            });
            
            console.log(`  ✅ ${endpoint} with ${JSON.stringify(params)}: ${response.status}`);
            if (response.data && response.data.data) {
              console.log(`     Found ${response.data.data.length || 0} results`);
              if (response.data.data.length > 0) {
                console.log(`     First result: ${JSON.stringify(response.data.data[0])}`);
              }
            }
          } catch (paramError) {
            if (paramError.response && paramError.response.status !== 404) {
              console.log(`  ⚠️  ${endpoint} with ${JSON.stringify(params)}: ${paramError.response.status} - ${paramError.response.statusText}`);
            }
          }
        }
        
      } catch (error) {
        if (error.code !== 'ECONNREFUSED' && error.response?.status !== 404) {
          console.log(`  ❌ ${endpoint}: ${error.message}`);
        }
      }
    }
    
    console.log('\n--- STEP 2: CHECK MEMBER MODULE STRUCTURE ---');
    
    // Check what member-related endpoints exist
    try {
      const response = await axios.get(`${API_BASE_URL}/member`, { timeout: 5000 });
      console.log('✅ /member endpoint exists');
    } catch (error) {
      console.log('❌ /member endpoint not found or error:', error.response?.status);
    }
    
    console.log('\n--- STEP 3: ANALYZE MEMBER LOOKUP COMPONENT ---');
    
    // Let's check what the frontend member lookup component is actually calling
    console.log('Member lookup component analysis needed...');
    console.log('The member lookup window shows "0 Members" which suggests:');
    console.log('1. The API endpoint exists but returns empty results');
    console.log('2. The query parameters are incorrect');
    console.log('3. The database query in the backend is filtering out results');
    console.log('4. There might be a different database connection');
    
    console.log('\n--- STEP 4: DIRECT DATABASE QUERY FOR MEMBER LOOKUP ---');
    
    // Test the exact query that member lookup should use
    const memberLookupQuery = `
      SELECT 
        mbno as "memberNo",
        CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as "memberName",
        f_name as "firstName",
        l_name as "lastName",
        present_address as "address",
        memb_date as "membershipDate"
      FROM member_master 
      WHERE (
        mbno::text = $1 OR
        f_name ILIKE $2 OR 
        l_name ILIKE $2 OR 
        CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) ILIKE $2
      )
      AND (isactive = '1' OR isactive = 'Y')
      ORDER BY mbno
      LIMIT 50
    `;
    
    const searchTerms = ['610015819', 'MAHESH', 'AGRAWAL'];
    
    for (const term of searchTerms) {
      console.log(`\nTesting database query with term: "${term}"`);
      const result = await pool.query(memberLookupQuery, [term, `%${term}%`]);
      console.log(`  Found ${result.rows.length} members`);
      
      if (result.rows.length > 0) {
        result.rows.slice(0, 3).forEach(member => {
          console.log(`    ${member.memberNo}: ${member.memberName}`);
        });
      }
    }
    
    console.log('\n--- STEP 5: CHECK MEMBER LOOKUP ROUTE IN FRONTEND ---');
    
    console.log('The member lookup opens at route: /common/member-lookup');
    console.log('This suggests there should be a member lookup API at a common endpoint');
    console.log('Let\'s check if there\'s a common module or member-lookup specific endpoint');
    
    // Test common endpoints
    const commonEndpoints = [
      '/common/member-lookup',
      '/lookup/member',
      '/search/member'
    ];
    
    for (const endpoint of commonEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          params: { search: '610015819' },
          timeout: 5000
        });
        console.log(`✅ ${endpoint} exists and responds`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
        }
      }
    }
    
    console.log('\n--- STEP 6: RECOMMENDATIONS ---');
    
    console.log('\n🔧 POSSIBLE SOLUTIONS:');
    console.log('');
    console.log('1. **API Endpoint Issue**: Member lookup might be calling wrong endpoint');
    console.log('   - Check Frontend/src/components/shared/MemberLookup/ for API calls');
    console.log('   - Verify the API endpoint in member lookup component');
    console.log('');
    console.log('2. **Query Parameter Issue**: Wrong parameter names');
    console.log('   - Member lookup might expect different parameter names');
    console.log('   - Check if it uses "search", "query", "term", or "memberNo"');
    console.log('');
    console.log('3. **Database Filter Issue**: Backend query too restrictive');
    console.log('   - Check if member lookup filters by additional conditions');
    console.log('   - Verify isactive field values (1, Y, true, etc.)');
    console.log('');
    console.log('4. **Different Database Connection**: Member lookup uses different DB');
    console.log('   - Check if member lookup has separate database configuration');
    console.log('');
    console.log('🎯 IMMEDIATE WORKAROUND:');
    console.log('- Close member lookup window');
    console.log('- Directly type "610015819" in Member Number field');
    console.log('- Click "SHOW" button');
    console.log('- This should work since the main PassBook API works correctly');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugMemberLookupAPI().catch(console.error);