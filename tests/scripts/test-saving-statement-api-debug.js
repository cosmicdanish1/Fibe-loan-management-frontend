const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testSavingStatementAPI() {
  console.log('🔍 SAVING STATEMENT API DEBUG TEST');
  console.log('=' .repeat(50));
  
  try {
    const testMember = '610026281';
    const fromDate = '2015-04-01T00:00:00.000Z';
    const toDate = '2025-12-29T23:59:59.999Z';
    const headCode = 'L1004';
    
    console.log('📋 Test Parameters:');
    console.log(`   Member: ${testMember}`);
    console.log(`   From: ${fromDate}`);
    console.log(`   To: ${toDate}`);
    console.log(`   Head Code: ${headCode}`);
    
    const response = await axios.get(`${BASE_URL}/report/saving-statement`, {
      params: {
        memberNo: testMember,
        fromDate: fromDate,
        toDate: toDate,
        headCode: headCode
      }
    });
    
    console.log('\n✅ API Response Status:', response.status);
    console.log('📊 Full Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Test the exact structure the frontend expects
    const data = response.data;
    console.log('\n🔍 Data Analysis:');
    console.log('   success:', data.success);
    console.log('   statusCode:', data.statusCode);
    console.log('   message:', data.message);
    
    if (data.data) {
      console.log('   data.memberNo:', data.data.memberNo);
      console.log('   data.memberName:', data.data.memberName);
      console.log('   data.openingBalance:', data.data.openingBalance);
      console.log('   data.closingBalance:', data.data.closingBalance);
      console.log('   data.transactions length:', data.data.transactions?.length || 0);
      
      if (data.data.transactions && data.data.transactions.length > 0) {
        console.log('\n📋 First 3 transactions:');
        data.data.transactions.slice(0, 3).forEach((trans, index) => {
          console.log(`   ${index + 1}. Date: ${trans.date}, Withdrawal: ${trans.withdrawal}, Deposit: ${trans.deposit}, Balance: ${trans.balance}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

testSavingStatementAPI();