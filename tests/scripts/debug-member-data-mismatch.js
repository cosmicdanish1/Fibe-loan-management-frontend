// Debug member data mismatch between lookup and details
const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: data, parseError: error.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function debugMemberDataMismatch() {
  console.log('🔍 Debugging Member Data Mismatch...\n');

  try {
    // Get members from lookup with more details
    console.log('1️⃣ Getting detailed lookup data...');
    const lookupResponse = await makeRequest('/api/v1/members/lookup?limit=10');
    
    if (lookupResponse.statusCode === 200) {
      let members = [];
      if (Array.isArray(lookupResponse.data)) {
        members = lookupResponse.data;
      } else if (lookupResponse.data.data && Array.isArray(lookupResponse.data.data)) {
        members = lookupResponse.data.data;
      }
      
      console.log(`✅ Found ${members.length} members from lookup`);
      console.log('\n📋 Lookup Data Sample:');
      
      // Show first 3 members from lookup
      for (let i = 0; i < Math.min(3, members.length); i++) {
        const member = members[i];
        console.log(`   ${i + 1}. Member No: ${member.memberNo} (${typeof member.memberNo})`);
        console.log(`      Name: ${member.memberName}`);
        console.log(`      Office No: ${member.officeNo} (${typeof member.officeNo})`);
        console.log(`      Wing No: ${member.wingNo} (${typeof member.wingNo})`);
        console.log(`      Office Name: ${member.officeName}`);
        console.log('');
      }
      
      // Now test if these exact member numbers exist in member_master
      console.log('2️⃣ Testing member existence in member_master table...');
      
      // Create a custom API endpoint test to check raw database query
      console.log('\n   Creating test query to check member_master directly...');
      
      const testMember = members[0];
      console.log(`   Testing member: ${testMember.memberNo}`);
      
      // Test the details API with debug info
      const detailsResponse = await makeRequest(`/api/v1/members/details/${testMember.memberNo}`);
      console.log(`   Details API Status: ${detailsResponse.statusCode}`);
      
      if (detailsResponse.statusCode === 200) {
        console.log('   Details API Response:');
        console.log(JSON.stringify(detailsResponse.data, null, 4));
        
        // Check if the response is null or empty object
        if (!detailsResponse.data || Object.keys(detailsResponse.data).length === 0) {
          console.log('   ❌ Details API returned empty/null data');
        } else {
          // Check each field
          const details = detailsResponse.data;
          console.log('\n   📊 Field Analysis:');
          console.log(`      mbno: ${details.mbno} (${typeof details.mbno})`);
          console.log(`      fullname: ${details.fullname} (${typeof details.fullname})`);
          console.log(`      f_name: ${details.f_name} (${typeof details.f_name})`);
          console.log(`      m_name: ${details.m_name} (${typeof details.m_name})`);
          console.log(`      l_name: ${details.l_name} (${typeof details.l_name})`);
          console.log(`      officeno: ${details.officeno} (${typeof details.officeno})`);
          console.log(`      wingno: ${details.wingno} (${typeof details.wingno})`);
          console.log(`      basic_pay: ${details.basic_pay} (${typeof details.basic_pay})`);
          console.log(`      office_name: ${details.office_name} (${typeof details.office_name})`);
          console.log(`      isactive: ${details.isactive} (${typeof details.isactive})`);
        }
      } else {
        console.log(`   ❌ Details API failed: ${detailsResponse.statusCode}`);
        if (detailsResponse.data) {
          console.log('   Error:', JSON.stringify(detailsResponse.data, null, 2));
        }
      }
      
      // Test a few more members to see if it's a pattern
      console.log('\n3️⃣ Testing pattern across multiple members...');
      
      let foundDataCount = 0;
      let emptyDataCount = 0;
      
      for (let i = 0; i < Math.min(5, members.length); i++) {
        const member = members[i];
        const response = await makeRequest(`/api/v1/members/details/${member.memberNo}`);
        
        if (response.statusCode === 200 && response.data) {
          if (response.data.mbno || response.data.f_name || response.data.fullname) {
            foundDataCount++;
            console.log(`   ✅ Member ${member.memberNo}: Has data`);
          } else {
            emptyDataCount++;
            console.log(`   ❌ Member ${member.memberNo}: Empty data`);
          }
        } else {
          emptyDataCount++;
          console.log(`   ❌ Member ${member.memberNo}: API failed (${response.statusCode})`);
        }
      }
      
      console.log('\n📊 Summary:');
      console.log(`   Members with data: ${foundDataCount}`);
      console.log(`   Members with empty data: ${emptyDataCount}`);
      console.log(`   Total tested: ${foundDataCount + emptyDataCount}`);
      
      if (emptyDataCount > foundDataCount) {
        console.log('\n🚨 ISSUE IDENTIFIED:');
        console.log('   The member lookup API finds members, but the details API returns empty data.');
        console.log('   This suggests:');
        console.log('   1. The lookup and details queries use different data sources');
        console.log('   2. The member_master table has incomplete data');
        console.log('   3. There\'s a query parameter binding issue');
        console.log('   4. The member numbers have different formats in different tables');
      }
      
    } else {
      console.log(`❌ Lookup failed: ${lookupResponse.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugMemberDataMismatch();