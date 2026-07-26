// Test loan case number generation specifically
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

async function testLoanCaseGeneration() {
  console.log('🔍 Testing Loan Case Number Generation...\n');

  try {
    const response = await makeRequest('/api/v1/members/generate/loan-case-number');
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Raw Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      // Check different possible response formats
      console.log('\n📊 Response Analysis:');
      console.log(`Type: ${typeof data}`);
      console.log(`Is object: ${typeof data === 'object'}`);
      
      if (data.loanCaseNo) {
        console.log(`✅ Direct access: ${data.loanCaseNo}`);
      }
      
      if (data.data && data.data.loanCaseNo) {
        console.log(`✅ Wrapped access: ${data.data.loanCaseNo}`);
      }
      
      if (data.success && data.data && data.data.loanCaseNo) {
        console.log(`✅ Success wrapped: ${data.data.loanCaseNo}`);
      }
      
      // Show all keys
      console.log('\n🔑 Available keys:');
      if (typeof data === 'object') {
        Object.keys(data).forEach(key => {
          console.log(`   ${key}: ${data[key]} (${typeof data[key]})`);
        });
      }
      
    } else {
      console.log(`❌ Failed: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLoanCaseGeneration();