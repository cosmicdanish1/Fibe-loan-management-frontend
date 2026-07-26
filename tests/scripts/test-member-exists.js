// Test if member exists in database
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

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testMemberExists() {
  console.log('🔍 Testing if members exist in database...\n');

  try {
    // Get members from lookup
    console.log('1️⃣ Getting members from lookup API...');
    const lookupResponse = await makeRequest('/api/v1/members/lookup?limit=5');
    
    if (lookupResponse.statusCode === 200) {
      let members = [];
      if (Array.isArray(lookupResponse.data)) {
        members = lookupResponse.data;
      } else if (lookupResponse.data.data && Array.isArray(lookupResponse.data.data)) {
        members = lookupResponse.data.data;
      }
      
      console.log(`✅ Found ${members.length} members from lookup`);
      
      if (members.length > 0) {
        // Test first member
        const testMember = members[0];
        console.log(`\n2️⃣ Testing member: ${testMember.memberNo} - ${testMember.memberName}`);
        
        // Test different member number formats
        const memberNoVariations = [
          testMember.memberNo,                    // Original: "610031566"
          parseInt(testMember.memberNo),          // As integer: 610031566
          testMember.memberNo.toString(),         // Explicit string: "610031566"
          `'${testMember.memberNo}'`,            // Quoted string: "'610031566'"
        ];
        
        console.log('   Testing different member number formats:');
        
        for (let i = 0; i < memberNoVariations.length; i++) {
          const memberNoVariation = memberNoVariations[i];
          console.log(`\n   Format ${i + 1}: ${typeof memberNoVariation} - ${memberNoVariation}`);
          
          try {
            const detailsResponse = await makeRequest(`/api/v1/members/details/${memberNoVariation}`);
            console.log(`      Status: ${detailsResponse.statusCode}`);
            
            if (detailsResponse.statusCode === 200 && detailsResponse.data) {
              const details = detailsResponse.data;
              
              // Check if we got actual data
              if (details.mbno || details.f_name || details.fullname) {
                console.log('      ✅ SUCCESS! Found member data:');
                console.log(`         Member No: ${details.mbno}`);
                console.log(`         Full Name: ${details.fullname}`);
                console.log(`         First Name: ${details.f_name}`);
                console.log(`         Office: ${details.officeno}`);
                console.log(`         Basic Pay: ${details.basic_pay}`);
                break; // Found working format
              } else {
                console.log('      ⚠️ Response OK but no data fields populated');
              }
            } else {
              console.log(`      ❌ Failed: ${detailsResponse.statusCode}`);
              if (detailsResponse.data && typeof detailsResponse.data === 'object') {
                console.log(`         Error: ${JSON.stringify(detailsResponse.data, null, 2)}`);
              }
            }
          } catch (error) {
            console.log(`      ❌ Error: ${error.message}`);
          }
        }
        
        // Test a few more members
        console.log('\n3️⃣ Testing additional members...');
        for (let j = 1; j < Math.min(3, members.length); j++) {
          const member = members[j];
          console.log(`\n   Member ${j + 1}: ${member.memberNo} - ${member.memberName}`);
          
          const detailsResponse = await makeRequest(`/api/v1/members/details/${member.memberNo}`);
          console.log(`      Status: ${detailsResponse.statusCode}`);
          
          if (detailsResponse.statusCode === 200 && detailsResponse.data) {
            const details = detailsResponse.data;
            if (details.mbno || details.f_name || details.fullname) {
              console.log('      ✅ Has data');
            } else {
              console.log('      ⚠️ No data fields');
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

testMemberExists();