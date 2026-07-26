// Comprehensive Test Script for All Report Components
// Tests data loading from database to UI for each report component
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
      timeout: 15000
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

// Test configuration for each report component
const reportTests = [
  // Daily Reports
  {
    name: 'CashBook Report',
    category: 'Daily',
    endpoint: '/api/v1/cashbook/report',
    params: { date: '2024-12-24' },
    expectedFields: ['date', 'totalReceipts', 'totalPayments', 'entries'],
    description: 'Daily cash transactions and balances'
  },
  {
    name: 'DayBook Report',
    category: 'Daily', 
    endpoint: '/api/v1/daybook/report',
    params: { date: '2024-12-24' },
    expectedFields: ['date', 'totalReceipts', 'totalPayments', 'entries'],
    description: 'Daily transaction summary'
  },

  // Account Reports
  {
    name: 'Account Balance Report',
    category: 'Account Reports',
    endpoint: '/api/v1/report/member-balance-range',
    params: { fromAccountNo: '610031566', toAccountNo: '610031570' },
    expectedFields: ['memberNo', 'memberName', 'currentBalance'],
    description: 'Member account balance range report'
  },
  {
    name: 'Account Closing Register',
    category: 'Account Reports',
    endpoint: '/api/v1/report/account-closing',
    params: { month: 12, year: 2024, accountType: 'FD' },
    expectedFields: ['data', 'summary'],
    description: 'Closed accounts register'
  },
  {
    name: 'Fixed Deposit Certificate',
    category: 'Account Reports',
    endpoint: '/api/v1/report/fd-certificate',
    params: { memberNo: '610031566' },
    expectedFields: ['memberNo', 'memberName', 'accountNo'],
    description: 'FD certificate generation'
  },

  // Member Reports
  {
    name: 'Member Lookup',
    category: 'Member Reports',
    endpoint: '/api/v1/members/lookup',
    params: { limit: 10 },
    expectedFields: ['memberNo', 'memberName', 'officeNo'],
    description: 'Member lookup for reports'
  },
  {
    name: 'Member Balance',
    category: 'Member Reports', 
    endpoint: '/api/v1/members/balance/610031566',
    params: {},
    expectedFields: ['memberInfo', 'loans'],
    description: 'Individual member balance'
  },
  {
    name: 'Member Detail Ledger',
    category: 'Member Reports',
    endpoint: '/api/v1/report/member-detail-ledger',
    params: { memberNumber: '610031566', fromDate: '2024-01-01', toDate: '2024-12-31' },
    expectedFields: ['entries', 'totalDebits', 'totalCredits'],
    description: 'Detailed member ledger'
  },
  {
    name: 'Member Ledger Report',
    category: 'Member Reports',
    endpoint: '/api/v1/report/member-ledger',
    params: { headCode: 'CASH1', memberNumber: '610031566', fromDate: '2024-01-01', toDate: '2024-12-31' },
    expectedFields: ['memberNumber', 'memberName', 'entries'],
    description: 'Member ledger by head code'
  },

  // General Reports
  {
    name: 'General Ledger',
    category: 'General Reports',
    endpoint: '/api/v1/report/general-ledger',
    params: { headCode: 'CASH1', fromDate: '2024-01-01', toDate: '2024-12-31' },
    expectedFields: ['headCode', 'headName', 'entries'],
    description: 'General ledger by head code'
  },
  {
    name: 'PassBook Printing',
    category: 'General Reports',
    endpoint: '/api/v1/report/passbook',
    params: { memberNo: '610031566', fromDate: '2024-01-01', toDate: '2024-12-31' },
    expectedFields: ['memberDetails', 'accounts'],
    description: 'Member passbook data'
  },

  // Statement Reports
  {
    name: 'FD Statement',
    category: 'Member Statement',
    endpoint: '/api/v1/report/fd-statement',
    params: { memberNo: '610031566', fromDate: '2024-01-01T00:00:00.000Z', toDate: '2024-12-31T23:59:59.999Z', headCode: 'FD' },
    expectedFields: ['memberName', 'transactions'],
    description: 'Fixed deposit statement'
  },

  // Monthly Reports
  {
    name: 'Receipt Payment Voucher',
    category: 'Monthly',
    endpoint: '/api/v1/report/receipt-payment-voucher',
    params: { month: 12, year: 2024 },
    expectedFields: ['receipts', 'payments'],
    description: 'Monthly receipt and payment vouchers'
  },

  // Yearly Reports
  {
    name: 'Dividend Report',
    category: 'Yearly',
    endpoint: '/api/v1/report/dividend',
    params: { year: 2024 },
    expectedFields: ['members', 'totalDividend'],
    description: 'Annual dividend report'
  },
  {
    name: 'Member Loan Detail',
    category: 'Yearly',
    endpoint: '/api/v1/report/member-loan-detail',
    params: { memberNo: '610031566', year: 2024 },
    expectedFields: ['memberNo', 'loans'],
    description: 'Member loan details'
  },
  {
    name: 'Yearly Member Statement',
    category: 'Yearly',
    endpoint: '/api/v1/report/yearly-member-statement',
    params: { memberNo: '610031566', year: 2024 },
    expectedFields: ['memberInfo', 'yearlyTransactions'],
    description: 'Annual member statement'
  }
];

async function analyzeResponse(response, test) {
  const analysis = {
    statusOk: response.statusCode === 200,
    hasData: false,
    wrapLevel: 0,
    dataType: 'unknown',
    hasExpectedFields: false,
    actualFields: [],
    dataCount: 0,
    issues: []
  };

  if (!analysis.statusOk) {
    analysis.issues.push(`HTTP ${response.statusCode}`);
    return analysis;
  }

  let data = response.data;
  let currentLevel = 0;

  // Analyze wrapping levels
  while (data && typeof data === 'object' && data.success !== undefined) {
    currentLevel++;
    if (data.data !== undefined) {
      data = data.data;
    } else {
      break;
    }
  }

  analysis.wrapLevel = currentLevel;

  // Determine data type and structure
  if (Array.isArray(data)) {
    analysis.dataType = 'array';
    analysis.dataCount = data.length;
    analysis.hasData = data.length > 0;
    
    if (data.length > 0) {
      analysis.actualFields = Object.keys(data[0]);
      analysis.hasExpectedFields = test.expectedFields.some(field => 
        analysis.actualFields.includes(field)
      );
    }
  } else if (data && typeof data === 'object') {
    analysis.dataType = 'object';
    analysis.hasData = Object.keys(data).length > 0;
    analysis.actualFields = Object.keys(data);
    analysis.hasExpectedFields = test.expectedFields.some(field => 
      analysis.actualFields.includes(field)
    );
  } else {
    analysis.dataType = typeof data;
    analysis.hasData = data !== null && data !== undefined;
  }

  // Check for common issues
  if (analysis.wrapLevel > 2) {
    analysis.issues.push('Excessive wrapping (>2 levels)');
  }
  
  if (analysis.hasData && !analysis.hasExpectedFields) {
    analysis.issues.push('Missing expected fields');
  }

  if (analysis.dataType === 'array' && analysis.dataCount === 0) {
    analysis.issues.push('Empty array (might be no data or query issue)');
  }

  return analysis;
}

async function testAllReportComponents() {
  console.log('🎯 COMPREHENSIVE REPORT COMPONENTS TEST');
  console.log('=====================================');
  console.log(`Testing ${reportTests.length} report components for data loading issues...\n`);

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    byCategory: {}
  };

  for (const test of reportTests) {
    console.log(`🔍 Testing: ${test.name} (${test.category})`);
    console.log(`   Description: ${test.description}`);
    
    try {
      // Build URL with parameters
      const url = new URL(`http://localhost:3000${test.endpoint}`);
      Object.entries(test.params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
      
      console.log(`   Endpoint: ${url.pathname}${url.search}`);
      
      const response = await makeRequest(url.pathname + url.search);
      const analysis = await analyzeResponse(response, test);
      
      // Determine test result
      let status = '✅ PASS';
      let category = 'passed';
      
      if (!analysis.statusOk) {
        status = '❌ FAIL';
        category = 'failed';
      } else if (analysis.issues.length > 0) {
        status = '⚠️ WARN';
        category = 'warnings';
      }
      
      results[category]++;
      
      // Track by category
      if (!results.byCategory[test.category]) {
        results.byCategory[test.category] = { passed: 0, failed: 0, warnings: 0 };
      }
      results.byCategory[test.category][category]++;
      
      console.log(`   Status: ${status}`);
      console.log(`   HTTP: ${response.statusCode}`);
      console.log(`   Data Type: ${analysis.dataType}`);
      console.log(`   Wrap Level: ${analysis.wrapLevel}`);
      console.log(`   Has Data: ${analysis.hasData}`);
      console.log(`   Expected Fields: ${analysis.hasExpectedFields}`);
      
      if (analysis.dataType === 'array') {
        console.log(`   Records: ${analysis.dataCount}`);
      }
      
      if (analysis.actualFields.length > 0) {
        console.log(`   Fields: ${analysis.actualFields.slice(0, 5).join(', ')}${analysis.actualFields.length > 5 ? '...' : ''}`);
      }
      
      if (analysis.issues.length > 0) {
        console.log(`   Issues: ${analysis.issues.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.failed++;
      
      if (!results.byCategory[test.category]) {
        results.byCategory[test.category] = { passed: 0, failed: 0, warnings: 0 };
      }
      results.byCategory[test.category].failed++;
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary Report
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('============================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.warnings + results.failed}`);
  console.log('');

  // Category Breakdown
  console.log('📋 RESULTS BY CATEGORY:');
  Object.entries(results.byCategory).forEach(([category, stats]) => {
    const total = stats.passed + stats.warnings + stats.failed;
    console.log(`   ${category}: ${stats.passed}✅ ${stats.warnings}⚠️ ${stats.failed}❌ (${total} total)`);
  });
  console.log('');

  // Recommendations
  if (results.failed > 0) {
    console.log('🔧 RECOMMENDATIONS:');
    console.log('   1. Check failed endpoints - may need backend implementation');
    console.log('   2. Verify database has sample data for testing');
    console.log('   3. Check API response format consistency');
    console.log('');
  }

  if (results.warnings > 0) {
    console.log('⚠️ WARNINGS TO ADDRESS:');
    console.log('   1. Fix response wrapping issues (>2 levels)');
    console.log('   2. Ensure expected fields are present in responses');
    console.log('   3. Check for empty data issues');
    console.log('');
  }

  if (results.passed === reportTests.length) {
    console.log('🎉 ALL REPORT COMPONENTS WORKING PERFECTLY!');
    console.log('📋 All APIs return data in expected formats.');
    console.log('🔧 Frontend components should handle responses correctly.');
  } else {
    console.log('📋 NEXT STEPS:');
    console.log('   1. Fix failed components using the same patterns as successful ones');
    console.log('   2. Apply response unwrapping fixes where needed');
    console.log('   3. Ensure consistent API response formats');
  }
}

// Run the comprehensive test
testAllReportComponents().catch(console.error);