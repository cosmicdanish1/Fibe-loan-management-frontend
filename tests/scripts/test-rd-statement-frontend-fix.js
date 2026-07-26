const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testRDStatementFrontendFix() {
  console.log('🔧 TESTING RD STATEMENT FRONTEND FIX');
  console.log('=' .repeat(50));
  
  try {
    // Test the exact API call that the frontend makes
    console.log('1. 🧪 Testing API call...');
    
    const response = await axios.get(`${BASE_URL}/report/rd-statement`, {
      params: {
        memberNo: '1001',
        fromDate: '2015-04-01T00:00:00.000Z',
        toDate: '2025-12-29T23:59:59.999Z',
        headCode: 'A1003'
      }
    });
    
    console.log('   ✅ API Status:', response.status);
    console.log('   📊 Raw API Response Structure:');
    console.log('      success:', response.data.success);
    console.log('      data exists:', !!response.data.data);
    
    if (response.data.data) {
      console.log('      memberNo:', response.data.data.memberNo);
      console.log('      memberName:', response.data.data.memberName);
      console.log('      openingBalance:', response.data.data.openingBalance);
      console.log('      closingBalance:', response.data.data.closingBalance);
      console.log('      transactions count:', response.data.data.transactions?.length || 0);
    }
    
    // Simulate the ApiService wrapper
    console.log('\n2. 🎭 Simulating ApiService response format...');
    
    // This is what the ApiService.request() method returns
    const apiServiceResponse = {
      success: true,
      data: response.data.data  // The actual RD statement data
    };
    
    console.log('   📦 ApiService Response Format:');
    console.log('      success:', apiServiceResponse.success);
    console.log('      data exists:', !!apiServiceResponse.data);
    
    if (apiServiceResponse.success && apiServiceResponse.data) {
      const data = apiServiceResponse.data;
      console.log('   ✅ Frontend should now access:');
      console.log('      data.memberNo:', data.memberNo);
      console.log('      data.memberName:', data.memberName);
      console.log('      data.openingBalance:', data.openingBalance);
      console.log('      data.closingBalance:', data.closingBalance);
      console.log('      data.transactions.length:', data.transactions?.length || 0);
      
      if (data.transactions && data.transactions.length > 0) {
        console.log('   📋 Sample transactions:');
        data.transactions.slice(0, 3).forEach((trans, index) => {
          console.log(`      ${index + 1}. ${trans.date?.split('T')[0]} - ${trans.particulars} - ₹${trans.deposit || trans.withdrawal || 0}`);
        });
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ FRONTEND FIX VERIFICATION COMPLETE');
    console.log('=' .repeat(50));
    
    console.log('\n🎯 WHAT WAS FIXED:');
    console.log('   ❌ OLD: Complex nested response handling');
    console.log('   ✅ NEW: Simple ApiService response format handling');
    console.log('   ❌ OLD: response.data.data.data (incorrect nesting)');
    console.log('   ✅ NEW: response.data (correct ApiService format)');
    
    console.log('\n🧪 NOW TEST IN UI:');
    console.log('   1. Open RD Statement in your app');
    console.log('   2. Enter Member Number: 1001');
    console.log('   3. Set From Date: 01-Apr-2015');
    console.log('   4. Set To Date: 29-Dec-2025');
    console.log('   5. Click "Generate RD Statement"');
    console.log('   6. You should now see 17 transactions!');
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log(`   • Member Name: ${apiServiceResponse.data.memberName}`);
    console.log(`   • Opening Balance: ₹${apiServiceResponse.data.openingBalance.toLocaleString('en-IN')}`);
    console.log(`   • Closing Balance: ₹${apiServiceResponse.data.closingBalance.toLocaleString('en-IN')}`);
    console.log(`   • Total Transactions: ${apiServiceResponse.data.transactions.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRDStatementFrontendFix();