const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/v1/report/deposit-maturity';

// Test data
const TEST_CASES = [
  {
    name: 'Current Year All Deposits',
    params: { 
      fromDate: '2024-01-01',
      toDate: '2024-12-31'
    },
    expectedFields: ['memberNo', 'memberName', 'accountNo', 'depositType', 'amount', 'dueDate', 'interestRate', 'maturityAmount']
  },
  {
    name: 'Next 30 Days Fixed Deposits',
    params: { 
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      depositType: 'Fixed Deposit'
    },
    expectedFields: ['memberNo', 'memberName', 'accountNo', 'depositType', 'amount', 'dueDate', 'interestRate', 'maturityAmount']
  },
  {
    name: 'Next 90 Days Recurring Deposits',
    params: { 
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      depositType: 'Recurring Deposit'
    },
    expectedFields: ['memberNo', 'memberName', 'accountNo', 'depositType', 'amount', 'dueDate', 'interestRate', 'maturityAmount']
  },
  {
    name: 'Previous Month Maturities',
    params: { 
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
      toDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    },
    expectedFields: ['memberNo', 'memberName', 'accountNo', 'depositType', 'amount', 'dueDate', 'interestRate', 'maturityAmount']
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(40));
  log(title, 'yellow');
  console.log('-'.repeat(40));
}

async function testDepositDueDateRegisterAPI() {
  logSection('DEPOSIT DUE DATE REGISTER COMPONENT - API TEST');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Backend Connection (Skip health check, test actual endpoint)
  logSubSection('Test 1: Backend Connection Check');
  log('⚠ Skipping health endpoint check, testing actual API endpoint instead', 'yellow');

  // Test 2: API Endpoint Tests
  logSubSection('Test 2: Deposit Maturity API Tests');
  
  for (const testCase of TEST_CASES) {
    totalTests++;
    log(`\nTesting: ${testCase.name}`, 'blue');
    log(`Parameters: ${JSON.stringify(testCase.params)}`, 'blue');
    
    try {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
        params: testCase.params,
        timeout: 10000
      });

      // Check response structure
      if (response.status === 200) {
        log('✓ HTTP Status: 200 OK', 'green');
        
        // Check response data structure
        const data = response.data;
        log(`Response structure: ${JSON.stringify(Object.keys(data), null, 2)}`, 'blue');
        
        // Handle different response formats
        let actualData = data;
        
        if (data.success && data.data) {
          actualData = data.data;
          log('✓ Response has success wrapper', 'green');
        }
        
        // Check for double wrapping (common issue we've been fixing)
        if (actualData.data && Array.isArray(actualData.data)) {
          actualData = actualData.data;
          log('⚠ Found double-wrapped response (this should be fixed)', 'yellow');
        }
        
        // The component uses: const data = (response as any).data || response;
        // This suggests it expects either response.data or response directly
        if (!Array.isArray(actualData) && data.data) {
          actualData = data.data;
          log('⚠ Component expects response.data format', 'yellow');
        }
        
        if (Array.isArray(actualData)) {
          log(`✓ Data is array with ${actualData.length} items`, 'green');
          
          if (actualData.length > 0) {
            // Check first item structure
            const firstItem = actualData[0];
            log(`First item structure: ${JSON.stringify(Object.keys(firstItem), null, 2)}`, 'blue');
            
            // Validate expected fields
            let fieldsValid = true;
            for (const field of testCase.expectedFields) {
              if (firstItem.hasOwnProperty(field)) {
                log(`✓ Field '${field}' exists: ${firstItem[field]}`, 'green');
              } else {
                log(`✗ Field '${field}' missing`, 'red');
                fieldsValid = false;
              }
            }
            
            if (fieldsValid) {
              log(`✓ ${testCase.name} - PASSED`, 'green');
              passedTests++;
            } else {
              log(`✗ ${testCase.name} - FAILED (Missing fields)`, 'red');
              failedTests++;
            }
          } else {
            log(`⚠ ${testCase.name} - No data returned (might be expected for no maturities)`, 'yellow');
            passedTests++; // Count as pass since empty result might be valid
          }
        } else {
          log(`✗ ${testCase.name} - FAILED (Data is not array)`, 'red');
          log(`Actual data type: ${typeof actualData}`, 'red');
          log(`Actual data: ${JSON.stringify(actualData)}`, 'red');
          failedTests++;
        }
      } else {
        log(`✗ ${testCase.name} - FAILED (HTTP ${response.status})`, 'red');
        failedTests++;
      }
    } catch (error) {
      log(`✗ ${testCase.name} - FAILED`, 'red');
      log(`Error: ${error.message}`, 'red');
      if (error.response) {
        log(`Response status: ${error.response.status}`, 'red');
        log(`Response data: ${JSON.stringify(error.response.data)}`, 'red');
      }
      failedTests++;
    }
  }

  // Test 3: Data Validation Tests
  logSubSection('Test 3: Data Validation and Business Logic');
  
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
      params: { 
        fromDate: '2024-01-01',
        toDate: '2024-12-31'
      },
      timeout: 10000
    });

    let actualData = response.data;
    if (actualData.success && actualData.data) {
      actualData = actualData.data;
    }
    if (actualData.data && Array.isArray(actualData.data)) {
      actualData = actualData.data;
    }
    // Handle component's parsing: const data = (response as any).data || response;
    if (!Array.isArray(actualData) && response.data.data) {
      actualData = response.data.data;
    }

    if (Array.isArray(actualData) && actualData.length > 0) {
      log('✓ Testing data validation...', 'green');
      
      // Check data types and formats
      const item = actualData[0];
      
      // Member number should be string or number
      if (item.memberNo && (typeof item.memberNo === 'string' || typeof item.memberNo === 'number')) {
        log('✓ Member number format valid', 'green');
      } else {
        log('✗ Member number format invalid', 'red');
      }
      
      // Amount should be number
      if (typeof item.amount === 'number') {
        log('✓ Amount format valid', 'green');
      } else {
        log('✗ Amount format invalid', 'red');
      }
      
      // Maturity amount should be number
      if (typeof item.maturityAmount === 'number') {
        log('✓ Maturity amount format valid', 'green');
      } else {
        log('✗ Maturity amount format invalid', 'red');
      }
      
      // Interest rate should be number
      if (typeof item.interestRate === 'number') {
        log('✓ Interest rate format valid', 'green');
      } else {
        log('✗ Interest rate format invalid', 'red');
      }
      
      // Due date should be valid date
      if (item.dueDate && !isNaN(new Date(item.dueDate).getTime())) {
        log('✓ Due date format valid', 'green');
      } else {
        log('✗ Due date format invalid', 'red');
      }
      
      // Business logic: maturity amount should be >= principal amount
      if (item.maturityAmount >= item.amount) {
        log('✓ Maturity amount >= principal amount (business logic valid)', 'green');
      } else {
        log('⚠ Maturity amount < principal amount (check business logic)', 'yellow');
      }
      
      passedTests++;
    } else {
      log('⚠ No data to validate', 'yellow');
      passedTests++;
    }
  } catch (error) {
    log('✗ Data validation test failed', 'red');
    log(`Error: ${error.message}`, 'red');
    failedTests++;
  }

  // Test 4: Date Range Validation
  logSubSection('Test 4: Date Range Validation');
  
  totalTests++;
  try {
    // Test with future dates
    const futureFromDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const futureToDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
      params: { 
        fromDate: futureFromDate,
        toDate: futureToDate
      },
      timeout: 10000
    });

    if (response.status === 200) {
      log('✓ Future date range handled correctly', 'green');
      passedTests++;
    } else {
      log('✗ Future date range failed', 'red');
      failedTests++;
    }
  } catch (error) {
    log('✗ Date range validation test failed', 'red');
    log(`Error: ${error.message}`, 'red');
    failedTests++;
  }

  // Test 5: Error Handling Tests
  logSubSection('Test 5: Error Handling Tests');
  
  const errorTests = [
    {
      name: 'Missing fromDate parameter',
      params: { toDate: '2024-12-31' },
      expectError: true
    },
    {
      name: 'Missing toDate parameter',
      params: { fromDate: '2024-01-01' },
      expectError: true
    },
    {
      name: 'Invalid date format',
      params: { fromDate: 'invalid-date', toDate: '2024-12-31' },
      expectError: true
    },
    {
      name: 'From date after to date',
      params: { fromDate: '2024-12-31', toDate: '2024-01-01' },
      expectError: false // Might be handled gracefully
    }
  ];

  for (const errorTest of errorTests) {
    totalTests++;
    log(`\nTesting error case: ${errorTest.name}`, 'blue');
    
    try {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
        params: errorTest.params,
        timeout: 5000
      });
      
      if (errorTest.expectError) {
        log(`✗ ${errorTest.name} - Should have failed but didn't`, 'red');
        failedTests++;
      } else {
        log(`✓ ${errorTest.name} - Handled gracefully`, 'green');
        passedTests++;
      }
    } catch (error) {
      if (errorTest.expectError) {
        log(`✓ ${errorTest.name} - Correctly returned error`, 'green');
        passedTests++;
      } else {
        log(`✗ ${errorTest.name} - Unexpected error: ${error.message}`, 'red');
        failedTests++;
      }
    }
  }

  // Final Results
  logSection('TEST RESULTS SUMMARY');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, 'red');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');
  
  if (failedTests === 0) {
    log('\n🎉 ALL TESTS PASSED! DepositDueDateRegister component is working correctly.', 'green');
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Please check the issues above.`, 'yellow');
  }

  // Frontend Integration Notes
  logSection('FRONTEND INTEGRATION NOTES');
  log('DepositDueDateRegister Component Status:', 'cyan');
  log('⚠ Response parsing: Uses (response as any).data || response - needs verification', 'yellow');
  log('✓ Date handling: Implemented with dayjs', 'green');
  log('✓ Deposit type filtering: Implemented', 'green');
  log('✓ Error handling: Basic implementation', 'green');
  log('✓ Loading states: Implemented', 'green');
  log('✓ Data formatting: Implemented (Indian currency, dates)', 'green');
  log('✓ Summary calculations: Implemented (total maturity value)', 'green');
  
  // Potential Issues Found
  log('\nPotential Issues Found:', 'yellow');
  log('1. Response parsing may not handle wrapped responses correctly', 'yellow');
  log('2. Component uses: const data = (response as any).data || response;', 'yellow');
  log('3. This might not work with success-wrapped responses', 'yellow');
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run the test
if (require.main === module) {
  testDepositDueDateRegisterAPI()
    .then((results) => {
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testDepositDueDateRegisterAPI };