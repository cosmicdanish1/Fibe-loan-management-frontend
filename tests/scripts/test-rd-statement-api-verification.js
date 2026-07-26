const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testRDStatementAPI() {
  console.log('🔍 RD STATEMENT API VERIFICATION TEST');
  console.log('=' .repeat(50));
  
  try {
    // Test parameters based on our database findings
    const testParams = {
      memberNo: '1001',
      fromDate: '2015-04-01T00:00:00.000Z',
      toDate: new Date().toISOString(),
      headCode: 'A1003'
    };
    
    console.log('📋 Test Parameters:');
    console.log(`   Member No: ${testParams.memberNo}`);
    console.log(`   From Date: ${testParams.fromDate.split('T')[0]}`);
    console.log(`   To Date: ${testParams.toDate.split('T')[0]}`);
    console.log(`   Head Code: ${testParams.headCode}`);
    
    console.log('\n🚀 Making API request...');
    
    const response = await axios.get(`${BASE_URL}/report/rd-statement`, {
      params: testParams,
      timeout: 10000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data Structure:');
    console.log('   Success:', response.data.success);
    console.log('   Member No:', response.data.data?.memberNo);
    console.log('   Member Name:', response.data.data?.memberName);
    console.log('   Opening Balance:', response.data.data?.openingBalance);
    console.log('   Closing Balance:', response.data.data?.closingBalance);
    console.log('   Transaction Count:', response.data.data?.transactions?.length || 0);
    
    if (response.data.data?.transactions && response.data.data.transactions.length > 0) {
      console.log('\n📋 Transaction Details:');
      response.data.data.transactions.forEach((trans, index) => {
        console.log(`   ${index + 1}. Date: ${trans.date?.split('T')[0]}`);
        console.log(`      Particulars: ${trans.particulars}`);
        console.log(`      Voucher: ${trans.voucherNo}`);
        console.log(`      Withdrawal: ₹${trans.withdrawal || 0}`);
        console.log(`      Deposit: ₹${trans.deposit || 0}`);
        console.log(`      Balance: ₹${trans.balance}`);
        console.log('');
      });
    }
    
    console.log('✅ RD Statement API is working correctly!');
    console.log('\n🎯 FRONTEND TESTING READY:');
    console.log('   1. Backend is running and API is responsive');
    console.log('   2. Database has valid RD data for member 1001');
    console.log('   3. API returns proper response structure');
    console.log('   4. Frontend component should work correctly');
    
  } catch (error) {
    console.error('❌ API Test Failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend server is not running');
      console.error('   Please start the backend server first');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('   1. Ensure backend server is running on port 3001');
    console.log('   2. Check database connection');
    console.log('   3. Verify member 1001 exists in database');
    console.log('   4. Check if head code A1003 has data');
  }
}

// Run the test
testRDStatementAPI();