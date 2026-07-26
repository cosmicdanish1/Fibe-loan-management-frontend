// Test all report components for data loading issues
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

    req.end();
  });
}

async function testAllReportComponents() {
  console.log('🎯 Testing All Report Components for Data Loading Issues...\n');

  const today = new Date().toISOString().split('T')[0];
  const testDate = '2024-12-24';

  const tests = [
    {
      name: 'CashBook Report',
      endpoint: `/api/v1/cashbook/report?date=${testDate}`,
      expectedFields: ['date', 'totalReceipts', 'totalPayments', 'entries']
    },
    {
      name: 'DayBook Report', 
      endpoint: `/api/v1/daybook/report?date=${testDate}`,
      expectedFields: ['date', 'totalReceipts', 'totalPayments', 'entries']
    },
    {
      name: 'Member Lookup',
      endpoint: '/api/v1/members/lookup?limit=5',
      expectedFields: ['memberNo', 'memberName', 'officeNo']
    },
    {
      name: 'Fixed Deposit Certificate',
      endpoint: '/api/v1/report/fd-certificate?memberNo=610031566',
      expectedFields: ['memberNo', 'memberName', 'accountNo']
    },
    {
      name: 'AdHoc Reports',
      endpoint: '/api/v1/report/adhoc?reportType=balance_summary',
      expectedFields: ['reportType', 'data']
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    console.log(`🔍 Testing ${test.name}...`);
    
    try {
      const response = await makeRequest(test.endpoint);
      
      if (response.statusCode === 200) {
        const data = response.data;
        
        // Analyze response structure
        console.log(`   ✅ Status: ${response.statusCode}`);
        console.log(`   📊 Response type: ${typeof data}`);
        console.log(`   🔑 Has success: ${data.success !== undefined}`);
        console.log(`   📦 Has data: ${data.data !== undefined}`);
        
        // Check for double wrapping
        let actualData = data;
        let wrapLevel = 0;
        
        if (data.success && data.data) {
          actualData = data.data;
          wrapLevel = 1;
          
          if (actualData.success && actualData.data) {
            actualData = actualData.data;
            wrapLevel = 2;
          }
        }
        
        console.log(`   🎯 Wrap level: ${wrapLevel} (${wrapLevel === 0 ? 'direct' : wrapLevel === 1 ? 'single-wrapped' : 'double-wrapped'})`);
        
        // Check if expected fields exist
        let hasExpectedFields = false;
        
        if (Array.isArray(actualData)) {
          // For array responses (like member lookup)
          if (actualData.length > 0) {
            const firstItem = actualData[0];
            hasExpectedFields = test.expectedFields.some(field => firstItem.hasOwnProperty(field));
            console.log(`   📋 Array with ${actualData.length} items`);
            console.log(`   ✅ Sample item has expected fields: ${hasExpectedFields}`);
          } else {
            console.log(`   ⚠️ Empty array response`);
          }
        } else if (typeof actualData === 'object' && actualData !== null) {
          // For object responses
          hasExpectedFields = test.expectedFields.some(field => actualData.hasOwnProperty(field));
          console.log(`   ✅ Object has expected fields: ${hasExpectedFields}`);
          
          // Show available fields
          const availableFields = Object.keys(actualData).slice(0, 5);
          console.log(`   🔑 Available fields: ${availableFields.join(', ')}${Object.keys(actualData).length > 5 ? '...' : ''}`);
        } else {
          console.log(`   ❌ Unexpected data type: ${typeof actualData}`);
        }
        
        if (hasExpectedFields || actualData === null || (Array.isArray(actualData) && actualData.length === 0)) {
          console.log(`   ✅ ${test.name}: PASSED`);
          passedTests++;
        } else {
          console.log(`   ❌ ${test.name}: FAILED - Missing expected fields`);
          failedTests++;
        }
        
      } else {
        console.log(`   ❌ ${test.name}: FAILED - Status ${response.statusCode}`);
        if (response.data) {
          console.log(`   📄 Error: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        }
        failedTests++;
      }
      
    } catch (error) {
      console.log(`   ❌ ${test.name}: FAILED - ${error.message}`);
      failedTests++;
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('🎯 REPORT COMPONENTS TEST SUMMARY:');
  console.log('==================================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  console.log('');
  
  if (failedTests === 0) {
    console.log('🎉 ALL REPORT COMPONENTS WORKING!');
    console.log('📋 All APIs are returning data in expected formats.');
    console.log('🔧 Frontend components should handle responses correctly.');
  } else {
    console.log('⚠️ SOME ISSUES FOUND:');
    console.log('📋 Check the failed components for data loading issues.');
    console.log('🔧 May need response parsing fixes similar to loan application.');
  }
}

testAllReportComponents();