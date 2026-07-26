// Test member details query directly
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
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

    req.end();
  });
}

async function testMemberDetails() {
  console.log('🔍 Testing Member Details API...\n');

  try {
    // First get a member from lookup
    console.log('1️⃣ Getting member from lookup...');
    const lookupResponse = await makeRequest('/api/v1/members/lookup?limit=3');
    
    if (lookupResponse.statusCode === 200) {
      let members = [];
      if (Array.isArray(lookupResponse.data)) {
        members = lookupResponse.data;
      } else if (lookupResponse.data.data && Array.isArray(lookupResponse.data.data)) {
        members = lookupResponse.data.data;
      }
      
      console.log(`✅ Found ${members.length} members from lookup`);
      
      if (members.length > 0) {
        // Test each member's details
        for (let i = 0; i < Math.min(3, members.length); i++) {
          const member = members[i];
          console.log(`\n2️⃣ Testing member ${i + 1}: ${member.memberNo} - ${member.memberName}`);
          
          const detailsResponse = await makeRequest(`/api/v1/members/details/${member.memberNo}`);
          
          console.log(`   Status: ${detailsResponse.statusCode}`);
          
          if (detailsResponse.statusCode === 200) {
            const details = detailsResponse.data;
            console.log('   📋 Member Details:');
            console.log(`      Member No: ${details.mbno || 'N/A'}`);
            console.log(`      Full Name: ${details.fullname || 'N/A'}`);
            console.log(`      First Name: ${details.f_name || 'N/A'}`);
            console.log(`      Middle Name: ${details.m_name || 'N/A'}`);
            console.log(`      Last Name: ${details.l_name || 'N/A'}`);
            console.log(`      Office No: ${details.officeno || 'N/A'}`);
            console.log(`      Wing No: ${details.wingno || 'N/A'}`);
            console.log(`      Office Name: ${details.office_name || 'N/A'}`);
            console.log(`      Basic Pay: ${details.basic_pay || 'N/A'}`);
            console.log(`      Designation: ${details.desig || 'N/A'}`);
            console.log(`      DOB: ${details.dob || 'N/A'}`);
            console.log(`      DOR: ${details.dor || 'N/A'}`);
            console.log(`      Active: ${details.isactive || 'N/A'}`);
            
            // Check if this member has any data
            const hasData = details.f_name || details.basic_pay || details.officeno;
            if (hasData) {
              console.log('   ✅ Member has data');
            } else {
              console.log('   ⚠️ Member has no detailed data (might be lookup-only record)');
            }
          } else {
            console.log(`   ❌ Failed to get details: ${detailsResponse.statusCode}`);
            if (detailsResponse.data) {
              console.log(`   Error: ${JSON.stringify(detailsResponse.data, null, 2)}`);
            }
          }
        }
      } else {
        console.log('❌ No members found in lookup');
      }
    } else {
      console.log(`❌ Lookup failed: ${lookupResponse.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMemberDetails();