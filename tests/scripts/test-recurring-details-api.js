const axios = require('axios');

async function testRecurringDetailsAPI() {
  console.log('🧪 Testing Recurring Details API...\n');
  
  try {
    // Test with a known member that has RD accounts
    const memberNo = '610022391';
    console.log(`🧪 Testing API with member: ${memberNo}`);
    
    const response = await axios.get('http://localhost:3001/api/v1/report/recurring-details', {
      params: {
        memberNo: memberNo,
        outputType: 'screen'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.success) {
      console.log('✅ API Test Successful!');
      const data = response.data.data;
      if (Array.isArray(data) && data.length > 0) {
        console.log('📋 API Response Data:');
        data.forEach((rd, index) => {
          console.log(`   ${index + 1}. Account: ${rd.accountNo}`);
          console.log(`      Member: ${rd.memberName} (${rd.memberNo})`);
          console.log(`      Certificate: ${rd.certificateNo}`);
          console.log(`      Monthly Amount: ₹${rd.monthlyAmount?.toLocaleString('en-IN')}`);
          console.log(`      Interest Rate: ${rd.interestRate}%`);
          console.log(`      Tenure: ${rd.tenure} months`);
          console.log(`      Open Date: ${rd.openDate}`);
          console.log(`      Maturity Date: ${rd.maturityDate}`);
          console.log(`      Maturity Amount: ₹${rd.maturityAmount?.toLocaleString('en-IN')}`);
          console.log(`      Status: ${rd.status}`);
          console.log(`      Nominee: ${rd.nominee}`);
          console.log(`      Installments Paid: ${rd.installmentsPaid}`);
          console.log('');
        });
        
        console.log('🎯 FRONTEND TESTING INSTRUCTIONS:');
        console.log('1. Navigate to: Reports → Account Reports → Recurring Details');
        console.log(`2. Enter Member Number: ${memberNo}`);
        console.log('3. Click "GENERATE" button');
        console.log('4. Verify RD account details display in table');
        console.log('5. Click "Print Report" button to test printing');
        console.log('6. Verify print shows portrait orientation');
        
      } else {
        console.log('⚠️ API returned empty data array');
        console.log('Response data:', data);
      }
    } else {
      console.log('❌ API returned unsuccessful response');
      console.log('Response:', response.data);
    }
  } catch (apiError) {
    if (apiError.code === 'ECONNREFUSED') {
      console.log('❌ Backend server not running. Start with: npm run start:dev');
    } else {
      console.log('❌ API Test Failed:', apiError.message);
      if (apiError.response && apiError.response.data) {
        console.log('   Error details:', apiError.response.data);
      }
    }
  }
}

testRecurringDetailsAPI();