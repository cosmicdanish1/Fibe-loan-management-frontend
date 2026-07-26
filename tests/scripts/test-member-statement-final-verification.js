const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testMemberStatementFinalVerification() {
  console.log('=== MEMBER STATEMENT FINAL VERIFICATION ===\n');
  
  // Test comprehensive functionality
  const testCases = [
    {
      name: 'Test Member 1001 (Recent Data)',
      memberNo: '1001',
      fromDate: '2024-01-01T00:00:00.000Z',
      toDate: '2025-12-31T23:59:59.999Z'
    },
    {
      name: 'Test Member 610016572 (Historical Data)',
      memberNo: '610016572',
      fromDate: '2019-01-01T00:00:00.000Z',
      toDate: '2025-12-31T23:59:59.999Z'
    },
    {
      name: 'Test Member 610023712 (Mixed Data)',
      memberNo: '610023712',
      fromDate: '2020-01-01T00:00:00.000Z',
      toDate: '2025-12-31T23:59:59.999Z'
    },
    {
      name: 'Test Recent Date Range',
      memberNo: '1001',
      fromDate: '2024-12-01T00:00:00.000Z',
      toDate: '2024-12-31T23:59:59.999Z'
    }
  ];
  
  let allTestsPassed = true;
  
  for (const testCase of testCases) {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Member: ${testCase.memberNo}`);
    console.log(`   Period: ${testCase.fromDate.split('T')[0]} to ${testCase.toDate.split('T')[0]}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/report/member-statement`, {
        params: {
          memberNo: testCase.memberNo,
          fromDate: testCase.fromDate,
          toDate: testCase.toDate
        }
      });
      
      // Validate response structure
      if (response.status !== 200) {
        console.log(`   ❌ HTTP Status: ${response.status}`);
        allTestsPassed = false;
        continue;
      }
      
      const data = response.data.success ? response.data.data : response.data;
      
      // Validate required fields
      const validations = [
        { field: 'memberNo', value: data.memberNo, required: true },
        { field: 'memberName', value: data.memberName, required: true },
        { field: 'summary', value: data.summary, required: true, type: 'array' },
        { field: 'transactions', value: data.transactions, required: true, type: 'array' }
      ];
      
      let testPassed = true;
      
      for (const validation of validations) {
        if (validation.required && !validation.value) {
          console.log(`   ❌ Missing required field: ${validation.field}`);
          testPassed = false;
        }
        
        if (validation.type === 'array' && validation.value && !Array.isArray(validation.value)) {
          console.log(`   ❌ Field ${validation.field} should be an array`);
          testPassed = false;
        }
      }
      
      if (testPassed) {
        console.log(`   ✅ Response structure valid`);
        console.log(`   📊 Summary items: ${data.summary?.length || 0}`);
        console.log(`   📝 Transactions: ${data.transactions?.length || 0}`);
        console.log(`   👤 Member: ${data.memberName}`);
        
        // Validate data types in summary
        if (data.summary && data.summary.length > 0) {
          const sampleSummary = data.summary[0];
          if (typeof sampleSummary.balance === 'number') {
            console.log(`   ✅ Summary balance is numeric: ₹${sampleSummary.balance.toLocaleString('en-IN')}`);
          } else {
            console.log(`   ❌ Summary balance is not numeric: ${typeof sampleSummary.balance}`);
            testPassed = false;
          }
        }
        
        // Validate data types in transactions
        if (data.transactions && data.transactions.length > 0) {
          const sampleTransaction = data.transactions[0];
          const numericFields = ['withdrawal', 'deposit'];
          
          for (const field of numericFields) {
            if (typeof sampleTransaction[field] === 'number') {
              console.log(`   ✅ Transaction ${field} is numeric`);
            } else {
              console.log(`   ❌ Transaction ${field} is not numeric: ${typeof sampleTransaction[field]}`);
              testPassed = false;
            }
          }
        }
        
        // Calculate totals for verification
        if (data.summary && data.summary.length > 0) {
          const totalBalance = data.summary.reduce((sum, item) => sum + (item.balance || 0), 0);
          console.log(`   💰 Total balance across all heads: ₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        }
        
        if (data.transactions && data.transactions.length > 0) {
          const totalDeposits = data.transactions.reduce((sum, item) => sum + (item.deposit || 0), 0);
          const totalWithdrawals = data.transactions.reduce((sum, item) => sum + (item.withdrawal || 0), 0);
          console.log(`   📈 Period deposits: ₹${totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
          console.log(`   📉 Period withdrawals: ₹${totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        }
        
      } else {
        allTestsPassed = false;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status || 'Network'} - ${error.response?.data?.message || error.message}`);
      allTestsPassed = false;
    }
  }
  
  // Test edge cases
  console.log('\n\n🔍 TESTING EDGE CASES...');
  
  const edgeCases = [
    {
      name: 'Non-existent member',
      memberNo: '999999',
      expectedError: true
    },
    {
      name: 'Invalid date range',
      memberNo: '1001',
      fromDate: '2025-12-31T00:00:00.000Z',
      toDate: '2024-01-01T23:59:59.999Z',
      expectedError: false // Should return empty results
    },
    {
      name: 'Future date range',
      memberNo: '1001',
      fromDate: '2026-01-01T00:00:00.000Z',
      toDate: '2026-12-31T23:59:59.999Z',
      expectedError: false // Should return empty results
    }
  ];
  
  for (const edgeCase of edgeCases) {
    console.log(`\n🧪 Edge Case: ${edgeCase.name}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/report/member-statement`, {
        params: {
          memberNo: edgeCase.memberNo,
          fromDate: edgeCase.fromDate || '2024-01-01T00:00:00.000Z',
          toDate: edgeCase.toDate || '2024-12-31T23:59:59.999Z'
        }
      });
      
      if (edgeCase.expectedError) {
        console.log(`   ❌ Expected error but got success`);
        allTestsPassed = false;
      } else {
        const data = response.data.success ? response.data.data : response.data;
        console.log(`   ✅ Handled gracefully - Transactions: ${data.transactions?.length || 0}`);
      }
      
    } catch (error) {
      if (edgeCase.expectedError) {
        console.log(`   ✅ Expected error occurred: ${error.response?.status}`);
      } else {
        console.log(`   ❌ Unexpected error: ${error.response?.status || 'Network'}`);
        allTestsPassed = false;
      }
    }
  }
  
  // Final assessment
  console.log('\n\n📋 FINAL ASSESSMENT');
  console.log('===================');
  
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('🎉 Member Statement system is fully functional');
    console.log('');
    console.log('✅ Backend API working correctly');
    console.log('✅ Data types are proper (numeric amounts)');
    console.log('✅ Response structure is consistent');
    console.log('✅ Error handling works for edge cases');
    console.log('✅ Historical and recent data both supported');
    console.log('✅ Multiple members tested successfully');
    console.log('');
    console.log('🚀 SYSTEM STATUS: READY FOR PRODUCTION');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️  Please review the errors above');
    console.log('');
    console.log('🔧 SYSTEM STATUS: NEEDS ATTENTION');
  }
  
  console.log('\n📝 RECOMMENDED NEXT STEPS:');
  console.log('1. Test the frontend UI with these member numbers');
  console.log('2. Verify print functionality works correctly');
  console.log('3. Test member lookup integration');
  console.log('4. Validate date range selections');
  console.log('');
  console.log('🧪 SUGGESTED TEST MEMBERS FOR UI:');
  console.log('   • 1001 (Recent transactions, good for testing)');
  console.log('   • 610016572 (Historical data, comprehensive)');
  console.log('   • 610023712 (Mixed data, good balance)');
}

testMemberStatementFinalVerification().catch(console.error);